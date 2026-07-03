import {
  isThaiConsonant,
  isLeadingVowel,
  isFollowingVowel,
  isUpperMark,
  isLowerMark,
  isToneMark,
  isKaran,
  isThaiDigit,
} from './thaiChars';

/** The four vertical rendering levels of Thai orthography, plus the baseline. */
export type ThaiLevel = 'below' | 'base' | 'above' | 'top';

export type ThaiCategory =
  | 'consonant'
  | 'leadingVowel'
  | 'followingVowel'
  | 'upperVowel'
  | 'lowerVowel'
  | 'toneMark'
  | 'karan'
  | 'thaiDigit'
  | 'other';

export interface ThaiCharInfo {
  category: ThaiCategory;
  level: ThaiLevel;
}

/**
 * Classify a single code point into its orthographic category and vertical level.
 * Non-Thai code points (Latin, punctuation, whitespace, symbols) return `other` / `base`.
 */
export function classifyThaiChar(cp: number): ThaiCharInfo {
  if (isThaiConsonant(cp)) return { category: 'consonant', level: 'base' };
  if (isLeadingVowel(cp)) return { category: 'leadingVowel', level: 'base' };
  if (isFollowingVowel(cp)) return { category: 'followingVowel', level: 'base' };
  if (isUpperMark(cp)) return { category: 'upperVowel', level: 'above' };
  if (isLowerMark(cp)) return { category: 'lowerVowel', level: 'below' };
  if (isToneMark(cp)) return { category: 'toneMark', level: 'top' };
  if (isKaran(cp)) return { category: 'karan', level: 'top' };
  if (isThaiDigit(cp)) return { category: 'thaiDigit', level: 'base' };
  return { category: 'other', level: 'base' };
}

/** Classify a single-character string (reads its first code point). */
export function classifyChar(ch: string): ThaiCharInfo {
  return classifyThaiChar(ch.codePointAt(0) ?? -1);
}
