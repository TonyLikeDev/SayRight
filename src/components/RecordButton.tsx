"use client";

import type { Phase } from "@/lib/useAssessment";
import { MicIcon, StopIcon } from "./icons";
import { Spinner } from "./ui";

function clock(secs: number) {
  const s = Math.floor(secs);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function RecordButton({
  phase,
  level,
  elapsed,
  onStart,
  onStop,
  idleHint = "Tap the mic, read the sentence, then tap stop.",
}: {
  phase: Phase;
  level: number;
  elapsed: number;
  onStart: () => void;
  onStop: () => void;
  idleHint?: string;
}) {
  const recording = phase === "recording";
  const busy = phase === "starting" || phase === "scoring";

  const hint = {
    idle: idleHint,
    starting: "Starting the microphone…",
    recording: `Listening ${clock(elapsed)} · tap to stop`,
    scoring: "Checking your pronunciation…",
    done: "Tap to try again",
    error: "Tap to try again",
  }[phase];

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={recording ? onStop : onStart}
        disabled={busy}
        aria-label={recording ? "Stop recording" : "Start recording"}
        className="relative grid size-20 place-items-center rounded-full shadow-md transition-[transform,background-color] duration-200 active:scale-95 disabled:opacity-80"
        style={{
          background: recording ? "var(--record)" : "var(--accent)",
          color: recording ? "#fff" : "var(--accent-ink)",
        }}
      >
        {recording && (
          <>
            <span className="animate-pulse-ring absolute inset-0 rounded-full bg-record" />
            <span
              className="absolute inset-0 rounded-full bg-record/35 transition-transform duration-75"
              style={{ transform: `scale(${1 + level * 0.5})` }}
            />
          </>
        )}
        <span className="relative">{busy ? <Spinner /> : recording ? <StopIcon size={28} /> : <MicIcon size={30} />}</span>
      </button>
      <p className="text-center text-sm text-ink-2 tabular-nums" aria-live="polite">
        {hint}
      </p>
    </div>
  );
}
