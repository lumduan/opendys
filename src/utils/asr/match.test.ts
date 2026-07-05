import { describe, it, expect } from 'vitest';
import { tokensMatch, DEFAULT_MATCH_THRESHOLD } from './match';

describe('tokensMatch', () => {
  it('exposes a 0.7 default threshold', () => {
    expect(DEFAULT_MATCH_THRESHOLD).toBe(0.7);
  });

  it('accepts identical and near-miss tokens at the default threshold', () => {
    expect(tokensMatch('cat', 'cat')).toBe(true);
    expect(tokensMatch('hello', 'helo')).toBe(true); // similarity 0.8
  });

  it('rejects tokens below the default threshold', () => {
    expect(tokensMatch('cat', 'cot')).toBe(false); // similarity ~0.667
    expect(tokensMatch('cat', 'dog')).toBe(false);
  });

  it('honors a custom threshold', () => {
    expect(tokensMatch('cat', 'cot', 0.6)).toBe(true);
    expect(tokensMatch('cat', 'cat', 1)).toBe(true);
  });
});
