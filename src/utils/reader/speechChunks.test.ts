import { describe, it, expect } from 'vitest';
import { splitSpeechChunks } from './speechChunks';

const tiles = (text: string) => splitSpeechChunks(text).map((c) => c.raw).join('') === text;

describe('splitSpeechChunks', () => {
  it('splits on sentence enders and newlines (whitespace kept as render-only chunks)', () => {
    const chunks = splitSpeechChunks('Hi there. How are you?\nGreat!');
    // spoken chunks are the non-empty speak values; the '\n' survives as a render-only chunk
    expect(chunks.map((c) => c.speak).filter(Boolean)).toEqual([
      'Hi there.',
      'How are you?',
      'Great!',
    ]);
  });

  it('satisfies the tiling invariant (raw slices reconstruct the source)', () => {
    for (const text of [
      'Hi there. How are you?\nGreat!',
      '  leading and   trailing  ',
      'no terminator here',
      'สวัสดี ครับ\nวันนี้อากาศดี',
      'a\n\n\nb',
    ]) {
      expect(tiles(text)).toBe(true);
    }
  });

  it('marks whitespace-only chunks as render-only (speak is empty)', () => {
    const chunks = splitSpeechChunks('A.\n\nB.');
    expect(chunks.some((c) => c.raw.trim() === '' && c.speak === '')).toBe(true);
    // but the source is still fully reconstructed
    expect(tiles('A.\n\nB.')).toBe(true);
  });

  it('returns [] for empty input and a single chunk when there is no boundary', () => {
    expect(splitSpeechChunks('')).toEqual([]);
    expect(splitSpeechChunks('lonely')).toEqual([{ raw: 'lonely', speak: 'lonely' }]);
  });

  it('hard-splits an over-long space-less Thai run while still tiling', () => {
    const longThai = 'กิ่'.repeat(200); // 600 code points, no boundary chars
    const chunks = splitSpeechChunks(longThai);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map((c) => c.raw).join('')).toBe(longThai);
    // no chunk should start with a Thai combining mark (i.e. no orphaned mark)
    expect(chunks.every((c) => !/^[ัิ-ฺ็-๎]/.test(c.raw))).toBe(true);
  });
});
