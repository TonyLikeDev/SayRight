// Believable fake results for demo mode (no Azure key yet), biased toward
// the mistakes Vietnamese speakers typically make so the feedback UI has
// something realistic to show.
import { isVowel } from "@/lib/phonemes";
import { overallScore } from "./normalize";
import type { Assessment, IpaWord, PhonemeResult, WordResult } from "./types";

const TYPICAL_SWAPS: Record<string, string> = {
  θ: "t", ð: "d", ɹ: "z", ʃ: "s", dʒ: "z", æ: "ɛ", ɪ: "i", v: "b", z: "s", ʒ: "z",
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function mockPhonemes(phonemes: string[]): PhonemeResult[] {
  return phonemes.map((p, i) => {
    const last = i === phonemes.length - 1;
    if (TYPICAL_SWAPS[p] && Math.random() < 0.55) {
      return { phoneme: p, score: Math.round(rand(30, 58)), heardAs: TYPICAL_SWAPS[p] };
    }
    if (last && !isVowel(p) && Math.random() < 0.45) {
      return { phoneme: p, score: Math.round(rand(25, 60)) };
    }
    return { phoneme: p, score: Math.round(rand(72, 100)) };
  });
}

function withTiming(words: WordResult[], durationMs: number): WordResult[] {
  const spoken = words.filter((w) => w.error !== "Omission");
  const start = Math.min(400, durationMs * 0.1);
  const step = (durationMs * 0.9 - start) / Math.max(1, spoken.length);
  let k = 0;
  return words.map((w) => {
    if (w.error === "Omission") return w;
    const offsetMs = start + step * k++;
    return { ...w, offsetMs, durationMs: step * 0.9 };
  });
}

function wordFrom(ipa: IpaWord, allowOmission: boolean): WordResult {
  if (allowOmission && Math.random() < 0.06) {
    return { word: ipa.display, norm: ipa.norm, glue: ipa.glue, score: null, error: "Omission", phonemes: [] };
  }
  const phonemes = mockPhonemes(ipa.phonemes);
  const score = phonemes.length ? Math.round(mean(phonemes.map((p) => p.score))) : Math.round(rand(70, 95));
  return {
    word: ipa.display,
    norm: ipa.norm,
    glue: ipa.glue,
    score,
    error: score < 60 ? "Mispronunciation" : "None",
    phonemes,
    unexpectedBreak: Math.random() < 0.05,
  };
}

export function mockAssessment(words: IpaWord[], durationMs: number, scripted: boolean): Assessment {
  const results = withTiming(words.map((w) => wordFrom(w, scripted && words.length > 5)), durationMs);
  const said = results.filter((w) => w.error !== "Omission");
  const accuracy = mean(said.map((w) => w.score ?? 0));
  const fluency = rand(68, 92);
  const prosody = rand(62, 88);
  const completeness = scripted ? (said.length / Math.max(1, results.length)) * 100 : null;
  const pron = overallScore(accuracy, completeness == null ? [fluency, prosody] : [fluency, completeness, prosody]);
  return {
    scripted,
    demo: true,
    pron,
    accuracy,
    fluency,
    completeness,
    prosody,
    words: results,
    transcript: words.map((w) => w.display).join(" "),
  };
}
