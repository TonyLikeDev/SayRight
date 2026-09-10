import type { Metadata } from "next";
import Link from "next/link";
import { LESSONS, type Lesson } from "@/data/lessons";
import { getSoundTip } from "@/data/sounds";
import { LevelChip } from "@/components/ui";

export const metadata: Metadata = { title: "Lessons · SayRight" };

function LessonCard({ lesson }: { lesson: Lesson }) {
  const focus = (lesson.focus ?? []).map((k) => getSoundTip(k)?.label).filter(Boolean);
  return (
    <Link
      href={`/lessons/${lesson.id}`}
      className="flex flex-col rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-ink-3"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-ink">{lesson.title}</p>
        <LevelChip level={lesson.level} />
      </div>
      <p className="mt-1 text-sm text-ink-2">{lesson.description}</p>
      <p className="mt-3 text-xs text-ink-3">
        {focus.length > 0 && <span className="ipa mr-2 text-ink-2">{focus.join("  ")}</span>}
        {lesson.sentences.length} sentences
      </p>
    </Link>
  );
}

export default function LessonsPage() {
  const topics = LESSONS.filter((l) => l.kind === "topic");
  const sounds = LESSONS.filter((l) => l.kind === "sound");
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Lessons</h1>
        <p className="mt-2 text-ink-2">Pick a set and read each sentence aloud. Tap any word to hear it first.</p>
      </header>
      <section>
        <h2 className="text-lg font-semibold text-ink">Tricky sounds for Vietnamese speakers</h2>
        <p className="mt-1 text-sm text-ink-2">Short drills for the sounds that are hardest coming from Vietnamese.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {sounds.map((l) => (
            <LessonCard key={l.id} lesson={l} />
          ))}
        </div>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-ink">Everyday topics</h2>
        <p className="mt-1 text-sm text-ink-2">Sentences you&apos;ll actually use, from ordering coffee to job interviews.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {topics.map((l) => (
            <LessonCard key={l.id} lesson={l} />
          ))}
        </div>
      </section>
    </div>
  );
}
