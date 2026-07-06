import { describe, it, expect } from 'vitest';
import { splitSpeechChunks } from '@/utils/reader';
import { tokenizeTarget } from './tokenizeTarget';
import { evaluate, joinWindows } from './session';

const targetTokens = () => tokenizeTarget(splitSpeechChunks('the cat sat'));

describe('evaluate', () => {
  it('scores a full correct read', () => {
    const e = evaluate(targetTokens(), 'the cat sat');
    expect(e.status).toEqual(['correct', 'correct', 'correct']);
    expect(e.frontier).toBe(3);
    expect(e.accuracy).toBe(1);
    expect(e.mispronounced).toEqual([]);
    expect(e.skipped).toEqual([]);
  });

  it('leaves not-yet-reached tokens pending and out of the score', () => {
    const e = evaluate(targetTokens(), 'the cat');
    expect(e.status[2]).toBe('pending');
    expect(e.frontier).toBe(2);
    expect(e.accuracy).toBe(1); // 2 correct / 2 reached
    expect(e.skipped).not.toContain('sat');
  });

  it('marks a genuinely skipped interior word', () => {
    const e = evaluate(targetTokens(), 'the sat');
    expect(e.status).toEqual(['correct', 'skipped', 'correct']);
    expect(e.skipped).toEqual(['cat']);
    expect(e.accuracy).toBeCloseTo(2 / 3, 5);
  });

  it('reports a mispronounced token and honors a custom threshold', () => {
    const e = evaluate(targetTokens(), 'the cot sat'); // "cot" ≈ 0.67 vs "cat" → mispronounced
    expect(e.status).toEqual(['correct', 'mispronounced', 'correct']);
    expect(e.mispronounced).toEqual(['cat']);
    // a lower threshold accepts the near-miss as correct
    const lenient = evaluate(targetTokens(), 'the cot sat', 0, { threshold: 0.6 });
    expect(lenient.status).toEqual(['correct', 'correct', 'correct']);
  });

  it('returns all pending with 0 accuracy for an empty hypothesis', () => {
    const e = evaluate(targetTokens(), '');
    expect(e.frontier).toBe(0);
    expect(e.accuracy).toBe(0);
    expect(e.status).toEqual(['pending', 'pending', 'pending']);
    expect(e.skipped).toEqual([]);
  });

  it('keeps the frontier monotonic across windows', () => {
    // A retreating hypothesis must not pull the frontier back.
    const e = evaluate(targetTokens(), 'the', 3);
    expect(e.frontier).toBe(3);
    expect(e.status).toEqual(['correct', 'skipped', 'skipped']);
  });

  it('finalizes with prevFrontier = length to grade the whole passage', () => {
    const tokens = targetTokens();
    const e = evaluate(tokens, 'the cat', tokens.length);
    expect(e.frontier).toBe(3);
    expect(e.skipped).toEqual(['sat']);
    expect(e.accuracy).toBeCloseTo(2 / 3, 5);
  });
});

describe('joinWindows', () => {
  it('joins trimmed, non-empty windows with a space', () => {
    expect(joinWindows(['the ', ' cat', '', 'sat'])).toBe('the cat sat');
  });
  it('collapses all-empty windows to an empty string', () => {
    expect(joinWindows(['', '  '])).toBe('');
  });
});
