import { describe, it, expect } from 'vitest';
import { alignTokens } from './align';

describe('alignTokens', () => {
  it('marks every token correct on a full match', () => {
    const { status, pairs } = alignTokens(['a', 'b', 'c'], ['a', 'b', 'c']);
    expect(status).toEqual(['correct', 'correct', 'correct']);
    expect(pairs.every((p) => p.op === 'match')).toBe(true);
  });

  it('marks a dropped middle word skipped', () => {
    const { status } = alignTokens(['a', 'b', 'c'], ['a', 'c']);
    expect(status).toEqual(['correct', 'skipped', 'correct']);
  });

  it('treats an extra spoken word as a cost-free insert', () => {
    const { status, pairs } = alignTokens(['a', 'c'], ['a', 'b', 'c']);
    expect(status).toEqual(['correct', 'correct']);
    expect(pairs.some((p) => p.op === 'insert' && p.hypIndex === 1)).toBe(true);
  });

  it('absorbs a stutter/repeat without a false error', () => {
    const { status, pairs } = alignTokens(['a', 'b'], ['a', 'a', 'b']);
    expect(status).toEqual(['correct', 'correct']);
    expect(pairs.filter((p) => p.op === 'insert')).toHaveLength(1);
  });

  it('counts a near-miss as correct but a real difference as mispronounced', () => {
    expect(alignTokens(['hello'], ['helo']).status).toEqual(['correct']); // 0.8 ≥ 0.7
    expect(alignTokens(['cat'], ['dog']).status).toEqual(['mispronounced']);
  });

  it('flags a Thai mid-sentence mispronunciation', () => {
    const { status } = alignTokens(['ก', 'ข', 'ค'], ['ก', 'ง', 'ค']);
    expect(status).toEqual(['correct', 'mispronounced', 'correct']);
  });

  it('marks all skipped for an empty hypothesis', () => {
    const { status, pairs } = alignTokens(['a', 'b'], []);
    expect(status).toEqual(['skipped', 'skipped']);
    expect(pairs.every((p) => p.op === 'delete')).toBe(true);
  });

  it('handles an empty target (all inserts)', () => {
    const { status, pairs } = alignTokens([], ['a']);
    expect(status).toEqual([]);
    expect(pairs).toEqual([{ op: 'insert', targetIndex: null, hypIndex: 0, score: 0 }]);
  });

  it('handles both empty', () => {
    const { status, pairs } = alignTokens([], []);
    expect(status).toEqual([]);
    expect(pairs).toEqual([]);
  });

  it('honors a custom threshold when grading substitutions', () => {
    // similarity('cat','cot') ≈ 0.667 → correct only when threshold drops below it
    expect(alignTokens(['cat'], ['cot'], 0.6).status).toEqual(['correct']);
    expect(alignTokens(['cat'], ['cot'], 0.7).status).toEqual(['mispronounced']);
  });
});
