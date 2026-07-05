import { describe, it, expect } from 'vitest';
import { asrFilename } from './audio';

describe('asrFilename', () => {
  it('maps the container (not the codec) to an accepted extension', () => {
    expect(asrFilename('audio/wav')).toBe('clip.wav');
    expect(asrFilename('audio/ogg;codecs=opus')).toBe('clip.ogg');
    expect(asrFilename('audio/opus')).toBe('clip.opus');
    expect(asrFilename('audio/flac')).toBe('clip.flac');
    expect(asrFilename('audio/mpeg')).toBe('clip.mp3');
  });

  it('defaults to wav — the universally accepted upload container', () => {
    expect(asrFilename('application/octet-stream')).toBe('clip.wav');
    expect(asrFilename('audio/webm;codecs=opus')).toBe('clip.wav');
  });
});
