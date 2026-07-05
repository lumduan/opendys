/**
 * Encode mono PCM to a 16-bit WAV container — the one format the hosted Typhoon ASR API reliably
 * accepts across browsers. (Verified against the live endpoint: `audio/webm;codecs=opus` — Chrome's
 * MediaRecorder default — is rejected 415; `audio/wav` and `audio/ogg;codecs=opus` return 200. See
 * docs/plans/realtime-asr-assessment/PoC/README.md.) Pure + dependency-free so it stays inside the
 * `src/utils/**` coverage gate.
 */

export const WAV_MIME = 'audio/wav';

/** Concatenate Float32 PCM frames (e.g. AudioWorklet render quanta) into a single buffer. */
export function concatFloat32(chunks: Float32Array[]): Float32Array {
  let length = 0;
  for (const chunk of chunks) length += chunk.length;
  const out = new Float32Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/** Encode mono Float32 samples [-1, 1] as a little-endian 16-bit PCM WAV. */
export function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // RIFF chunk size
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size (PCM)
  view.setUint16(20, 1, true); // audio format = PCM
  view.setUint16(22, 1, true); // channels = mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate (mono)
  view.setUint16(32, bytesPerSample, true); // block align (mono)
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += bytesPerSample;
  }
  return buffer;
}
