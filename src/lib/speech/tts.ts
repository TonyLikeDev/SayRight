import { playBlob, stopPlayback, unlockAudio } from "@/lib/audio/player";
import { getSpeechAuth, synthesize } from "./azure";

function speakWithBrowser(text: string, slow: boolean): Promise<void> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = slow ? 0.65 : 0.95;
    const voices = window.speechSynthesis.getVoices().filter((v) => v.lang === "en-US");
    u.voice = voices.find((v) => /natural|samantha|google us/i.test(v.name)) ?? voices[0] ?? null;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

/**
 * Say text in a native American voice. Uses Azure neural voices when a key
 * is configured, the browser's built-in voice in demo mode. Call from a tap.
 */
export async function speak(text: string, { slow = false } = {}): Promise<void> {
  unlockAudio();
  stopPlayback();
  const auth = await getSpeechAuth().catch(() => ({ mode: "demo" }) as const);
  if (auth.mode === "demo") return speakWithBrowser(text, slow);
  const blob = await synthesize(text, slow, auth);
  return playBlob(blob);
}
