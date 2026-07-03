import { describe, it, expect } from 'vitest';
import { clusterHasKaran, markSilentConsonants, estimateSyllableFinals } from './karan';

describe('clusterHasKaran', () => {
  it('detects the karan mark within a cluster', () => {
    expect(clusterHasKaran('ษ์')).toBe(true);
    expect(clusterHasKaran('ก')).toBe(false);
  });
});

describe('markSilentConsonants', () => {
  it('flags only the karan-silenced consonant cluster in รักษ์', () => {
    // clusters: รั, ก, ษ์  → only ษ์ is a silenced consonant
    expect(markSilentConsonants('รักษ์')).toEqual([false, false, true]);
  });

  it('returns all false when there is no karan', () => {
    expect(markSilentConsonants('กา')).toEqual([false, false]);
  });
});

describe('estimateSyllableFinals (approximate heuristic)', () => {
  it('marks the last consonant of a multi-consonant chunk', () => {
    // "กบ" → ก initial, บ final coda (index 1)
    expect(estimateSyllableFinals('กบ')).toEqual([1]);
  });

  it('does not mark a single-consonant chunk', () => {
    expect(estimateSyllableFinals('ก')).toEqual([]);
  });

  it('handles multiple whitespace-separated chunks', () => {
    // "กบ ดง" → บ at index 1, ง at index 4
    expect(estimateSyllableFinals('กบ ดง')).toEqual([1, 4]);
  });
});
