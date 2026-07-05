// AudioWorklet processor for the ASR reading-assessment feature (Phase 8).
//
// Forwards mono microphone PCM (Float32, one render quantum per call) to the main thread, which buffers
// it per capture window and encodes a WAV upload. Self-hosted (served same-origin) so it satisfies the
// strict `script-src 'self'` CSP without a `blob:` allowance. Outputs nothing — the node is connected to
// the destination only so the graph pulls input; copying input to output would echo the mic (feedback).
class AsrRecorderProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel && channel.length) {
      // Copy: the engine recycles the underlying buffer after process() returns.
      this.port.postMessage(channel.slice(0));
    }
    return true;
  }
}

registerProcessor('asr-recorder', AsrRecorderProcessor);
