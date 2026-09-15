"use client";

import { useSpeechInput } from "@/lib/useSpeechInput";
import { MicIcon, StopIcon } from "./icons";

export function VoiceInputButton({
  onTranscript,
  className = "",
  disabled = false,
}: {
  onTranscript: (text: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const { isListening, error, start, stop } = useSpeechInput({
    onTranscript: (text) => {
      onTranscript(text);
    },
  });

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isListening) {
      void stop();
    } else {
      void start();
    }
  };

  return (
    <div className="flex flex-col items-start">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-pressed={isListening}
        aria-label={isListening ? "Stop listening" : "Speak sentence"}
        className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50 ${
          isListening
            ? "border-bad bg-bad/10 text-bad"
            : "border-line bg-surface text-ink hover:bg-surface-2 hover:border-ink-3"
        } ${className}`}
      >
        {isListening ? (
          <>
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bad opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-bad" />
            </span>
            <StopIcon size={16} />
            <span>Listening...</span>
          </>
        ) : (
          <>
            <MicIcon size={18} />
            <span>Speak</span>
          </>
        )}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-bad">
          {error}
        </p>
      )}
    </div>
  );
}
