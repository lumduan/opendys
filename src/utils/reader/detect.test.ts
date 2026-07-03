import { describe, it, expect } from 'vitest';
import { detectPrimaryScript } from './detect';

describe('detectPrimaryScript', () => {
  it('detects Thai-dominant and Latin-dominant text', () => {
    expect(detectPrimaryScript('สวัสดีครับ')).toBe('th');
    expect(detectPrimaryScript('hello world')).toBe('en');
  });

  it('defaults to en for empty or symbol-only text', () => {
    expect(detectPrimaryScript('')).toBe('en');
    expect(detectPrimaryScript('123 !!!')).toBe('en');
  });
});
