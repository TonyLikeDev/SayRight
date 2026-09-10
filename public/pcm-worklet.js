// Collects raw microphone samples and posts them to the main thread in
// small batches (~40 ms), where they are downsampled to 16 kHz PCM.
class PcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buf = new Float32Array(2048);
    this.len = 0;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel) {
      for (let i = 0; i < channel.length; i++) {
        this.buf[this.len++] = channel[i];
        if (this.len === this.buf.length) {
          this.port.postMessage(this.buf);
          this.buf = new Float32Array(2048);
          this.len = 0;
        }
      }
    }
    return true;
  }
}

registerProcessor("pcm-capture", PcmCapture);
