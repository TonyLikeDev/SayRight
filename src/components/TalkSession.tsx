"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { QUESTIONS, type Question } from "@/data/questions";
import { playBlob, unlockAudio } from "@/lib/audio/player";
import { encodeWav } from "@/lib/audio/wav";
import { attemptFromAssessment, saveAttempt } from "@/lib/progress";
import { speak } from "@/lib/speech/tts";
import type { Assessment } from "@/lib/speech/types";
import { useAssessment } from "@/lib/useAssessment";
import { useIpa } from "@/lib/useIpa";
import { ArrowRightIcon, LightbulbIcon, SpeakerIcon, UserIcon } from "./icons";
import { RecordButton } from "./RecordButton";
import { FocusSounds, ProsodyNotes } from "./ResultDetails";
import { ScoreSummary } from "./ScoreSummary";
import { ResultLegend, SentenceWords, type SentenceItem } from "./SentenceWords";
import { Card, LevelChip, PillButton } from "./ui";
import { WordDetail } from "./WordDetail";

const TOPICS = ["All", ...Array.from(new Set(QUESTIONS.map((q) => q.topic)))];

function randomOther(pool: Question[], currentId: string): Question {
  const options = pool.filter((q) => q.id !== currentId);
  return options[Math.floor(Math.random() * options.length)] ?? pool[0];
}

export function TalkSession() {
  const [topic, setTopic] = useState("All");
  const [questionId, setQuestionId] = useState(QUESTIONS[0].id);
  const question = QUESTIONS.find((q) => q.id === questionId)!;

  const pickFrom = (pool: Question[]) => setQuestionId(randomOther(pool, questionId).id);

  const chooseTopic = (t: string) => {
    setTopic(t);
    pickFrom(t === "All" ? QUESTIONS : QUESTIONS.filter((q) => q.topic === t));
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Conversation</h1>
        <p className="mt-2 text-ink-2">
          Answer out loud in your own words. You&apos;ll get feedback on how you pronounced what you said. Grammar
          isn&apos;t checked.
        </p>
      </header>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="tablist" aria-label="Topics">
        {TOPICS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={topic === t}
            onClick={() => chooseTopic(t)}
            className="shrink-0 rounded-full border border-line px-3.5 py-1.5 text-sm text-ink-2 transition-colors hover:text-ink aria-selected:border-ink aria-selected:bg-ink aria-selected:text-bg"
          >
            {t}
          </button>
        ))}
      </div>

      <TalkCard
        key={question.id}
        question={question}
        onNext={() => pickFrom(topic === "All" ? QUESTIONS : QUESTIONS.filter((q) => q.topic === topic))}
      />
    </div>
  );
}

function TalkCard({ question, onNext }: { question: Question; onNext: () => void }) {
  const a = useAssessment(null);
  const [showIdea, setShowIdea] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const saved = useRef<Assessment | null>(null);

  useEffect(() => {
    if (!a.result || saved.current === a.result) return;
    saved.current = a.result;
    saveAttempt(attemptFromAssessment(a.result, "talk", question.question, question.id)).catch(() => {});
  }, [a.result, question]);

  const spokenText = a.result ? a.result.words.map((w) => w.word).join(" ") : null;
  const ipa = useIpa(spokenText);
  const items: SentenceItem[] = useMemo(() => {
    if (!a.result) return [];
    const aligned = ipa && ipa.length === a.result.words.length;
    return a.result.words.map((w, i) => ({ display: w.word, glue: w.glue, result: w, entry: aligned ? ipa[i] : undefined }));
  }, [a.result, ipa]);

  const run = async (kind: string, fn: () => Promise<void>) => {
    setPlaying(kind);
    try {
      await fn();
    } catch {
      // playback errors are non-fatal here
    } finally {
      setPlaying(null);
    }
  };

  const selectedItem = selected != null ? items[selected] : null;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink-2">{question.topic}</span>
          <LevelChip level={question.level} />
        </div>
        <h2 className="mt-2 text-2xl font-semibold leading-snug tracking-tight text-ink">{question.question}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <PillButton active={playing === "q"} onClick={() => run("q", () => speak(question.question))}>
            <SpeakerIcon size={16} /> Hear question
          </PillButton>
          <PillButton active={showIdea} onClick={() => setShowIdea((v) => !v)} aria-expanded={showIdea}>
            <LightbulbIcon size={16} /> {showIdea ? "Hide idea" : "Need an idea?"}
          </PillButton>
        </div>

        {showIdea && (
          <div className="mt-4 rounded-xl bg-surface-2 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-3">Sample answer</p>
            <p className="mt-1.5 leading-relaxed text-ink">{question.sample}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <PillButton active={playing === "sample"} onClick={() => run("sample", () => speak(question.sample))}>
                <SpeakerIcon size={16} /> Listen
              </PillButton>
              {question.phrases.map((p) => (
                <span key={p} className="rounded-full border border-line bg-surface px-3 py-1 text-sm text-ink-2">
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 border-t border-line pt-6">
          <RecordButton
            phase={a.phase}
            level={a.level}
            elapsed={a.elapsed}
            onStart={() => {
              setSelected(null);
              void a.start();
            }}
            onStop={a.stop}
            idleHint="Tap the mic and answer in two to four sentences."
          />
          {a.error && (
            <p role="alert" className="mx-auto mt-3 max-w-sm text-center text-sm text-bad">
              {a.error}
            </p>
          )}
        </div>
      </Card>

      {a.result && (
        <>
          <Card>
            <p className="mb-3 text-sm font-medium text-ink-2">What we heard</p>
            <SentenceWords items={items} showIpa={false} selected={selected} onSelect={(i) => setSelected(selected === i ? null : i)} />
            <ResultLegend />
            {selectedItem?.result && (
              <div className="mt-4">
                <WordDetail
                  key={selected}
                  word={selectedItem.result}
                  entry={selectedItem.entry}
                  recording={a.recording}
                  onClose={() => setSelected(null)}
                />
              </div>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {a.recording && (
                <PillButton
                  active={playing === "mine"}
                  onClick={() =>
                    run("mine", async () => {
                      unlockAudio();
                      await playBlob(encodeWav(a.recording!));
                    })
                  }
                >
                  <UserIcon size={16} /> Hear yourself
                </PillButton>
              )}
              {a.result.transcript && (
                <Link
                  href={`/practice?text=${encodeURIComponent(a.result.transcript)}`}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-accent hover:bg-accent-soft"
                >
                  Practice saying it again <ArrowRightIcon size={16} />
                </Link>
              )}
            </div>
          </Card>
          <Card>
            <ScoreSummary result={a.result} />
            <div className="mt-5 empty:hidden">
              <ProsodyNotes words={a.result.words} />
            </div>
          </Card>
          <FocusSounds words={a.result.words} />
        </>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNext}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-bg hover:opacity-90"
        >
          Next question <ArrowRightIcon size={18} />
        </button>
      </div>
    </div>
  );
}
