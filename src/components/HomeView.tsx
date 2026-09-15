"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LESSONS } from "@/data/lessons";
import { QUESTIONS } from "@/data/questions";
import { getSoundTip } from "@/data/sounds";
import { listAttempts, soundStats, type SoundStat } from "@/lib/progress";
import { ArrowRightIcon, BookIcon, ChatIcon } from "./icons";
import { Card } from "./ui";
import { VoiceInputButton } from "./VoiceInputButton";

type Summary = { count: number; avg7: number | null; weak: SoundStat[] };

export function HomeView() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    listAttempts()
      .then((all) => {
        const real = all.filter((a) => !a.demo);
        const attempts = real.length ? real : all;
        const week = attempts.filter((a) => a.at > Date.now() - 7 * 86_400_000);
        setSummary({
          count: attempts.length,
          avg7: week.length ? week.reduce((n, a) => n + a.scores.pron, 0) / week.length : null,
          weak: soundStats(attempts).filter((s) => s.avg < 80 && getSoundTip(s.key)).slice(0, 4),
        });
      })
      .catch(() => setSummary({ count: 0, avg7: null, weak: [] }));
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const sentence = text.trim();
    if (sentence) router.push(`/practice?text=${encodeURIComponent(sentence)}`);
  };

  return (
    <div className="space-y-6">
      <header className="pt-2">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Speak clearly, one sentence at a time.</h1>
        <p className="mt-2 max-w-xl text-ink-2">
          Listen to a native speaker, record yourself, and see exactly which words and sounds to fix.
        </p>
      </header>

      <Card>
        <form onSubmit={submit}>
          <label htmlFor="own" className="font-semibold text-ink">
            Practice your own sentence
          </label>
          <p className="mt-0.5 text-sm text-ink-2">A line for a meeting, an interview answer, anything you want to say well.</p>
          <textarea
            id="own"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="I'd like to walk you through our results for this quarter."
            className="mt-3 w-full resize-none rounded-xl border border-line bg-bg px-3.5 py-3 text-base text-ink outline-none placeholder:text-ink-3 focus:border-accent focus:ring-2 focus:ring-accent/25"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) submit(e);
            }}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={!text.trim()}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Practice it <ArrowRightIcon size={18} />
            </button>
            <VoiceInputButton onTranscript={(spoken) => setText(spoken)} />
          </div>
        </form>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/lessons" className="group">
          <Card className="h-full transition-colors group-hover:border-ink-3">
            <BookIcon className="text-accent" size={24} />
            <p className="mt-3 font-semibold text-ink">Lessons</p>
            <p className="mt-1 text-sm text-ink-2">
              {LESSONS.length} sets: everyday topics plus the sounds Vietnamese speakers find hardest.
            </p>
          </Card>
        </Link>
        <Link href="/talk" className="group">
          <Card className="h-full transition-colors group-hover:border-ink-3">
            <ChatIcon className="text-accent" size={24} />
            <p className="mt-3 font-semibold text-ink">Conversation</p>
            <p className="mt-1 text-sm text-ink-2">
              Answer {QUESTIONS.length} real questions out loud and get feedback on your own words.
            </p>
          </Card>
        </Link>
      </div>

      {summary && summary.count > 0 && (
        <Card>
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-semibold text-ink">Your progress</p>
            <Link href="/progress" className="text-sm font-medium text-accent hover:underline">
              See all
            </Link>
          </div>
          <div className="mt-3 flex gap-8">
            <div>
              <p className="text-2xl font-semibold text-ink">{summary.count}</p>
              <p className="text-sm text-ink-2">sentences practiced</p>
            </div>
            {summary.avg7 != null && (
              <div>
                <p className="text-2xl font-semibold text-ink">{Math.round(summary.avg7)}</p>
                <p className="text-sm text-ink-2">average this week</p>
              </div>
            )}
          </div>
          {summary.weak.length > 0 && (
            <>
              <p className="mt-4 text-sm text-ink-2">Sounds to practice next</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {summary.weak.map((s) => {
                  const tip = getSoundTip(s.key)!;
                  return (
                    <Link
                      key={s.key}
                      href={`/practice?sound=${encodeURIComponent(s.key)}`}
                      className="rounded-full border border-line px-3 py-1.5 text-sm text-ink hover:border-accent hover:text-accent"
                    >
                      <span className="ipa font-semibold">{tip.label}</span> <span className="text-ink-2">{tip.name}</span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
