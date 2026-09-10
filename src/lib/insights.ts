import { getSoundTip } from "@/data/sounds";
import { isVowel, soundKey } from "@/lib/phonemes";
import { FINAL_KEY } from "@/lib/progress";
import type { WordResult } from "@/lib/speech/types";

export type WeakSound = {
  key: string;
  avg: number;
  /** most common wrong sound heard instead */
  heardAs?: string;
  /** words where this sound went wrong */
  words: string[];
};

/** The sounds that went worst in one attempt, with a tip available for each. */
export function weakSounds(words: WordResult[], limit = 3): WeakSound[] {
  type Entry = { scores: number[]; heard: Map<string, number>; words: Set<string> };
  const acc = new Map<string, Entry>();
  const add = (key: string, score: number, word: string, heardAs?: string) => {
    const entry: Entry = acc.get(key) ?? { scores: [], heard: new Map(), words: new Set() };
    entry.scores.push(score);
    if (heardAs) entry.heard.set(heardAs, (entry.heard.get(heardAs) ?? 0) + 1);
    if (score < 70) entry.words.add(word.replace(/[^\p{L}\p{N}'-]/gu, ""));
    acc.set(key, entry);
  };

  for (const w of words) {
    if (w.error === "Omission" || w.error === "Insertion") continue;
    w.phonemes.forEach((p, i) => {
      add(soundKey(p.phoneme), p.score, w.word, p.heardAs);
      if (i === w.phonemes.length - 1 && w.phonemes.length > 1 && !isVowel(p.phoneme)) add(FINAL_KEY, p.score, w.word);
    });
  }

  return [...acc.entries()]
    .map(([key, e]) => ({
      key,
      avg: e.scores.reduce((a, b) => a + b, 0) / e.scores.length,
      heardAs: [...e.heard.entries()].sort((a, b) => b[1] - a[1])[0]?.[0],
      words: [...e.words].slice(0, 4),
    }))
    .filter((s) => s.avg < 75 && s.words.length > 0 && getSoundTip(s.key))
    .sort((a, b) => a.avg - b.avg)
    .slice(0, limit);
}
