"use client";

import { getSoundTip } from "@/data/sounds";
import { weakSounds } from "@/lib/insights";
import type { WordResult } from "@/lib/speech/types";
import { InfoIcon } from "./icons";
import { SoundTipCard } from "./SoundTipCard";

const quote = (w: WordResult) => `“${w.word.replace(/[^\p{L}\p{N}'-]/gu, "")}”`;

/** Rhythm and intonation feedback from Azure's prosody assessment. */
export function ProsodyNotes({ words }: { words: WordResult[] }) {
  const notes: string[] = [];
  const breaks = words.filter((w) => w.unexpectedBreak);
  const missing = words.filter((w) => w.missingBreak);
  if (breaks.length) {
    notes.push(
      `You paused in the middle of a phrase before ${breaks.slice(0, 3).map(quote).join(", ")} (marked |). Try to say each phrase in one breath.`,
    );
  }
  if (missing.length) {
    notes.push(
      `Take a short pause after ${missing.slice(0, 3).map(quote).join(", ")}. Pauses at commas and phrase ends make you easier to follow.`,
    );
  }
  if (words.some((w) => w.monotone)) {
    notes.push(
      "Your voice stayed quite flat. Let it rise on the important words and fall at the end of the sentence. Listen to the model and copy its melody.",
    );
  }
  if (!notes.length) return null;
  return (
    <ul className="space-y-2">
      {notes.map((note) => (
        <li key={note} className="flex gap-2.5 rounded-lg bg-surface-2 px-3 py-2.5 text-sm leading-relaxed text-ink">
          <InfoIcon size={18} className="mt-0.5 shrink-0 text-ink-2" />
          {note}
        </li>
      ))}
    </ul>
  );
}

export function FocusSounds({ words }: { words: WordResult[] }) {
  const weak = weakSounds(words);
  return (
    <section>
      <h3 className="text-base font-semibold text-ink">Sounds to work on</h3>
      {weak.length === 0 ? (
        <p className="mt-2 text-sm text-ink-2">No problem sounds this time. Try a longer sentence or a harder lesson.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {weak.map((s) => (
            <SoundTipCard key={s.key} tip={getSoundTip(s.key)!} heardAs={s.heardAs} words={s.words} />
          ))}
        </div>
      )}
    </section>
  );
}
