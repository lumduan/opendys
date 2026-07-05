import { describe, it, expect } from 'vitest';
import { concatFloat32, encodeWav, WAV_MIME } from './wav';

const ascii = (view: DataView, offset: number, length: number) =>
  Array.from({ length }, (_, i) => String.fromCharCode(view.getUint8(offset + i))).join('');

describe('concatFloat32', () => {
  it('concatenates frames in order', () => {
    const out = concatFloat32([new Float32Array([1, 2]), new Float32Array([3]), new Float32Array([])]);
    expect(Array.from(out)).toEqual([1, 2, 3]);
  });
  it('returns an empty buffer for no frames', () => {
    expect(concatFloat32([]).length).toBe(0);
  });
});

describe('encodeWav', () => {
  it('writes a valid mono 16-bit PCM header', () => {
    const buffer = encodeWav(new Float32Array([0, 0, 0, 0]), 16000);
    const view = new DataView(buffer);
    expect(ascii(view, 0, 4)).toBe('RIFF');
    expect(ascii(view, 8, 4)).toBe('WAVE');
    expect(ascii(view, 12, 4)).toBe('fmt ');
    expect(ascii(view, 36, 4)).toBe('data');
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(16000); // sample rate
    expect(view.getUint16(34, true)).toBe(16); // bits per sample
    expect(view.getUint32(40, true)).toBe(8); // data size = 4 samples × 2 bytes
    expect(buffer.byteLength).toBe(44 + 8);
  });

  it('quantizes samples and clamps out-of-range values', () => {
    const view = new DataView(encodeWav(new Float32Array([0, 1, -1, 2, -2]), 16000));
    expect(view.getInt16(44, true)).toBe(0);
    expect(view.getInt16(46, true)).toBe(0x7fff); // +1.0
    expect(view.getInt16(48, true)).toBe(-0x8000); // -1.0
    expect(view.getInt16(50, true)).toBe(0x7fff); // clamp +2 → +1.0
    expect(view.getInt16(52, true)).toBe(-0x8000); // clamp -2 → -1.0
  });

  it('produces a 44-byte header for empty input', () => {
    expect(encodeWav(new Float32Array([]), 48000).byteLength).toBe(44);
  });

  it('exposes the accepted upload MIME', () => {
    expect(WAV_MIME).toBe('audio/wav');
  });
});
