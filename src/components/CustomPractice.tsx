"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PracticeCard } from "./PracticeCard";
import { VoiceInputButton } from "./VoiceInputButton";

export function CustomPractice({ initialText }: { initialText: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialText);
  const [text, setText] = useState(initialText);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const sentence = draft.trim();
    if (!sentence) return;
    setText(sentence);
    router.replace(`/practice?text=${encodeURIComponent(sentence)}`, { scroll: false });
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Your sentence</h1>
        <p className="mt-1.5 text-ink-2">Type or speak anything you want to say well. Spell numbers as words for the best scoring.</p>
      </header>
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) submit(e);
          }}
          rows={2}
          maxLength={300}
          aria-label="Sentence to practice"
          placeholder="Thanks for having me. I'm excited to be here."
          className="w-full flex-1 resize-none rounded-xl border border-line bg-surface px-3.5 py-3 text-base text-ink outline-none placeholder:text-ink-3 focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-stretch">
          <VoiceInputButton onTranscript={(spoken) => setDraft(spoken)} />
          <button
            type="submit"
            disabled={!draft.trim() || draft.trim() === text}
            className="h-11 shrink-0 rounded-full bg-accent px-5 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {text ? "Use this sentence" : "Practice it"}
          </button>
        </div>
      </form>
      {text && <PracticeCard key={text} text={text} mode="custom" />}
    </div>
  );
}
