import { describe, it, expect } from 'vitest';
import {
  isThai,
  isThaiConsonant,
  isLeadingVowel,
  isFollowingVowel,
  isUpperMark,
  isLowerMark,
  isToneMark,
  isKaran,
  isThaiDigit,
  isThaiCombiningMark,
  THAI_COMBINING_REGEX,
  codePointOf,
} from './thaiChars';

const cp = (ch: string): number => ch.codePointAt(0) ?? -1;

describe('thaiChars predicates', () => {
  it('detects the Thai block boundary', () => {
    expect(isThai(0x0e00)).toBe(true);
    expect(isThai(0x0e7f)).toBe(true);
    expect(isThai(cp('A'))).toBe(false);
  });

  it('classifies consonants', () => {
    expect(isThaiConsonant(cp('ก'))).toBe(true);
    expect(isThaiConsonant(cp('ฮ'))).toBe(true);
    expect(isThaiConsonant(cp('เ'))).toBe(false);
  });

  it('classifies leading and following vowels', () => {
    ['เ', 'แ', 'โ', 'ใ', 'ไ'].forEach((v) => expect(isLeadingVowel(cp(v))).toBe(true));
    ['ะ', 'า', 'ำ', 'ๅ'].forEach((v) => expect(isFollowingVowel(cp(v))).toBe(true));
    expect(isFollowingVowel(cp('ก'))).toBe(false);
  });

  it('classifies upper, lower, tone and karan marks', () => {
    expect(isUpperMark(cp('ิ'))).toBe(true);
    expect(isUpperMark(cp('ั'))).toBe(true);
    expect(isLowerMark(cp('ุ'))).toBe(true);
    expect(isToneMark(cp('่'))).toBe(true);
    expect(isToneMark(cp('๋'))).toBe(true);
    expect(isKaran(cp('์'))).toBe(true);
  });

  it('classifies Thai digits', () => {
    expect(isThaiDigit(cp('๐'))).toBe(true);
    expect(isThaiDigit(cp('๙'))).toBe(true);
    expect(isThaiDigit(cp('9'))).toBe(false);
  });

  it('recognizes any combining mark, matching the regex', () => {
    ['ิ', 'ุ', '่', '์', 'ั'].forEach((m) => {
      expect(isThaiCombiningMark(cp(m))).toBe(true);
      expect(THAI_COMBINING_REGEX.test(m)).toBe(true);
    });
    expect(isThaiCombiningMark(cp('ก'))).toBe(false);
    expect(THAI_COMBINING_REGEX.test('ก')).toBe(false);
  });

  it('codePointOf reads the first code point, 0 for empty', () => {
    expect(codePointOf('ก')).toBe(0x0e01);
    expect(codePointOf('')).toBe(0);
  });
});
