/**
 * Thai script Unicode reference (block U+0E00–U+0E7F, entirely within the BMP).
 *
 * Two properties drive the 4-level orthography model:
 *  - spacing letters (General_Category Lo) advance the cursor and sit on the baseline;
 *  - nonspacing combining marks (Gc Mn) stack above/below the preceding base character.
 *
 * Every constant below is a raw code point (number). Iterate strings by code point
 * (`for..of`, `Array.from`, `[...str]`) so these comparisons are correct.
 */

export const THAI_BLOCK_START = 0x0e00;
export const THAI_BLOCK_END = 0x0e7f;

/** Base consonants ก…ฮ. Includes the vocalic letters ฤ (U+0E24) and ฦ (U+0E26), which also
 * render on the baseline, so they are treated as base-level characters here. */
export const CONSONANT_START = 0x0e01;
export const CONSONANT_END = 0x0e2e;

/** Pre-posed (leading) vowels — spacing, rendered *before* their consonant: เ แ โ ใ ไ */
export const LEADING_VOWEL_START = 0x0e40;
export const LEADING_VOWEL_END = 0x0e44;

/** Post-posed (following) vowels — spacing, on the baseline: ะ (0E30) า (0E32) ำ (0E33) ๅ (0E45) */
export const FOLLOWING_VOWELS: ReadonlySet<number> = new Set([0x0e30, 0x0e32, 0x0e33, 0x0e45]);

/** Above-base combining vowels/marks (nonspacing): ั ิ ี ึ ื ็ ํ ๎ */
export const UPPER_MARKS: ReadonlySet<number> = new Set([
  0x0e31, 0x0e34, 0x0e35, 0x0e36, 0x0e37, 0x0e47, 0x0e4d, 0x0e4e,
]);

/** Below-base combining vowels (nonspacing): ุ (0E38) ู (0E39) ฺ (0E3A) */
export const LOWER_MARKS: ReadonlySet<number> = new Set([0x0e38, 0x0e39, 0x0e3a]);

/** Tone marks (nonspacing, top level): ่ ้ ๊ ๋ */
export const TONE_START = 0x0e48;
export const TONE_END = 0x0e4b;

/** Thanthakhat / การันต์ — the silencer that marks a silent (usually final) consonant: ◌์ */
export const KARAN = 0x0e4c;

/** Thai digits ๐–๙ */
export const DIGIT_START = 0x0e50;
export const DIGIT_END = 0x0e59;

/** Matches any Thai nonspacing combining mark (upper, lower, tone, or karan):
 *  U+0E31, U+0E34–U+0E3A, U+0E47–U+0E4E. */
export const THAI_COMBINING_REGEX = /[ัิ-ฺ็-๎]/;

export const isThai = (cp: number): boolean => cp >= THAI_BLOCK_START && cp <= THAI_BLOCK_END;

export const isThaiConsonant = (cp: number): boolean =>
  cp >= CONSONANT_START && cp <= CONSONANT_END;

export const isLeadingVowel = (cp: number): boolean =>
  cp >= LEADING_VOWEL_START && cp <= LEADING_VOWEL_END;

export const isFollowingVowel = (cp: number): boolean => FOLLOWING_VOWELS.has(cp);

export const isUpperMark = (cp: number): boolean => UPPER_MARKS.has(cp);

export const isLowerMark = (cp: number): boolean => LOWER_MARKS.has(cp);

export const isToneMark = (cp: number): boolean => cp >= TONE_START && cp <= TONE_END;

export const isKaran = (cp: number): boolean => cp === KARAN;

export const isThaiDigit = (cp: number): boolean => cp >= DIGIT_START && cp <= DIGIT_END;

/** True for any nonspacing mark that stacks onto a preceding base character. */
export const isThaiCombiningMark = (cp: number): boolean =>
  isUpperMark(cp) || isLowerMark(cp) || isToneMark(cp) || isKaran(cp);

/** Convenience: read the first code point of a single-character string. */
export const codePointOf = (ch: string): number => ch.codePointAt(0) ?? 0;
