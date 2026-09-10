"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MicRecorder } from "@/lib/audio/recorder";
import { SAMPLE_RATE } from "@/lib/audio/wav";
import { stopPlayback, unlockAudio } from "@/lib/audio/player";
import { getSpeechAuth, loadSdk, startAssessment, type LiveAssessment } from "@/lib/speech/azure";
import { buildScripted, buildUnscripted, NoSpeechError } from "@/lib/speech/normalize";
import { mockAssessment } from "@/lib/speech/mock";
import { fetchIpa } from "@/lib/useIpa";
import type { Assessment } from "@/lib/speech/types";

export type Phase = "idle" | "starting" | "recording" | "scoring" | "done" | "error";

// What demo mode pretends you said in conversation mode.
const DEMO_ANSWER = "I usually wake up early and make a cup of coffee before I start work.";

function friendlyError(err: unknown): string {
  if (err instanceof NoSpeechError) return err.message;
  const name = (err as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again.";
  }
  if (name === "NotFoundError") return "No microphone found. Plug one in or check your system settings.";
  const message = err instanceof Error ? err.message : String(err);
  if (/1006|websocket|network/i.test(message)) return "Couldn't reach the speech service. Check your connection and try again.";
  return message || "Something went wrong. Please try again.";
}

/**
 * Record the learner and score their pronunciation. Audio streams to Azure
 * while they speak, so results arrive a moment after they stop.
 *
 * @param referenceText the sentence to read, or null for free speech
 * @param maxSeconds    recording stops by itself after this long
 */
export function useAssessment(referenceText: string | null, maxSeconds = referenceText ? 30 : 90) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<Assessment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState<Int16Array | null>(null);

  const recorderRef = useRef<MicRecorder | null>(null);
  const sessionRef = useRef<Promise<LiveAssessment | null> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopRef = useRef<() => void>(() => {});

  // Warm up the token and SDK so the first tap on the mic is instant.
  useEffect(() => {
    getSpeechAuth()
      .then((auth) => (auth.mode === "azure" ? loadSdk() : null))
      .catch(() => {});
  }, []);

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const reset = useCallback(() => {
    setPhase("idle");
    setResult(null);
    setError(null);
    setRecording(null);
    setLevel(0);
    setElapsed(0);
  }, []);

  const stop = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorderRef.current = null;
    clearTimer();
    setPhase("scoring");
    setLevel(0);
    try {
      const samples = await recorder.stop();
      setRecording(samples);
      const durationMs = (samples.length / SAMPLE_RATE) * 1000;
      const live = await sessionRef.current;
      if (durationMs < 600) {
        live?.cancel();
        throw new Error("That was too short. Tap the mic, say the whole sentence, then tap stop.");
      }
      let assessment: Assessment;
      if (live) {
        const segments = await live.finish();
        assessment = referenceText != null ? buildScripted(referenceText, segments) : buildUnscripted(segments);
      } else {
        const words = await fetchIpa(referenceText ?? DEMO_ANSWER);
        assessment = mockAssessment(words, durationMs, referenceText != null);
      }
      setResult(assessment);
      setPhase("done");
    } catch (err) {
      setError(friendlyError(err));
      setPhase("error");
    }
  }, [referenceText]);

  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  const start = useCallback(async () => {
    if (recorderRef.current) return;
    unlockAudio();
    stopPlayback();
    setResult(null);
    setError(null);
    setRecording(null);
    setElapsed(0);
    setPhase("starting");

    const recorder = new MicRecorder();
    recorderRef.current = recorder;
    const pending: Int16Array[] = [];
    let live: LiveAssessment | null = null;
    recorder.onChunk = (pcm) => (live ? live.write(pcm) : pending.push(pcm));
    recorder.onLevel = setLevel;

    // Connect to Azure while the mic starts; audio captured meanwhile is queued.
    const session = getSpeechAuth().then(async (auth) => {
      if (auth.mode !== "azure") return null;
      const s = await startAssessment(referenceText, auth);
      pending.forEach((pcm) => s.write(pcm));
      pending.length = 0;
      live = s;
      return s;
    });
    sessionRef.current = session;
    session.catch(() => {});

    try {
      await recorder.start();
    } catch (err) {
      recorderRef.current = null;
      session.then((s) => s?.cancel()).catch(() => {});
      setError(friendlyError(err));
      setPhase("error");
      return;
    }
    setPhase("recording");
    const began = Date.now();
    timerRef.current = setInterval(() => {
      const secs = (Date.now() - began) / 1000;
      setElapsed(secs);
      if (secs >= maxSeconds) void stopRef.current();
    }, 200);
  }, [referenceText, maxSeconds]);

  // Release the mic if the learner leaves mid-recording.
  useEffect(
    () => () => {
      clearTimer();
      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (recorder) {
        void recorder.stop();
        sessionRef.current?.then((s) => s?.cancel()).catch(() => {});
      }
    },
    [],
  );

  return { phase, level, elapsed, maxSeconds, result, error, recording, start, stop, reset };
}
