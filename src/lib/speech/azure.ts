import type * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";
import type { AzSegment } from "./types";

export type SpeechAuth = { mode: "azure"; token: string; region: string } | { mode: "demo" };

let cachedAuth: { auth: SpeechAuth; expires: number } | null = null;
let sdkPromise: Promise<typeof SpeechSDK> | null = null;

export const VOICE = "en-US-AvaNeural";

/** Short-lived Azure token from our server (the key never reaches the browser). */
export async function getSpeechAuth(): Promise<SpeechAuth> {
  if (cachedAuth && cachedAuth.expires > Date.now()) return cachedAuth.auth;
  const res = await fetch("/api/speech-token", { cache: "no-store" });
  if (res.status === 401) throw new Error("Your sign-in expired. Reload the page to sign in again.");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Couldn't reach the speech service.");
  // Azure tokens last 10 minutes; refresh a little early.
  cachedAuth = { auth: data as SpeechAuth, expires: Date.now() + (data.mode === "azure" ? 8 : 60) * 60_000 };
  return cachedAuth.auth;
}

/** The token we already have, if it's still valid (no network request). */
export function peekSpeechAuth(): SpeechAuth | null {
  return cachedAuth && cachedAuth.expires > Date.now() ? cachedAuth.auth : null;
}

export function loadSdk() {
  sdkPromise ??= import("microsoft-cognitiveservices-speech-sdk");
  return sdkPromise;
}

export type LiveAssessment = {
  write(pcm: Int16Array): void;
  /** Close the audio stream and wait for the final results. */
  finish(): Promise<AzSegment[]>;
  cancel(): void;
};

/**
 * Start a streaming pronunciation assessment. Pass the sentence the learner
 * is reading, or null for free speech (conversation mode).
 */
export async function startAssessment(
  referenceText: string | null,
  auth: Extract<SpeechAuth, { mode: "azure" }>,
): Promise<LiveAssessment> {
  const sdk = await loadSdk();
  const format = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
  const push = sdk.AudioInputStream.createPushStream(format);

  const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(auth.token, auth.region);
  speechConfig.speechRecognitionLanguage = "en-US";
  // Allow short hesitations without splitting the sentence into pieces.
  speechConfig.setProperty(sdk.PropertyId.Speech_SegmentationSilenceTimeoutMs, referenceText ? "1500" : "1000");

  const recognizer = new sdk.SpeechRecognizer(speechConfig, sdk.AudioConfig.fromStreamInput(push));
  const pa = new sdk.PronunciationAssessmentConfig(
    referenceText ?? "",
    sdk.PronunciationAssessmentGradingSystem.HundredMark,
    sdk.PronunciationAssessmentGranularity.Phoneme,
    referenceText != null,
  );
  pa.phonemeAlphabet = "IPA";
  pa.nbestPhonemeCount = 3;
  pa.enableProsodyAssessment = true;
  pa.applyTo(recognizer);

  const segments: AzSegment[] = [];
  let failure: string | null = null;
  let markStopped!: () => void;
  const stopped = new Promise<void>((resolve) => (markStopped = resolve));

  recognizer.recognized = (_s, e) => {
    if (e.result.reason !== sdk.ResultReason.RecognizedSpeech) return;
    const json = e.result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult);
    if (json) segments.push(JSON.parse(json) as AzSegment);
  };
  recognizer.canceled = (_s, e) => {
    if (e.reason === sdk.CancellationReason.Error) failure = e.errorDetails;
    markStopped();
  };
  recognizer.sessionStopped = () => markStopped();

  await new Promise<void>((resolve, reject) => recognizer.startContinuousRecognitionAsync(resolve, reject));

  const close = () =>
    new Promise<void>((resolve) =>
      recognizer.stopContinuousRecognitionAsync(
        () => {
          recognizer.close();
          resolve();
        },
        () => {
          recognizer.close();
          resolve();
        },
      ),
    );

  return {
    write(pcm) {
      push.write(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength) as ArrayBuffer);
    },
    async finish() {
      push.close();
      await Promise.race([stopped, new Promise((r) => setTimeout(r, 20_000))]);
      await close();
      if (failure && !segments.length) throw new Error(failure);
      return segments;
    },
    cancel() {
      push.close();
      void close();
    },
  };
}

export type LiveTranscription = {
  write(pcm: Int16Array): void;
  finish(): Promise<string>;
  cancel(): void;
};

/**
 * Start streaming speech-to-text transcription without pronunciation scoring.
 * Azure decides where a sentence ends from the pause in the audio itself.
 */
export async function startTranscription(
  auth: Extract<SpeechAuth, { mode: "azure" }>,
  {
    onText,
    onSentenceEnd,
    onError,
    endSilenceMs = 1500,
  }: {
    /** Everything heard so far, updated as words come in. */
    onText?: (text: string) => void;
    /** Called once `endSilenceMs` of silence follows speech. */
    onSentenceEnd?: () => void;
    /** The connection failed (expired token, no network). */
    onError?: (message: string) => void;
    /** Pause that ends a sentence (Azure allows 100–5000 ms). */
    endSilenceMs?: number;
  } = {},
): Promise<LiveTranscription> {
  const sdk = await loadSdk();
  const format = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
  const push = sdk.AudioInputStream.createPushStream(format);

  const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(auth.token, auth.region);
  speechConfig.speechRecognitionLanguage = "en-US";
  speechConfig.setProperty(sdk.PropertyId.Speech_SegmentationSilenceTimeoutMs, String(endSilenceMs));

  const recognizer = new sdk.SpeechRecognizer(speechConfig, sdk.AudioConfig.fromStreamInput(push));

  let finalTranscript = "";
  let failure: string | null = null;
  let markStopped!: () => void;
  const stopped = new Promise<void>((resolve) => (markStopped = resolve));

  recognizer.recognizing = (_s, e) => {
    if (e.result.reason === sdk.ResultReason.RecognizingSpeech && e.result.text) {
      const interim = (finalTranscript + (finalTranscript ? " " : "") + e.result.text).trim();
      onText?.(interim);
    }
  };

  recognizer.recognized = (_s, e) => {
    if (e.result.reason === sdk.ResultReason.RecognizedSpeech && e.result.text) {
      finalTranscript = (finalTranscript + (finalTranscript ? " " : "") + e.result.text).trim();
      onText?.(finalTranscript);
      onSentenceEnd?.();
    }
  };

  recognizer.canceled = (_s, e) => {
    if (e.reason === sdk.CancellationReason.Error) {
      failure = e.errorDetails;
      onError?.(e.errorDetails);
    }
    markStopped();
  };

  recognizer.sessionStopped = () => markStopped();

  await new Promise<void>((resolve, reject) => recognizer.startContinuousRecognitionAsync(resolve, reject));

  const close = () =>
    new Promise<void>((resolve) =>
      recognizer.stopContinuousRecognitionAsync(
        () => {
          recognizer.close();
          resolve();
        },
        () => {
          recognizer.close();
          resolve();
        },
      ),
    );

  return {
    write(pcm) {
      push.write(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength) as ArrayBuffer);
    },
    async finish() {
      push.close();
      await Promise.race([stopped, new Promise((r) => setTimeout(r, 15_000))]);
      await close();
      if (failure && !finalTranscript) throw new Error(failure);
      return finalTranscript;
    },
    cancel() {
      push.close();
      void close();
    },
  };
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
}

const ttsCache = new Map<string, Blob>();

/** Natural-voice audio (MP3) for a sentence or a single word. */
export async function synthesize(
  text: string,
  slow: boolean,
  auth: Extract<SpeechAuth, { mode: "azure" }>,
): Promise<Blob> {
  const key = `${slow ? "slow" : "normal"}|${text}`;
  const hit = ttsCache.get(key);
  if (hit) return hit;

  const sdk = await loadSdk();
  const config = sdk.SpeechConfig.fromAuthorizationToken(auth.token, auth.region);
  config.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;
  const synth = new sdk.SpeechSynthesizer(config, null);
  const ssml =
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">` +
    `<voice name="${VOICE}"><prosody rate="${slow ? "-35%" : "0%"}">${escapeXml(text)}</prosody></voice></speak>`;
  try {
    const result = await new Promise<SpeechSDK.SpeechSynthesisResult>((resolve, reject) =>
      synth.speakSsmlAsync(ssml, resolve, reject),
    );
    if (result.reason !== sdk.ResultReason.SynthesizingAudioCompleted) {
      throw new Error(result.errorDetails || "Speech synthesis failed.");
    }
    const blob = new Blob([result.audioData], { type: "audio/mpeg" });
    ttsCache.set(key, blob);
    return blob;
  } finally {
    synth.close();
  }
}
