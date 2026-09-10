"use client";

import { useState } from "react";
import { getSoundTip } from "@/data/sounds";
import { playBlob, unlockAudio } from "@/lib/audio/player";
import { encodeWav, sliceRecording } from "@/lib/audio/wav";
import { displayPhoneme, isVowel, soundKey } from "@/lib/phonemes";
import { FINAL_KEY } from "@/lib/progress";
import { band, bandSoft, bandText } from "@/lib/score";
import { speak } from "@/lib/speech/tts";
import type { IpaWord, WordResult } from "@/lib/speech/types";
import { CloseIcon, SlowIcon, SpeakerIcon, UserIcon } from "./icons";
import { SoundTipCard } from "./SoundTipCard";
import { PillButton } from "./ui";

function cleanWord(w: string) {
  return w.replace(/[^\p{L}\p{N}'-]/gu, "");
}

export function WordDetail({
  word,
  entry,
  recording,
  onClose,
}: {
  word: WordResult;
  entry?: IpaWord;
  recording: Int16Array | null;
  onClose: () => void;
}) {
  const weakest = word.phonemes.reduce<number | null>(
    (best, p, i) => (p.score < 80 && (best == null || p.score < word.phonemes[best].score) ? i : best),
    null,
  );
  const [picked, setPicked] = useState<number | null>(weakest);
  const [playing, setPlaying] = useState<string | null>(null);

  const text = cleanWord(word.word);
  const canPlayMine = recording != null && word.offsetMs != null;

  const run = async (kind: string, fn: () => Promise<void>) => {
    setPlaying(kind);
    try {
      await fn();
    } finally {
      setPlaying(null);
    }
  };
  const playMine = () =>
    run("mine", async () => {
      unlockAudio();
      const start = word.offsetMs ?? 0;
      const slice = sliceRecording(recording!, start, start + (word.durationMs ?? 400));
      await playBlob(encodeWav(slice));
    });

  const phoneme = picked != null ? word.phonemes[picked] : null;
  const tip = phoneme ? getSoundTip(soundKey(phoneme.phoneme)) : undefined;
  const isFinalConsonant =
    picked != null && picked === word.phonemes.length - 1 && word.phonemes.length > 1 && phoneme && !isVowel(phoneme.phoneme);
  const finalTip = isFinalConsonant && phoneme.score < 70 ? getSoundTip(FINAL_KEY) : undefined;

  return (
    <div className="rounded-xl border border-line bg-bg p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xl font-semibold text-ink">
            {text}
            {entry?.ipa && <span className="ipa ml-2 text-base font-normal text-ink-2">/{entry.ipa}/</span>}
          </p>
          <p className="mt-0.5 text-sm text-ink-2">
            {word.error === "Omission"
              ? "You skipped this word."
              : word.error === "Insertion"
                ? "This word isn't in the sentence."
                : `Score ${Math.round(word.score ?? 0)} out of 100`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close word details"
          className="-mr-1 -mt-1 rounded-lg p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink"
        >
          <CloseIcon size={18} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <PillButton active={playing === "native"} onClick={() => run("native", () => speak(text))}>
          <SpeakerIcon size={16} /> Native
        </PillButton>
        <PillButton active={playing === "slow"} onClick={() => run("slow", () => speak(text, { slow: true }))}>
          <SlowIcon size={16} /> Slow
        </PillButton>
        {canPlayMine && (
          <PillButton active={playing === "mine"} onClick={playMine}>
            <UserIcon size={16} /> You
          </PillButton>
        )}
      </div>

      {word.phonemes.length > 0 && (
        <>
          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-ink-3">Sounds · tap one for a tip</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {word.phonemes.map((p, i) => {
              const b = band(p.score);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPicked(picked === i ? null : i)}
                  aria-pressed={picked === i}
                  aria-label={`Sound ${displayPhoneme(p.phoneme)}, score ${Math.round(p.score)}${
                    p.heardAs ? `, sounded like ${displayPhoneme(p.heardAs)}` : ""
                  }`}
                  className={`flex min-w-12 flex-col items-center rounded-lg px-2 py-1.5 ring-accent transition-shadow aria-pressed:ring-2 ${bandSoft[b]}`}
                >
                  <span className="ipa text-lg font-semibold leading-tight text-ink">{displayPhoneme(p.phoneme)}</span>
                  <span className={`text-xs font-medium tabular-nums ${bandText[b]}`}>{Math.round(p.score)}</span>
                  {p.heardAs && (
                    <span className="ipa text-[11px] leading-tight text-ink-2">≈ {displayPhoneme(p.heardAs)}</span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {tip && phoneme && (
        <div className="mt-4 space-y-3">
          <SoundTipCard tip={tip} heardAs={phoneme.heardAs} />
          {finalTip && <SoundTipCard tip={finalTip} />}
        </div>
      )}
      {word.error === "Omission" && (
        <p className="mt-3 text-sm text-ink-2">Listen to it, then say the whole sentence again without dropping it.</p>
      )}
    </div>
  );
}
