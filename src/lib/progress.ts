// Practice history, stored in this browser (IndexedDB).
import { isVowel, soundKey } from "@/lib/phonemes";
import type { Assessment, ErrorType, Scores } from "@/lib/speech/types";

export type PracticeMode = "lesson" | "custom" | "talk" | "drill";

export type Attempt = {
  id: string;
  at: number;
  mode: PracticeMode;
  /** the sentence, or the question in conversation mode */
  text: string;
  /** lesson id or sound key the attempt came from */
  source?: string;
  demo: boolean;
  scores: Scores;
  words: { w: string; s: number | null; e: ErrorType; ph: [phoneme: string, score: number][] }[];
};

export const FINAL_KEY = "FINAL";

// Keeps the app's original name: renaming the database would lose everyone's history.
const DB_NAME = "sayright";
const STORE = "attempts";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { keyPath: "id" });
      store.createIndex("at", "at");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = run(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export function attemptFromAssessment(a: Assessment, mode: PracticeMode, text: string, source?: string): Attempt {
  const round = (n: number | null) => (n == null ? null : Math.round(n));
  return {
    id: crypto.randomUUID(),
    at: Date.now(),
    mode,
    text,
    source,
    demo: a.demo,
    scores: {
      pron: Math.round(a.pron),
      accuracy: Math.round(a.accuracy),
      fluency: Math.round(a.fluency),
      completeness: round(a.completeness),
      prosody: round(a.prosody),
    },
    words: a.words.map((w) => ({
      w: w.word,
      s: round(w.score),
      e: w.error,
      ph: w.phonemes.map((p) => [p.phoneme, Math.round(p.score)]),
    })),
  };
}

export async function saveAttempt(attempt: Attempt): Promise<void> {
  await withStore("readwrite", (s) => s.put(attempt));
}

export async function listAttempts(): Promise<Attempt[]> {
  const all = await withStore<Attempt[]>("readonly", (s) => s.getAll());
  return all.sort((a, b) => a.at - b.at);
}

export async function clearAttempts(): Promise<void> {
  await withStore("readwrite", (s) => s.clear());
}

export type SoundStat = {
  key: string;
  avg: number;
  /** how many times the sound was scored */
  count: number;
  /** how many of those scored under 60 */
  misses: number;
};

/** Average score per sound, plus a "final consonants" bucket. Weakest first. */
export function soundStats(attempts: Attempt[], minCount = 3): SoundStat[] {
  const acc = new Map<string, { sum: number; count: number; misses: number }>();
  const add = (key: string, score: number) => {
    const s = acc.get(key) ?? { sum: 0, count: 0, misses: 0 };
    s.sum += score;
    s.count++;
    if (score < 60) s.misses++;
    acc.set(key, s);
  };
  for (const a of attempts) {
    for (const w of a.words) {
      if (w.e === "Omission" || w.e === "Insertion") continue;
      w.ph.forEach(([p, score], i) => {
        add(soundKey(p), score);
        if (i === w.ph.length - 1 && w.ph.length > 1 && !isVowel(p)) add(FINAL_KEY, score);
      });
    }
  }
  return [...acc.entries()]
    .filter(([, s]) => s.count >= minCount)
    .map(([key, s]) => ({ key, avg: s.sum / s.count, count: s.count, misses: s.misses }))
    .sort((a, b) => a.avg - b.avg);
}
