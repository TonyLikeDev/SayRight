import { SAMPLE_RATE } from "./wav";

/**
 * Captures the microphone as 16 kHz 16-bit mono PCM — the format Azure
 * expects — while keeping the whole take so the learner can replay it.
 */
export class MicRecorder {
  onChunk?: (pcm: Int16Array) => void;
  /** 0..1 loudness, for the level meter */
  onLevel?: (level: number) => void;

  private ctx?: AudioContext;
  private stream?: MediaStream;
  private source?: MediaStreamAudioSourceNode;
  private node?: AudioWorkletNode;
  private chunks: Int16Array[] = [];
  private carry = new Float32Array(0);
  private ratio = 1;

  async start() {
    // Create the context synchronously inside the tap; iOS requires it.
    const ctx = new AudioContext();
    this.ctx = ctx;
    const resumed = ctx.resume();
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      await resumed;
      await ctx.audioWorklet.addModule("/pcm-worklet.js");
    } catch (err) {
      await this.release();
      throw err;
    }
    this.ratio = ctx.sampleRate / SAMPLE_RATE;
    this.source = ctx.createMediaStreamSource(this.stream);
    this.node = new AudioWorkletNode(ctx, "pcm-capture");
    this.node.port.onmessage = (e: MessageEvent<Float32Array>) => this.handle(e.data);
    this.source.connect(this.node);
    // The worklet writes no output, so this is silent; it just keeps the node running.
    this.node.connect(ctx.destination);
  }

  async stop(): Promise<Int16Array> {
    await this.release();
    const total = this.chunks.reduce((n, c) => n + c.length, 0);
    const samples = new Int16Array(total);
    let offset = 0;
    for (const c of this.chunks) {
      samples.set(c, offset);
      offset += c.length;
    }
    this.chunks = [];
    return samples;
  }

  private async release() {
    if (this.node) this.node.port.onmessage = null;
    this.source?.disconnect();
    this.node?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    if (this.ctx && this.ctx.state !== "closed") await this.ctx.close();
    this.source = undefined;
    this.node = undefined;
    this.stream = undefined;
    this.ctx = undefined;
  }

  private handle(input: Float32Array) {
    const data = new Float32Array(this.carry.length + input.length);
    data.set(this.carry);
    data.set(input, this.carry.length);

    const outLen = Math.floor(data.length / this.ratio);
    const out = new Int16Array(outLen);
    let sumSq = 0;
    for (let i = 0; i < outLen; i++) {
      // Average the input samples that fall into this output sample (cheap low-pass).
      const start = Math.floor(i * this.ratio);
      const end = Math.min(data.length, Math.max(start + 1, Math.floor((i + 1) * this.ratio)));
      let sum = 0;
      for (let j = start; j < end; j++) sum += data[j];
      const s = Math.max(-1, Math.min(1, sum / (end - start)));
      sumSq += s * s;
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    this.carry = data.slice(Math.floor(outLen * this.ratio));

    if (!outLen) return;
    this.chunks.push(out);
    this.onChunk?.(out);
    this.onLevel?.(Math.min(1, Math.sqrt(sumSq / outLen) * 5));
  }
}
