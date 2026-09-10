export const SAMPLE_RATE = 16000;

/** Wrap 16-bit mono PCM in a WAV container so the browser can play it. */
export function encodeWav(samples: Int16Array, sampleRate = SAMPLE_RATE): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const text = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples.length * 2, true);
  new Int16Array(buffer, 44).set(samples);
  return new Blob([buffer], { type: "audio/wav" });
}

/** Cut a piece of a recording (with a little padding so words aren't clipped). */
export function sliceRecording(samples: Int16Array, startMs: number, endMs: number, padMs = 80): Int16Array {
  const perMs = SAMPLE_RATE / 1000;
  const start = Math.max(0, Math.floor((startMs - padMs) * perMs));
  const end = Math.min(samples.length, Math.ceil((endMs + padMs) * perMs));
  return samples.slice(start, end);
}
