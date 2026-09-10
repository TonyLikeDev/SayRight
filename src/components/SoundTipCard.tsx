"use client";

import Link from "next/link";
import { useState } from "react";
import type { SoundTip } from "@/data/sounds";
import { displayPhoneme } from "@/lib/phonemes";
import { speak } from "@/lib/speech/tts";
import { ArrowRightIcon, SpeakerIcon } from "./icons";

export function SoundTipCard({
  tip,
  heardAs,
  words,
  showPractice = true,
}: {
  tip: SoundTip;
  heardAs?: string;
  words?: string[];
  showPractice?: boolean;
}) {
  const [playing, setPlaying] = useState<string | null>(null);
  const say = async (word: string) => {
    setPlaying(word);
    try {
      await speak(word);
    } finally {
      setPlaying(null);
    }
  };

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="flex items-baseline gap-2">
          <span className="ipa text-xl font-semibold text-ink">{tip.label}</span>
          <span className="text-ink-2">{tip.name}</span>
        </p>
        {heardAs && (
          <p className="text-sm text-ink-2">
            Sounded like <span className="ipa font-semibold text-ink">/{displayPhoneme(heardAs)}/</span>
          </p>
        )}
      </div>
      {words && words.length > 0 && <p className="mt-1 text-sm text-ink-3">In: {words.join(", ")}</p>}

      <p className="mt-3 text-[0.95rem] leading-relaxed text-ink">
        <span className="font-semibold">How to say it: </span>
        {tip.how}
      </p>
      <p className="mt-2 rounded-lg bg-surface-2 px-3 py-2.5 text-[0.95rem] leading-relaxed text-ink">
        <span className="font-semibold">For Vietnamese speakers: </span>
        {tip.vietnamese}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {tip.examples.map((word) => (
          <button
            key={word}
            type="button"
            onClick={() => say(word)}
            data-active={playing === word || undefined}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-sm text-ink transition-colors hover:bg-accent-soft data-[active]:bg-accent-soft data-[active]:text-accent"
          >
            <SpeakerIcon size={14} />
            {word}
          </button>
        ))}
        {showPractice && (
          <Link
            href={`/practice?sound=${encodeURIComponent(tip.key)}`}
            className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
          >
            Practice this sound <ArrowRightIcon size={16} />
          </Link>
        )}
      </div>
    </div>
  );
}
