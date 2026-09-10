import { normalizePhoneme, normalizeWord, tokenize, type Token } from "@/lib/phonemes";
import type { Assessment, AzPhoneme, AzSegment, AzWord, PhonemeResult, WordResult } from "./types";

const TICKS_PER_MS = 10_000;

// Azure's per-sound accuracy is noisy: it gives 80 to a /θ/ that was clearly said as
// /t/, and 30 to a native speaker's unreleased final /t/. Its ranked guesses of which
// sound it actually heard (NBestPhonemes) are much more reliable, so we score from those.
// Thresholds were calibrated on neural-voice speech with deliberate errors
// (th→t/d, dropped final consonants, wrong vowels, wrong words).
/** How far ahead another sound must be before we call it a substitution. */
const SUBSTITUTION_MARGIN = 10;
/** A sound said as a different sound scores at most this. */
const SUBSTITUTED_MAX = 45;
/** A sound recognized as the right one scores at least this ("almost", not "wrong"). */
const RECOGNIZED_MIN = 70;
/** A word scores at most its worst sound plus this. */
const WORST_SOUND_SLACK = 10;
/** Share of the overall score that comes from sound accuracy. */
const ACCURACY_WEIGHT = 0.7;

export class NoSpeechError extends Error {
  constructor() {
    super("We couldn't hear any speech. Check your microphone and try again.");
  }
}

function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function weightedMean(pairs: [value: number, weight: number][]): number {
  const total = pairs.reduce((n, [, w]) => n + w, 0);
  return total ? pairs.reduce((n, [v, w]) => n + v * w, 0) / total : mean(pairs.map(([v]) => v));
}

/** Overall score: mostly "were the sounds right", the rest fluency, completeness and rhythm. */
export function overallScore(accuracy: number, others: number[]): number {
  return others.length ? ACCURACY_WEIGHT * accuracy + (1 - ACCURACY_WEIGHT) * mean(others) : accuracy;
}

function toPhoneme(p: AzPhoneme): PhonemeResult {
  const phoneme = normalizePhoneme(p.Phoneme);
  const accuracy = p.PronunciationAssessment?.AccuracyScore ?? 0;
  const candidates = (p.PronunciationAssessment?.NBestPhonemes ?? []).map((c) => ({
    phoneme: normalizePhoneme(c.Phoneme),
    score: c.Score,
  }));
  const top = candidates[0];
  if (!top) return { phoneme, score: accuracy };

  const expected = candidates.find((c) => c.phoneme === phoneme)?.score ?? 0;
  if (top.phoneme !== phoneme && expected < top.score - SUBSTITUTION_MARGIN) {
    return { phoneme, score: Math.min(accuracy, SUBSTITUTED_MAX), heardAs: top.phoneme };
  }
  return { phoneme, score: Math.max(accuracy, RECOGNIZED_MIN) };
}

/** One wrong sound makes the word wrong, however good the rest of it was. */
function wordScore(phonemes: PhonemeResult[], azureScore: number | undefined): number | null {
  if (!phonemes.length) return azureScore ?? null;
  const scores = phonemes.map((p) => p.score);
  return Math.min(mean(scores), Math.min(...scores) + WORST_SOUND_SLACK);
}

function toWord(w: AzWord): WordResult {
  const pa = w.PronunciationAssessment ?? {};
  const err = pa.ErrorType ?? "None";
  const prosody = pa.Feedback?.Prosody;
  const phonemes = (w.Phonemes ?? []).map(toPhoneme);
  const score = wordScore(phonemes, pa.AccuracyScore);
  return {
    word: w.Word,
    norm: normalizeWord(w.Word),
    score,
    error: err === "Omission" || err === "Insertion" ? err : score != null && score < 60 ? "Mispronunciation" : "None",
    offsetMs: w.Offset != null ? w.Offset / TICKS_PER_MS : undefined,
    durationMs: w.Duration != null ? w.Duration / TICKS_PER_MS : undefined,
    phonemes,
    unexpectedBreak: err === "UnexpectedBreak" || prosody?.Break?.ErrorTypes?.includes("UnexpectedBreak"),
    missingBreak: err === "MissingBreak" || prosody?.Break?.ErrorTypes?.includes("MissingBreak"),
    monotone: err === "Monotone" || prosody?.Intonation?.ErrorTypes?.includes("Monotone"),
  };
}

/**
 * Line up what was said with the reference sentence (longest common
 * subsequence), marking skipped words as omissions and extra ones as insertions.
 * Continuous recognition can split a sentence into several segments, so we
 * can't rely on the service's own alignment.
 */
export function alignWords(reference: Token[], spoken: WordResult[]): WordResult[] {
  const n = reference.length;
  const m = spoken.length;
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = reference[i].norm === spoken[j].norm ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out: WordResult[] = [];
  const omit = (t: Token): WordResult => ({
    word: t.display, norm: t.norm, glue: t.glue, score: null, error: "Omission", phonemes: [],
  });
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (reference[i].norm === spoken[j].norm) {
      const w = spoken[j];
      out.push({
        ...w,
        word: reference[i].display,
        glue: reference[i].glue,
        error: w.error === "Mispronunciation" ? "Mispronunciation" : "None",
      });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push(omit(reference[i++]));
    } else {
      out.push({ ...spoken[j++], error: "Insertion" });
    }
  }
  while (i < n) out.push(omit(reference[i++]));
  while (j < m) out.push({ ...spoken[j++], error: "Insertion" });
  return out;
}

function bestOf(segments: AzSegment[]) {
  return segments.flatMap((s) => {
    const best = s.NBest?.[0];
    return best ? [{ segment: s, best }] : [];
  });
}

type SegmentScores = NonNullable<AzSegment["NBest"]>[number]["PronunciationAssessment"];

/** Duration-weighted average of one of Azure's sentence-level scores across segments. */
function segmentAverage(results: ReturnType<typeof bestOf>, pick: (pa: SegmentScores) => number | undefined) {
  const pairs = results.flatMap(({ segment, best }) => {
    const v = pick(best.PronunciationAssessment);
    return v == null ? [] : [[v, segment.Duration ?? 1] as [number, number]];
  });
  return pairs.length ? weightedMean(pairs) : null;
}

export function buildScripted(referenceText: string, segments: AzSegment[]): Assessment {
  const reference = tokenize(referenceText);
  const results = bestOf(segments);
  const spoken = results
    .flatMap(({ best }) => best.Words ?? [])
    .filter((w) => w.PronunciationAssessment?.ErrorType !== "Omission")
    .map(toWord);
  if (!spoken.length) throw new NoSpeechError();

  const words = alignWords(reference, spoken);
  const said = words.filter((w) => w.error === "None" || w.error === "Mispronunciation");
  const accuracy = mean(said.map((w) => w.score ?? 0));
  const completeness = Math.min(100, (said.length / Math.max(1, reference.length)) * 100);
  const fluency = segmentAverage(results, (pa) => pa?.FluencyScore) ?? 0;
  const prosody = segmentAverage(results, (pa) => pa?.ProsodyScore);
  return {
    scripted: true,
    demo: false,
    pron: overallScore(accuracy, prosody == null ? [fluency, completeness] : [fluency, completeness, prosody]),
    accuracy,
    fluency,
    completeness,
    prosody,
    words,
    transcript: results.map(({ segment }) => segment.DisplayText ?? "").join(" ").trim(),
  };
}

export function buildUnscripted(segments: AzSegment[]): Assessment {
  const results = bestOf(segments);
  const words: WordResult[] = [];
  for (const { segment, best } of results) {
    const segWords = (best.Words ?? []).map(toWord);
    // Show words the way they were written ("I'm", "Hanoi,") when counts line up.
    const display = tokenize(segment.DisplayText ?? best.Display ?? "");
    const useDisplay = display.length === segWords.length;
    segWords.forEach((w, i) => {
      words.push({
        ...w,
        word: useDisplay ? display[i].display : w.word,
        glue: useDisplay ? display[i].glue : undefined,
        error: w.error === "Mispronunciation" ? "Mispronunciation" : "None",
      });
    });
  }
  if (!words.length) throw new NoSpeechError();

  const accuracy = mean(words.map((w) => w.score ?? 0));
  const fluency = segmentAverage(results, (pa) => pa?.FluencyScore) ?? 0;
  const prosody = segmentAverage(results, (pa) => pa?.ProsodyScore);
  return {
    scripted: false,
    demo: false,
    pron: overallScore(accuracy, prosody == null ? [fluency] : [fluency, prosody]),
    accuracy,
    fluency,
    completeness: null,
    prosody,
    words,
    transcript: results.map(({ segment }) => segment.DisplayText ?? "").join(" ").trim(),
  };
}
