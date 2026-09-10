import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLesson, LESSONS } from "@/data/lessons";
import { getSoundTip, type SoundTip } from "@/data/sounds";
import { ArrowLeftIcon } from "@/components/icons";
import { SentenceStepper } from "@/components/SentenceStepper";
import { SoundTipCard } from "@/components/SoundTipCard";
import { LevelChip } from "@/components/ui";

export function generateStaticParams() {
  return LESSONS.map((l) => ({ id: l.id }));
}

export async function generateMetadata({ params }: PageProps<"/lessons/[id]">): Promise<Metadata> {
  const lesson = getLesson((await params).id);
  return { title: lesson ? `${lesson.title} · SayCoach` : "Lesson · SayCoach" };
}

export default async function LessonPage({ params }: PageProps<"/lessons/[id]">) {
  const lesson = getLesson((await params).id);
  if (!lesson) notFound();
  const tips = (lesson.focus ?? []).map((k) => getSoundTip(k)).filter((t): t is SoundTip => !!t);

  return (
    <div className="space-y-5">
      <Link href="/lessons" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
        <ArrowLeftIcon size={16} /> All lessons
      </Link>
      <header>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{lesson.title}</h1>
          <LevelChip level={lesson.level} />
        </div>
        <p className="mt-1.5 text-ink-2">{lesson.description}</p>
      </header>

      {tips.length > 0 && (
        <details className="group rounded-2xl border border-line bg-surface px-5 py-4">
          <summary className="cursor-pointer list-none font-medium text-ink marker:hidden">
            How to make {tips.map((t) => t.label).join(" and ")}
            <span className="ml-2 text-sm font-normal text-ink-3 group-open:hidden">Show</span>
          </summary>
          <div className="mt-4 space-y-3">
            {tips.map((tip) => (
              <SoundTipCard key={tip.key} tip={tip} showPractice={false} />
            ))}
          </div>
        </details>
      )}

      <SentenceStepper sentences={lesson.sentences} mode="lesson" source={lesson.id} />
    </div>
  );
}
