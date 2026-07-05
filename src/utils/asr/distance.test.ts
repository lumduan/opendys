import { describe, it, expect } from 'vitest';
import { levenshtein, similarity } from './distance';

describe('levenshtein', () => {
  it('handles empty strings', () => {
    expect(levenshtein('', '')).toBe(0);
    expect(levenshtein('abc', '')).toBe(3);
    expect(levenshtein('', 'abc')).toBe(3);
  });

  it('is 0 for identical strings', () => {
    expect(levenshtein('cat', 'cat')).toBe(0);
  });

  it('counts single-edit differences', () => {
    expect(levenshtein('cat', 'cot')).toBe(1); // substitution
    expect(levenshtein('kitten', 'sitting')).toBe(3);
  });
});

describe('similarity', () => {
  it('treats two empty strings as identical', () => {
    expect(similarity('', '')).toBe(1);
  });

  it('is 0 when one side is empty', () => {
    expect(similarity('abc', '')).toBe(0);
  });

  it('is 1 for identical strings', () => {
    expect(similarity('cat', 'cat')).toBe(1);
  });

  it('normalizes by the longer length', () => {
    expect(similarity('abc', 'abd')).toBeCloseTo(2 / 3, 5);
    expect(similarity('hello', 'helo')).toBeCloseTo(0.8, 5);
  });
});
