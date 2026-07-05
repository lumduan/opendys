import { describe, it, expect } from 'vitest';
import { normalizeToken } from './normalize';

describe('normalizeToken', () => {
  it('NFC-normalizes so a decomposed sequence equals its composed form', () => {
    // 'e' + combining acute (U+0301) → 'é' (U+00E9)
    expect(
      normalizeToken('é', { caseFold: false, stripThaiTones: false, stripPunctuation: false }),
    ).toBe('é');
  });

  it('case-folds and strips edge punctuation by default', () => {
    expect(normalizeToken('Hello,')).toBe('hello');
    expect(normalizeToken('"Quote."')).toBe('quote');
    expect(normalizeToken('(word)')).toBe('word');
  });

  it('strips Thai tone marks by default but keeps the karan silencer', () => {
    expect(normalizeToken('ก่')).toBe('ก'); // ก + mai ek (tone U+0E48) → ก
    expect(normalizeToken('จันทร์')).toContain('์'); // karan (◌์) retained
  });

  it('keeps a trailing Thai combining mark (not treated as edge punctuation)', () => {
    expect(normalizeToken('ก็')).toBe('ก็'); // ก + mai taikhu (upper mark U+0E47) survives
  });

  it('respects caseFold:false', () => {
    expect(normalizeToken('Hello', { caseFold: false })).toBe('Hello');
  });

  it('respects stripThaiTones:false', () => {
    expect(normalizeToken('ก่', { stripThaiTones: false })).toBe('ก่');
  });

  it('respects stripPunctuation:false', () => {
    expect(normalizeToken('hello,', { stripPunctuation: false })).toBe('hello,');
  });

  it('returns empty for pure punctuation / whitespace', () => {
    expect(normalizeToken('!!!')).toBe('');
    expect(normalizeToken('   ')).toBe('');
  });

  it('keeps Thai digits', () => {
    expect(normalizeToken('๕')).toBe('๕');
  });
});
