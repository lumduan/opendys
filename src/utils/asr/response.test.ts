import { describe, it, expect } from 'vitest';
import { parseAsrText } from './response';

describe('parseAsrText', () => {
  it('extracts the transcript from a well-formed response', () => {
    expect(parseAsrText({ text: 'สวัสดี ครับ' })).toBe('สวัสดี ครับ');
  });

  it('returns empty for anything unexpected', () => {
    expect(parseAsrText({})).toBe('');
    expect(parseAsrText({ text: 123 })).toBe('');
    expect(parseAsrText(null)).toBe('');
    expect(parseAsrText(undefined)).toBe('');
    expect(parseAsrText('a string')).toBe('');
    expect(parseAsrText(42)).toBe('');
  });
});
