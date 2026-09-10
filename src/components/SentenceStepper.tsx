"use client";

import { useState } from "react";
import type { PracticeMode } from "@/lib/progress";
import { ArrowLeftIcon, ArrowRightIcon } from "./icons";
import { PracticeCard } from "./PracticeCard";

/** Step through a list of sentences, one practice card at a time. */
export function SentenceStepper({
  sentences,
  mode,
  source,
}: {
  sentences: string[];
  mode: PracticeMode;
  source?: string;
}) {
  const [index, setIndex] = useState(0);
  const last = sentences.length - 1;

  const header = (
    <div className="mb-4 flex items-center justify-between gap-3">
      <p className="text-sm text-ink-2 tabular-nums">
        Sentence {index + 1} of {sentences.length}
      </p>
      <div className="flex gap-1" aria-hidden="true">
        {sentences.map((_, i) => (
          <span key={i} className={`h-1.5 w-4 rounded-full ${i === index ? "bg-accent" : i < index ? "bg-ink-3" : "bg-surface-2"}`} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <PracticeCard key={index} text={sentences[index]} mode={mode} source={source} header={header} />
      <div className="flex justify-between gap-3">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-ink-2 hover:bg-surface-2 disabled:invisible"
        >
          <ArrowLeftIcon size={18} /> Previous
        </button>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(last, i + 1))}
          disabled={index === last}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-bg hover:opacity-90 disabled:invisible"
        >
          Next sentence <ArrowRightIcon size={18} />
        </button>
      </div>
    </div>
  );
}
