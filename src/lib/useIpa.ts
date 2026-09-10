"use client";

import { useEffect, useState } from "react";
import type { IpaWord } from "@/lib/speech/types";

const cache = new Map<string, Promise<IpaWord[]>>();

export function fetchIpa(text: string): Promise<IpaWord[]> {
  let hit = cache.get(text);
  if (!hit) {
    hit = fetch("/api/ipa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then((r) => (r.ok ? r.json() : { words: [] }))
      .then((d: { words: IpaWord[] }) => d.words);
    hit.catch(() => cache.delete(text));
    cache.set(text, hit);
  }
  return hit;
}

/** Dictionary pronunciation (IPA + stress) for each word of a sentence. */
export function useIpa(text: string | null): IpaWord[] | null {
  const [state, setState] = useState<{ text: string; words: IpaWord[] } | null>(null);
  useEffect(() => {
    if (!text) return;
    let live = true;
    fetchIpa(text)
      .then((words) => live && setState({ text, words }))
      .catch(() => live && setState({ text, words: [] }));
    return () => {
      live = false;
    };
  }, [text]);
  return text && state?.text === text ? state.words : null;
}
