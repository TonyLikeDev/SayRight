// Phoneme helpers shared by the dictionary (CMU ARPAbet) and Azure results
// (en-US IPA). Everything is normalized to Azure's en-US IPA symbols so a
// dictionary transcription and an assessment result can be compared directly.

const ARPA_TO_IPA: Record<string, string> = {
  AA: "ɑ", AE: "æ", AH: "ʌ", AO: "ɔ", AW: "aʊ", AY: "aɪ", EH: "ɛ", ER: "ɝ",
  EY: "eɪ", IH: "ɪ", IY: "i", OW: "oʊ", OY: "ɔɪ", UH: "ʊ", UW: "u",
  B: "b", CH: "tʃ", D: "d", DH: "ð", F: "f", G: "ɡ", HH: "h", JH: "dʒ",
  K: "k", L: "l", M: "m", N: "n", NG: "ŋ", P: "p", R: "ɹ", S: "s", SH: "ʃ",
  T: "t", TH: "θ", V: "v", W: "w", Y: "j", Z: "z", ZH: "ʒ",
};

const ARPA_VOWELS = new Set([
  "AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY", "IH", "IY", "OW", "OY", "UH", "UW",
]);

// Legal English syllable onsets (besides single consonants), used to place
// stress marks before the right consonants (maximal onset principle).
const CLUSTER_ONSETS = new Set([
  "P R", "P L", "B R", "B L", "T R", "D R", "K R", "K L", "G R", "G L", "F R", "F L",
  "TH R", "SH R", "S P", "S T", "S K", "S M", "S N", "S L", "S W", "S P R", "S T R",
  "S K R", "S P L", "S K W", "T W", "D W", "K W", "G W", "TH W", "HH W", "P Y", "B Y",
  "F Y", "M Y", "K Y", "V Y", "HH Y", "S K Y", "S P Y",
]);

const IPA_VOWELS = new Set(["i", "ɪ", "eɪ", "ɛ", "æ", "ɑ", "ɔ", "ʊ", "u", "oʊ", "ʌ", "ə", "aɪ", "aʊ", "ɔɪ", "ɝ"]);

export function isVowel(phoneme: string): boolean {
  const p = normalizePhoneme(phoneme);
  return IPA_VOWELS.has(p) || isRColored(p);
}

// Azure writes r-coloured vowels as one sound: "ɛɹ" (heritage), "ɑɹ" (car).
function isRColored(p: string): boolean {
  return p.length > 1 && p.endsWith("ɹ");
}

/** The tip / progress bucket a phoneme belongs to. R-coloured vowels count as /r/. */
export function soundKey(phoneme: string): string {
  const p = normalizePhoneme(phoneme);
  return isRColored(p) ? "ɹ" : p;
}

/** Map any IPA-ish symbol to the canonical key used for tips and stats. */
export function normalizePhoneme(p: string): string {
  const s = p.trim().replace(/ː/g, "");
  switch (s) {
    case "r":
      return "ɹ";
    case "g":
      return "ɡ";
    case "ɚ":
    case "ɜ":
    case "ɜr":
    case "ər":
      return "ɝ";
    case "ɒ":
      return "ɑ";
    case "e":
      return "ɛ";
    case "o":
      return "oʊ";
    case "y":
      return "j";
    default:
      return s;
  }
}

/** Learner-friendly rendering of a canonical phoneme. */
export function displayPhoneme(p: string): string {
  const n = normalizePhoneme(p);
  if (n === "i") return "iː";
  if (n === "u") return "uː";
  return n.replace(/ɹ/g, "r").replace(/ɡ/g, "g");
}

export type Pronunciation = {
  /** canonical phoneme keys, in order */
  phonemes: string[];
  /** IPA with stress marks, for display, e.g. "ˈθæŋk" */
  ipa: string;
};

/** Convert a CMU dictionary entry like "TH AE1 NG K" to IPA with stress marks. */
export function arpabetToIpa(entry: string): Pronunciation {
  const tokens = entry.trim().split(/\s+/).map((t) => {
    const m = /^([A-Z]+)([012])?$/.exec(t);
    return { base: m ? m[1] : t, stress: m && m[2] ? Number(m[2]) : -1 };
  });

  const vowelIdx = tokens.flatMap((t, i) => (ARPA_VOWELS.has(t.base) ? [i] : []));
  const marks = new Map<number, string>();
  if (vowelIdx.length > 1) {
    vowelIdx.forEach((vi, n) => {
      const stress = tokens[vi].stress;
      if (stress !== 1 && stress !== 2) return;
      const prev = n === 0 ? -1 : vowelIdx[n - 1];
      const cluster = tokens.slice(prev + 1, vi).map((t) => t.base);
      let onset = 0;
      for (let len = cluster.length; len > 0; len--) {
        const suffix = cluster.slice(cluster.length - len);
        const legal = len === 1 ? suffix[0] !== "NG" : CLUSTER_ONSETS.has(suffix.join(" "));
        // A word-initial cluster always belongs to the first syllable.
        if (legal || prev === -1) {
          onset = len;
          break;
        }
      }
      marks.set(vi - onset, stress === 1 ? "ˈ" : "ˌ");
    });
  }

  const phonemes: string[] = [];
  let ipa = "";
  tokens.forEach((t, i) => {
    const key = ARPA_TO_IPA[t.base] ?? t.base.toLowerCase();
    const unstressed = t.stress === 0;
    const canonical = t.base === "AH" && unstressed ? "ə" : key;
    phonemes.push(canonical);
    ipa += marks.get(i) ?? "";
    if (t.base === "ER" && unstressed) ipa += "ɚ";
    else if ((t.base === "IY" || t.base === "UW") && unstressed) ipa += canonical;
    else ipa += displayPhoneme(canonical);
  });
  return { phonemes, ipa };
}

export type Token = {
  /** as written, with punctuation, for display */
  display: string;
  /** lowercase, punctuation stripped, for matching */
  norm: string;
  /** true when the next token continues the same written word (hyphenated) */
  glue?: boolean;
};

export function normalizeWord(w: string): string {
  return w
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z0-9']/g, "")
    .replace(/^'+|'+$/g, "");
}

/** Split a sentence into words the same way the speech service does. */
export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  for (const chunk of text.replace(/[’‘`]/g, "'").split(/\s+/)) {
    const parts = chunk.split(/(?<=[A-Za-z0-9])-(?=[A-Za-z0-9])/);
    parts.forEach((part, i) => {
      const norm = normalizeWord(part);
      if (!norm) {
        // Attach stray punctuation (e.g. "—") to the previous word.
        if (out.length) out[out.length - 1].display += " " + part;
        return;
      }
      const last = i < parts.length - 1;
      out.push({ display: last ? part + "-" : part, norm, glue: last || undefined });
    });
  }
  return out;
}
