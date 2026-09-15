"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { stopPlayback, unlockAudio } from "@/lib/audio/player";
import { MicRecorder } from "@/lib/audio/recorder";
import { getSpeechAuth, startTranscription, type LiveTranscription } from "@/lib/speech/azure";

/** A pause this long after speaking ends the sentence and stops listening. */
const SILENCE_TIMEOUT_MS = 2500;
/** Stop if nothing at all has been said this long after listening starts. */
const NO_SPEECH_TIMEOUT_MS = 5000;

// Browser Web Speech Recognition interface for demo mode fallback
interface IWindowSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
}

function getBrowserSpeechRecognition(): (new () => IWindowSpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    SpeechRecognition?: new () => IWindowSpeechRecognition;
    webkitSpeechRecognition?: new () => IWindowSpeechRecognition;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

function friendlySpeechError(err: unknown): string {
  const code = (err as { error?: string })?.error || (err as { name?: string })?.name;
  if (code === "not-allowed" || code === "NotAllowedError") {
    return "Microphone permission denied. Allow microphone access in your browser settings.";
  }
  if (code === "no-speech") {
    return "No speech was detected. Please try again.";
  }
  if (code === "audio-capture" || code === "NotFoundError") {
    return "No microphone was found. Please check your audio settings.";
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (/network|1006/i.test(msg)) {
    return "Network error connecting to speech service. Check your connection or Azure Speech key.";
  }
  return msg || "Couldn't capture speech. Please try again.";
}

// Compare what was heard ignoring case and punctuation, so the browser's final
// "Thank you." replacing the interim "thank you" doesn't count as new speech.
function heardWords(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function clearTimer(timer: { current: ReturnType<typeof setTimeout> | null }) {
  if (timer.current) clearTimeout(timer.current);
  timer.current = null;
}

export type UseSpeechInputOptions = {
  onTranscript?: (text: string, isFinal: boolean) => void;
  lang?: string;
};

export function useSpeechInput(options?: UseSpeechInputOptions) {
  const lang = options?.lang || "en-US";
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");

  const onTranscriptRef = useRef(options?.onTranscript);
  useEffect(() => {
    onTranscriptRef.current = options?.onTranscript;
  }, [options?.onTranscript]);

  const activeRecognitionRef = useRef<IWindowSpeechRecognition | null>(null);
  const recorderRef = useRef<MicRecorder | null>(null);
  const liveRef = useRef<Promise<LiveTranscription | null> | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHeardRef = useRef("");

  const stop = useCallback(async () => {
    clearTimer(stopTimerRef);

    // 1. Stop Web Speech if active
    if (activeRecognitionRef.current) {
      try {
        activeRecognitionRef.current.stop();
      } catch {
        // ignore
      }
      activeRecognitionRef.current = null;
    }

    // 2. Stop Azure / MicRecorder if active
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder) {
      try {
        await recorder.stop();
      } catch {
        // ignore
      }
    }

    const livePromise = liveRef.current;
    liveRef.current = null;
    if (livePromise) {
      try {
        const live = await livePromise;
        if (live) {
          const finalResult = await live.finish();
          if (finalResult) {
            setTranscript(finalResult);
            onTranscriptRef.current?.(finalResult, true);
          }
        }
      } catch (err) {
        console.warn("Error finishing transcription:", err);
      }
    }

    setIsListening(false);
  }, []);

  // Stop listening after `ms`, replacing any countdown already running.
  const stopAfter = useCallback(
    (ms: number) => {
      clearTimer(stopTimerRef);
      stopTimerRef.current = setTimeout(() => void stop(), ms);
    },
    [stop],
  );

  // Browser (demo) recognition has no pause length we can set, so new words
  // restart the countdown instead. Called with everything heard so far.
  const noteHeard = useCallback(
    (text: string) => {
      const words = heardWords(text);
      if (!words || words === lastHeardRef.current) return;
      lastHeardRef.current = words;
      // Late results can arrive while stopping; don't restart the countdown then.
      if (activeRecognitionRef.current) stopAfter(SILENCE_TIMEOUT_MS);
    },
    [stopAfter],
  );

  const start = useCallback(async () => {
    if (recorderRef.current || activeRecognitionRef.current) return;
    unlockAudio();
    stopPlayback();
    setError(null);
    setTranscript("");
    lastHeardRef.current = "";

    try {
      const auth = await getSpeechAuth();

      // 1. If Azure Speech is configured, use Azure directly (reliable on localhost and devices)
      if (auth.mode === "azure") {
        const recorder = new MicRecorder();
        recorderRef.current = recorder;
        const stillListening = () => recorderRef.current === recorder;
        const pending: Int16Array[] = [];
        let liveSession: LiveTranscription | null = null;

        recorder.onChunk = (pcm) => {
          if (liveSession) {
            liveSession.write(pcm);
          } else {
            pending.push(pcm);
          }
        };

        // Azure hears the pause in the audio and reports the end of the sentence.
        const sessionPromise = startTranscription(auth, {
          endSilenceMs: SILENCE_TIMEOUT_MS,
          onText: (text) => {
            setTranscript(text);
            onTranscriptRef.current?.(text, false);
            // They've started talking; from here Azure decides when they're done.
            if (text) clearTimer(stopTimerRef);
          },
          onSentenceEnd: () => {
            if (stillListening()) void stop();
          },
        }).then((s) => {
          pending.forEach((pcm) => s.write(pcm));
          pending.length = 0;
          liveSession = s;
          return s;
        });

        liveRef.current = sessionPromise;
        sessionPromise.catch((err) => {
          setError(friendlySpeechError(err));
          setIsListening(false);
        });
        // With no speech at all Azure never ends a sentence, so give up after a while.
        sessionPromise.then(
          () => {
            if (stillListening()) stopAfter(NO_SPEECH_TIMEOUT_MS);
          },
          () => {},
        );

        await recorder.start();
        setIsListening(true);
        return;
      }

      // 2. Demo mode: try browser Web Speech API
      const BrowserSpeech = getBrowserSpeechRecognition();
      if (BrowserSpeech) {
        const recognition = new BrowserSpeech();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = lang;
        recognition.maxAlternatives = 1;

        let accumulatedFinal = "";

        recognition.onstart = () => {
          setIsListening(true);
          stopAfter(NO_SPEECH_TIMEOUT_MS);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const item = event.results[i];
            const text = item[0]?.transcript || "";
            if (item.isFinal) {
              accumulatedFinal += (accumulatedFinal ? " " : "") + text.trim();
            } else {
              interim += text;
            }
          }
          const current = (accumulatedFinal + (interim ? " " + interim : "")).trim();
          if (current) {
            setTranscript(current);
            onTranscriptRef.current?.(current, Boolean(accumulatedFinal && !interim));
            noteHeard(current);
          }
        };

        recognition.onerror = (event: { error: string }) => {
          if (event.error === "no-speech") return;
          setError(friendlySpeechError(event));
          setIsListening(false);
        };

        recognition.onend = () => {
          clearTimer(stopTimerRef);
          setIsListening(false);
          activeRecognitionRef.current = null;
        };

        activeRecognitionRef.current = recognition;
        recognition.start();
        return;
      }

      throw new Error(
        "No Azure Speech key configured and browser speech recognition is not supported in this browser.",
      );
    } catch (err) {
      clearTimer(stopTimerRef);
      setError(friendlySpeechError(err));
      setIsListening(false);
      if (recorderRef.current) {
        void recorderRef.current.stop();
        recorderRef.current = null;
      }
      if (liveRef.current) {
        liveRef.current.then((s) => s?.cancel()).catch(() => {});
        liveRef.current = null;
      }
    }
  }, [lang, stop, stopAfter, noteHeard]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearTimer(stopTimerRef);
      if (activeRecognitionRef.current) {
        try {
          activeRecognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (recorderRef.current) {
        void recorderRef.current.stop();
      }
      if (liveRef.current) {
        liveRef.current.then((s) => s?.cancel()).catch(() => {});
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    error,
    start,
    stop,
    reset: () => {
      setError(null);
      setTranscript("");
    },
  };
}
