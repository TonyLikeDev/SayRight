"use client";

import { band, bandText } from "@/lib/score";
import type { IpaWord, WordResult } from "@/lib/speech/types";

export type SentenceItem = {
  display: string;
  glue?: boolean;
  entry?: IpaWord;
  result?: WordResult;
};

function wordClass(r?: WordResult): string {
  if (!r) return "text-ink";
  if (r.error === "Omission") return "text-ink-3 line-through decoration-2";
  if (r.error === "Insertion") return "text-ink-3 italic";
  const b = band(r.score ?? 0);
  // Underline style repeats the color, so the meaning isn't carried by color alone.
  if (b === "bad") return `${bandText.bad} underline decoration-wavy decoration-2 underline-offset-[7px]`;
  if (b === "ok") return `${bandText.ok} underline decoration-dotted decoration-2 underline-offset-[7px]`;
  return bandText.good;
}

function describe(item: SentenceItem): string {
  const r = item.result;
  if (!r) return `${item.display}. Tap to hear it.`;
  if (r.error === "Omission") return `${item.display}: skipped`;
  if (r.error === "Insertion") return `${item.display}: extra word`;
  return `${item.display}: ${Math.round(r.score ?? 0)} out of 100`;
}

/** A sentence as tappable words, with IPA under each and optional result colors. */
export function SentenceWords({
  items,
  showIpa,
  selected,
  onSelect,
}: {
  items: SentenceItem[];
  showIpa: boolean;
  selected?: number | null;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="-mx-1 flex flex-wrap items-start gap-y-2">
      {items.map((item, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          aria-pressed={selected === i}
          aria-label={describe(item)}
          className={`flex flex-col items-center rounded-lg px-1 py-1 transition-colors hover:bg-surface-2 aria-pressed:bg-accent-soft ${
            item.glue ? "" : "mr-1"
          }`}
        >
          <span className={`text-[1.6rem] font-medium leading-tight tracking-tight sm:text-[1.75rem] ${wordClass(item.result)}`}>
            {item.result?.unexpectedBreak && (
              <span className="mr-1 font-normal text-bad" aria-hidden="true">
                |
              </span>
            )}
            {item.display}
          </span>
          {showIpa && (
            <span className="ipa mt-1.5 text-[0.82rem] leading-none text-ink-3">
              {item.entry?.ipa ? `/${item.entry.ipa}/` : " "}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function ResultLegend() {
  return (
    <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-good" /> Good
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-ok" /> Almost <span className="text-ink-3">(dotted)</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-bad" /> Needs work <span className="text-ink-3">(wavy)</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="line-through">abc</span> Skipped
      </span>
      <span className="text-ink-3">Tap any word for details</span>
    </p>
  );
}
