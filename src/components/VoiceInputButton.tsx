"use client";

import { useRef } from "react";
import { useSpeechInput } from "@/lib/useSpeechInput";
import { MicIcon, PlusIcon, StopIcon } from "./icons";
import { Spinner } from "./ui";

const BUTTON =
  "inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50";
const IDLE = "border-line bg-surface text-ink hover:border-ink-3 hover:bg-surface-2";

/**
 * Voice typing for a text box. Empty box: "Speak". With text: "Start over"
 * replaces it, "Add more" adds what you say to the end.
 */
export function VoiceInputButton({
  value,
  onChange,
  maxLength = 300,
  disabled = false,
}: {
  /** The text currently in the box. */
  value: string;
  onChange: (text: string) => void;
  maxLength?: number;
  disabled?: boolean;
}) {
  // The text that was in the box when "Add more" was tapped; new words go after it.
  const baseRef = useRef("");
  const { isStarting, isListening, error, start, stop } = useSpeechInput({
    onTranscript: (spoken) => {
      const base = baseRef.current;
      onChange((base ? `${base} ${spoken}` : spoken).slice(0, maxLength));
    },
  });

  const begin = (append: boolean) => {
    baseRef.current = append ? value.trim() : "";
    start();
  };

  const hasText = value.trim().length > 0;

  return (
    <div className="flex flex-col items-start">
      <div className="flex flex-wrap gap-2">
        {isStarting ? (
          <button type="button" disabled className={`${BUTTON} ${IDLE}`}>
            <Spinner />
            Starting…
          </button>
        ) : isListening ? (
          <button
            type="button"
            onClick={() => void stop()}
            aria-pressed
            aria-label="Stop listening"
            className={`${BUTTON} border-bad bg-bad/10 text-bad`}
          >
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bad opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-bad" />
            </span>
            <StopIcon size={16} />
            <span>Listening...</span>
          </button>
        ) : hasText ? (
          <>
            <button
              type="button"
              onClick={() => begin(false)}
              disabled={disabled}
              aria-label="Start over: replace the text with what you say"
              className={`${BUTTON} ${IDLE}`}
            >
              <MicIcon size={18} />
              Start over
            </button>
            <button
              type="button"
              onClick={() => begin(true)}
              disabled={disabled || value.length >= maxLength}
              aria-label="Add more: add what you say to the end of the text"
              className={`${BUTTON} ${IDLE}`}
            >
              <PlusIcon size={18} />
              Add more
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => begin(false)}
            disabled={disabled}
            aria-label="Speak your sentence"
            className={`${BUTTON} ${IDLE}`}
          >
            <MicIcon size={18} />
            Speak
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-bad">
          {error}
        </p>
      )}
    </div>
  );
}
