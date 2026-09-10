// One shared <audio> element for every sound in the app. iOS only lets a page
// start audio from inside a tap, so the element is "unlocked" on the first tap
// and reused afterwards, even when the sound arrives after a network request.

const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";

let element: HTMLAudioElement | null = null;
let unlocked = false;
let currentUrl: string | null = null;
let settle: (() => void) | null = null;

function audio(): HTMLAudioElement {
  element ??= new Audio();
  return element;
}

export function unlockAudio() {
  if (unlocked || typeof window === "undefined") return;
  unlocked = true;
  const a = audio();
  a.src = SILENT_WAV;
  a.play().catch(() => {
    unlocked = false;
  });
}

export function stopPlayback() {
  if (element) {
    element.pause();
    element.onended = null;
    element.onerror = null;
  }
  if (currentUrl) URL.revokeObjectURL(currentUrl);
  currentUrl = null;
  settle?.();
  settle = null;
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

/** Play a blob; resolves when playback ends or is interrupted. */
export function playBlob(blob: Blob, rate = 1): Promise<void> {
  stopPlayback();
  const a = audio();
  const url = URL.createObjectURL(blob);
  currentUrl = url;
  a.src = url;
  a.playbackRate = rate;
  return new Promise((resolve) => {
    settle = resolve;
    const done = () => {
      if (settle === resolve) settle = null;
      resolve();
    };
    a.onended = done;
    a.onerror = done;
    a.play().catch(done);
  });
}
