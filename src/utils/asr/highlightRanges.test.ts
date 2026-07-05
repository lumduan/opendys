import { describe, it, expect } from 'vitest';
import type { TargetToken, TokenStatus } from './types';
import { highlightGroups } from './highlightRanges';

const tok = (charIndex: number): TargetToken => ({
  chunkIndex: 0,
  charIndex,
  charLength: 1,
  text: 'x',
  norm: 'x',
  script: 'latin',
});

describe('highlightGroups', () => {
  it('buckets correct → green, error → red, frontier → current, pending → omitted', () => {
    const tokens = [tok(0), tok(1), tok(2)];
    const status: TokenStatus[] = ['correct', 'mispronounced', 'pending'];
    const g = highlightGroups(tokens, status, 2);
    expect(g['asr-correct']).toEqual([{ chunkIndex: 0, charIndex: 0, charLength: 1 }]);
    expect(g['asr-error']).toEqual([{ chunkIndex: 0, charIndex: 1, charLength: 1 }]);
    expect(g['asr-current']).toEqual([{ chunkIndex: 0, charIndex: 2, charLength: 1 }]);
  });

  it('routes skipped tokens to the error group', () => {
    const g = highlightGroups([tok(0)], ['skipped'], 1);
    expect(g['asr-error']).toHaveLength(1);
    expect(g['asr-current']).toHaveLength(0); // frontier === length → no cursor
  });

  it('emits no current cue once the frontier reaches the end', () => {
    const g = highlightGroups([tok(0)], ['correct'], 1);
    expect(g['asr-correct']).toHaveLength(1);
    expect(g['asr-current']).toHaveLength(0);
  });
});
