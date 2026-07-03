import { describe, it, expect } from 'vitest';
import { normalizeText } from './text';

describe('normalizeText', () => {
  it('normalizes CRLF/CR and form feeds to LF', () => {
    expect(normalizeText('a\r\nb\rc\fd')).toBe('a\nb\nc\nd');
  });

  it('strips trailing horizontal whitespace per line (incl. tabs)', () => {
    expect(normalizeText('foo \t\nbar\t ')).toBe('foo\nbar');
  });

  it('collapses 3+ blank lines to a single blank line', () => {
    expect(normalizeText('a\n\n\n\n\nb')).toBe('a\n\nb');
  });

  it('trims leading/trailing blank lines and whitespace', () => {
    expect(normalizeText('\n\n  hello  \n\n')).toBe('hello');
  });

  it('preserves Thai text without inserting spaces', () => {
    expect(normalizeText('สวัสดี\r\nครับ  \n\n\n\nโลก')).toBe('สวัสดี\nครับ\n\nโลก');
  });

  it('returns empty string for blank input', () => {
    expect(normalizeText('   \n  ')).toBe('');
  });
});
