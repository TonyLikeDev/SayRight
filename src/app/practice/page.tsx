import type { Metadata } from "next";
import Link from "next/link";
import { getSoundTip } from "@/data/sounds";
import { CustomPractice } from "@/components/CustomPractice";
import { ArrowLeftIcon } from "@/components/icons";
import { SentenceStepper } from "@/components/SentenceStepper";
import { SoundTipCard } from "@/components/SoundTipCard";

export const metadata: Metadata = { title: "Practice · SayRight" };

export default async function PracticePage({ searchParams }: PageProps<"/practice">) {
  const sp = await searchParams;
  const tip = typeof sp.sound === "string" ? getSoundTip(sp.sound) : undefined;

  if (tip) {
    return (
      <div className="space-y-5">
        <Link href="/progress" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
          <ArrowLeftIcon size={16} /> Progress
        </Link>
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Practice <span className="ipa">{tip.label}</span>
          </h1>
          <p className="mt-1.5 text-ink-2">Read the tip, listen to the examples, then work through the drill.</p>
        </header>
        <SoundTipCard tip={tip} showPractice={false} />
        <SentenceStepper sentences={tip.drills} mode="drill" source={tip.key} />
      </div>
    );
  }

  const text = typeof sp.text === "string" ? sp.text.trim().slice(0, 300) : "";
  return <CustomPractice initialText={text} />;
}
