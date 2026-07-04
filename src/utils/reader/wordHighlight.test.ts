import { describe, it, expect } from 'vitest';
import { rawWordOffset, wordRange } from './wordHighlight';

describe('rawWordOffset', () => {
  it('is identity when raw has no leading whitespace', () => {
    expect(rawWordOffset('เก็บ ดอก', 5)).toBe(5);
  });
  it('adds the leading whitespace that trim() removed', () => {
    expect(rawWordOffset('  เก็บ ดอก', 0)).toBe(2); // spoken index 0 → raw index 2
    expect(rawWordOffset('\n เก็บ', 3)).toBe(5);
  });
});

describe('wordRange', () => {
  it('uses charLength when provided (เก็บ = 4 code units)', () => {
    expect(wordRange('เก็บ ดอก', 0, 4)).toEqual({ start: 0, end: 4 });
  });
  it('extends to the next whitespace when charLength is 0/missing', () => {
    expect(wordRange('เก็บ ดอก', 0, 0)).toEqual({ start: 0, end: 4 }); // stops at the space
    expect(wordRange('เก็บ ดอก', 5, 0)).toEqual({ start: 5, end: 8 }); // ดอก → end of chunk
  });
  it('applies the leading-whitespace correction', () => {
    expect(wordRange('  ดอก', 0, 3)).toEqual({ start: 2, end: 5 });
  });
  it('clamps to raw bounds and reports empty when start is past the end', () => {
    expect(wordRange('ดอก', 0, 999)).toEqual({ start: 0, end: 3 });
    expect(wordRange('ดอก', 10, 0)).toEqual({ start: 3, end: 3 });
  });
});
