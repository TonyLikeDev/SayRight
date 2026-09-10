"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { playBlob, unlockAudio } from "@/lib/audio/player";
import { encodeWav } from "@/lib/audio/wav";
import { tokenize } from "@/lib/phonemes";
import { attemptFromAssessment, saveAttempt, type PracticeMode } from "@/lib/progress";
import { speak } from "@/lib/speech/tts";
import type { Assessment } from "@/lib/speech/types";
import { useAssessment } from "@/lib/useAssessment";
import { useIpa } from "@/lib/useIpa";
import { SlowIcon, SpeakerIcon, UserIcon } from "./icons";
import { RecordButton } from "./RecordButton";
import { FocusSounds, ProsodyNotes } from "./ResultDetails";
import { ScoreSummary } from "./ScoreSummary";
import { ResultLegend, SentenceWords, type SentenceItem } from "./SentenceWords";
import { Card, PillButton } from "./ui";
import { WordDetail } from "./WordDetail";

/** Read one sentence aloud and get scored. Remount (key) it to change sentence. */
export function PracticeCard({
  text,
  mode,
  source,
  header,
}: {
  text: string;
  mode: PracticeMode;
  source?: string;
  header?: React.ReactNode;
}) {
  const ipa = useIpa(text);
  const tokens = useMemo(() => tokenize(text), [text]);
  const a = useAssessment(text);
  const [showIpa, setShowIpa] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const saved = useRef<Assessment | null>(null);

  useEffect(() => {
    if (!a.result || saved.current === a.result) return;
    saved.current = a.result;
    saveAttempt(attemptFromAssessment(a.result, mode, text, source)).catch(() => {});
  }, [a.result, mode, text, source]);

  const items: SentenceItem[] = useMemo(() => {
    if (!a.result) return tokens.map((t, i) => ({ display: t.display, glue: t.glue, entry: ipa?.[i] }));
    let ref = 0;
    return a.result.words.map((w) =>
      w.error === "Insertion"
        ? { display: w.word, result: w }
        : { display: w.word, glue: w.glue, entry: ipa?.[ref++], result: w },
    );
  }, [a.result, tokens, ipa]);

  const run = async (kind: string, fn: () => Promise<void>) => {
    setPlaying(kind);
    setAudioError(null);
    try {
      await fn();
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : "Couldn't play audio.");
    } finally {
      setPlaying(null);
    }
  };

  const onWord = (i: number) => {
    if (a.result) {
      setSelected(selected === i ? null : i);
      return;
    }
    const word = items[i].display.replace(/[^\p{L}\p{N}'-]/gu, "");
    void run(`word-${i}`, () => speak(word));
  };

  const start = () => {
    setSelected(null);
    void a.start();
  };

  const selectedItem = selected != null ? items[selected] : null;

  return (
    <div className="space-y-4">
      <Card>
        {header}
        <SentenceWords items={items} showIpa={showIpa} selected={a.result ? selected : null} onSelect={onWord} />
        {a.result && <ResultLegend />}
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
          <PillButton active={playing === "normal"} onClick={() => run("normal", () => speak(text))}>
            <SpeakerIcon size={16} /> Listen
          </PillButton>
          <PillButton active={playing === "slow"} onClick={() => run("slow", () => speak(text, { slow: true }))}>
            <SlowIcon size={16} /> Slow
          </PillButton>
          {a.recording && a.phase !== "recording" && (
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
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-ink-2">
            <input
              type="checkbox"
              checked={showIpa}
              onChange={(e) => setShowIpa(e.target.checked)}
              className="size-4 accent-[var(--accent)]"
            />
            IPA
          </label>
        </div>
        {audioError && (
          <p role="alert" className="mt-2 text-sm text-bad">
            {audioError}
          </p>
        )}

        <div className="mt-6 border-t border-line pt-6">
          <RecordButton phase={a.phase} level={a.level} elapsed={a.elapsed} onStart={start} onStop={a.stop} />
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
            <ScoreSummary result={a.result} />
            <div className="mt-5 empty:hidden">
              <ProsodyNotes words={a.result.words} />
            </div>
          </Card>
          <FocusSounds words={a.result.words} />
        </>
      )}
    </div>
  );
}
