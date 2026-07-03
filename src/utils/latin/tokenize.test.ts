import { describe, it, expect } from 'vitest';
import { splitLines, splitWords, splitSentences } from './tokenize';

describe('splitLines', () => {
  it('splits on LF and CRLF', () => {
    expect(splitLines('a\nb\r\nc')).toEqual(['a', 'b', 'c']);
  });
});

describe('splitWords', () => {
  it('splits English on whitespace and drops empties', () => {
    expect(splitWords('  the quick  fox ')).toEqual(['the', 'quick', 'fox']);
  });

  it('splits Thai on its phrase spaces', () => {
    expect(splitWords('สวัสดี ครับ')).toEqual(['สวัสดี', 'ครับ']);
  });
});

describe('splitSentences', () => {
  it('splits on . ! ? and keeps terminators', () => {
    expect(splitSentences('Hi there. How are you? Great!')).toEqual([
      'Hi there.',
      'How are you?',
      'Great!',
    ]);
  });

  it('returns an empty array for blank input', () => {
    expect(splitSentences('   ')).toEqual([]);
  });

  it('handles text with no terminator', () => {
    expect(splitSentences('no end here')).toEqual(['no end here']);
  });
});
