import { describe, it, expect } from 'vitest';
import { alignTokens } from './align';
import { readingFrontier } from './frontier';

const frontierOf = (target: string[], hyp: string[]) => readingFrontier(alignTokens(target, hyp).pairs);

describe('readingFrontier', () => {
  it('is 0 when nothing was read', () => {
    expect(frontierOf(['a', 'b'], [])).toBe(0);
  });

  it('reaches the end on a full read', () => {
    expect(frontierOf(['a', 'b'], ['a', 'b'])).toBe(2);
  });

  it('stops before an unread trailing token', () => {
    // read "a b" of "a b c" → frontier 2, so c stays pending (not skipped)
    expect(frontierOf(['a', 'b', 'c'], ['a', 'b'])).toBe(2);
  });

  it('advances past an interior gap when a later token is reached', () => {
    // read "a c" of "a b c" → last reached is index 2 → frontier 3
    expect(frontierOf(['a', 'b', 'c'], ['a', 'c'])).toBe(3);
  });

  it('advances on a mispronounced (substituted) token — it was still reached', () => {
    expect(frontierOf(['a', 'b'], ['a', 'zzz'])).toBe(2);
  });
});
