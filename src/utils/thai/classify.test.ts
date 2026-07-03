import { describe, it, expect } from 'vitest';
import { classifyThaiChar, classifyChar } from './classify';

const cp = (ch: string): number => ch.codePointAt(0) ?? -1;

describe('classifyThaiChar', () => {
  it('maps each category to its vertical level', () => {
    expect(classifyThaiChar(cp('ด'))).toEqual({ category: 'consonant', level: 'base' });
    expect(classifyThaiChar(cp('เ'))).toEqual({ category: 'leadingVowel', level: 'base' });
    expect(classifyThaiChar(cp('า'))).toEqual({ category: 'followingVowel', level: 'base' });
    expect(classifyThaiChar(cp('ิ'))).toEqual({ category: 'upperVowel', level: 'above' });
    expect(classifyThaiChar(cp('ุ'))).toEqual({ category: 'lowerVowel', level: 'below' });
    expect(classifyThaiChar(cp('่'))).toEqual({ category: 'toneMark', level: 'top' });
    expect(classifyThaiChar(cp('์'))).toEqual({ category: 'karan', level: 'top' });
    expect(classifyThaiChar(cp('๕'))).toEqual({ category: 'thaiDigit', level: 'base' });
  });

  it('treats non-Thai code points as other/base', () => {
    expect(classifyThaiChar(cp('A'))).toEqual({ category: 'other', level: 'base' });
    expect(classifyThaiChar(cp(' '))).toEqual({ category: 'other', level: 'base' });
  });

  it('classifyChar reads a single-character string', () => {
    expect(classifyChar('ก').category).toBe('consonant');
    expect(classifyChar('').category).toBe('other');
  });
});
