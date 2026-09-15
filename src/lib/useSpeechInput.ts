"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { stopPlayback, unlockAudio } from "@/lib/audio/player";
import { MicRecorder } from "@/lib/audio/recorder";
import { getSpeechAuth, peekSpeechAuth, startTranscription, type LiveTranscription } from "@/lib/speech/azure";

/** A pause this long after speaking ends the sentence and stops listening. */
const SILENCE_TIMEOUT_MS = 2500;
/** Stop if nothing at all has been said this long after listening starts. */
const NO_SPEECH_TIMEOUT_MS = 5000;
const NOTHING_HEARD = "Didn't catch that. Tap and try again.";

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
  const [isStarting, setIsStarting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");

  const onTranscriptRef = useRef(options?.onTranscript);
  useEffect(() => {
    onTranscriptRef.current = options?.onTranscript;
  }, [options?.onTranscript]);

  // True from the tap until everything has shut down, so a second tap can't
  // open a second microphone.
  const busyRef = useRef(false);
  const activeRecognitionRef = useRef<IWindowSpeechRecognition | null>(null);
  const recorderRef = useRef<MicRecorder | null>(null);
  const liveRef = useRef<Promise<LiveTranscription | null> | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHeardRef = useRef("");

  // Get the token early, so the first tap starts instantly and we already
  // know whether Azure is set up.
  useEffect(() => {
    getSpeechAuth().catch(() => {});
  }, []);

  const settle = useCallback(() => {
    busyRef.current = false;
    setIsStarting(false);
    setIsListening(false);
  }, []);

  // Stop listening and keep what was heard.
  const stop = useCallback(async () => {
    clearTimer(stopTimerRef);

    if (activeRecognitionRef.current) {
      try {
        activeRecognitionRef.current.stop();
      } catch {
        // already stopped
      }
      activeRecognitionRef.current = null;
    }

    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder) await recorder.stop().catch(() => undefined);

    const livePromise = liveRef.current;
    liveRef.current = null;
    if (livePromise) {
      try {
        const live = await livePromise;
        const finalResult = live ? await live.finish() : "";
        if (finalResult) {
          setTranscript(finalResult);
          onTranscriptRef.current?.(finalResult, true);
        } else {
          setError(NOTHING_HEARD);
        }
      } catch (err) {
        setError(friendlySpeechError(err));
      }
    }

    settle();
  }, [settle]);

  // Shut everything down without waiting for a result (errors, leaving the page).
  const abort = useCallback(() => {
    clearTimer(stopTimerRef);
    try {
      activeRecognitionRef.current?.abort();
    } catch {
      // already stopped
    }
    activeRecognitionRef.current = null;
    const recorder = recorderRef.current;
    recorderRef.current = null;
    recorder?.stop().catch(() => undefined);
    const live = liveRef.current;
    liveRef.current = null;
    live?.then((s) => s?.cancel()).catch(() => {});
    settle();
  }, [settle]);

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

  const start = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    unlockAudio();
    stopPlayback();
    setError(null);
    setTranscript("");
    lastHeardRef.current = "";
    setIsStarting(true);

    const fail = (err: unknown) => {
      setError(friendlySpeechError(err));
      abort();
    };

    // Demo mode (no Azure key): the browser's own speech recognition.
    const startBrowser = () => {
      const BrowserSpeech = getBrowserSpeechRecognition();
      if (!BrowserSpeech) {
        fail(new Error("No Azure Speech key configured and browser speech recognition is not supported in this browser."));
        return;
      }
      const recognition = new BrowserSpeech();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;
      recognition.maxAlternatives = 1;

      let accumulatedFinal = "";
      let heardAny = false;
      let failed = false;

      recognition.onstart = () => {
        setIsStarting(false);
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
          heardAny = true;
          setTranscript(current);
          onTranscriptRef.current?.(current, Boolean(accumulatedFinal && !interim));
          noteHeard(current);
        }
      };

      recognition.onerror = (event: { error: string }) => {
        if (event.error === "no-speech") return;
        failed = true;
        fail(event);
      };

      recognition.onend = () => {
        if (!heardAny && !failed) setError(NOTHING_HEARD);
        // The browser ended it on its own (not via stop()): tidy up.
        if (activeRecognitionRef.current === recognition) {
          activeRecognitionRef.current = null;
          clearTimer(stopTimerRef);
          settle();
        }
      };

      activeRecognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (err) {
        fail(err);
      }
    };

    if (peekSpeechAuth()?.mode === "demo") {
      startBrowser();
      return;
    }

    // Start the mic right here in the tap, before any network wait: iPhone
    // Safari only allows audio that starts directly from a tap.
    const recorder = new MicRecorder();
    recorderRef.current = recorder;
    const stillListening = () => recorderRef.current === recorder;
    const pending: Int16Array[] = [];
    let session: LiveTranscription | null = null;
    recorder.onChunk = (pcm) => {
      if (session) session.write(pcm);
      else pending.push(pcm);
    };
    const micStarted = recorder.start();

    const sessionPromise = getSpeechAuth().then(async (auth) => {
      if (auth.mode !== "azure") return null;
      // Azure hears the pause in the audio and reports the end of the sentence.
      const s = await startTranscription(auth, {
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
        onError: (message) => {
          if (stillListening()) fail(new Error(message));
        },
      });
      pending.forEach((pcm) => s.write(pcm));
      pending.length = 0;
      session = s;
      return s;
    });
    liveRef.current = sessionPromise;

    micStarted.then(
      () => {
        if (!stillListening()) return;
        setIsStarting(false);
        setIsListening(true);
      },
      (err) => {
        if (stillListening()) fail(err);
      },
    );

    sessionPromise.then(
      (s) => {
        if (!stillListening()) return;
        if (!s) {
          // No Azure key after all: hand over to the browser's recognizer.
          recorderRef.current = null;
          liveRef.current = null;
          void recorder.stop();
          startBrowser();
          return;
        }
        // With no speech at all Azure never ends a sentence, so give up after a
        // while, counted once both the mic and Azure are ready.
        micStarted.then(
          () => {
            if (stillListening()) stopAfter(NO_SPEECH_TIMEOUT_MS);
          },
          () => {},
        );
      },
      (err) => {
        if (stillListening()) fail(err);
      },
    );
  }, [lang, abort, settle, stop, stopAfter, noteHeard]);

  // Release the mic if the page goes away mid-recording.
  useEffect(() => () => abort(), [abort]);

  return {
    isStarting,
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
