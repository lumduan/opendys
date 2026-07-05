import { describe, it, expect } from 'vitest';
import type { SpeechChunk } from '@/utils/reader';
import { tokenizeTarget, tokenizeHypothesis } from './tokenizeTarget';

const chunk = (raw: string): SpeechChunk => ({ raw, speak: raw.trim() });

describe('tokenizeTarget', () => {
  it('tokenizes Latin words with exact offsets', () => {
    const tokens = tokenizeTarget([chunk('the cat')]);
    expect(tokens.map((t) => [t.text, t.charIndex, t.charLength])).toEqual([
      ['the', 0, 3],
      ['cat', 4, 3],
    ]);
    expect(tokens.every((t) => t.script === 'latin' && t.chunkIndex === 0)).toBe(true);
  });

  it('tokenizes Thai into visual syllables (merging leading vowels)', () => {
    expect(tokenizeTarget([chunk('กขค')]).map((t) => t.text)).toEqual(['ก', 'ข', 'ค']);
    const merged = tokenizeTarget([chunk('เก')]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ text: 'เก', charIndex: 0, charLength: 2, script: 'thai' });
  });

  it('tracks offsets across a script-mixed chunk', () => {
    const tokens = tokenizeTarget([chunk('ab กข')]);
    expect(tokens.map((t) => [t.text, t.charIndex, t.script])).toEqual([
      ['ab', 0, 'latin'],
      ['ก', 3, 'thai'],
      ['ข', 4, 'thai'],
    ]);
  });

  it('includes leading whitespace in the offset (round-trips against raw)', () => {
    const raw = '  hi';
    const [tok] = tokenizeTarget([chunk(raw)]);
    expect(tok.charIndex).toBe(2);
    expect(raw.slice(tok.charIndex, tok.charIndex + tok.charLength)).toBe('hi');
  });

  it('drops punctuation-only tokens', () => {
    expect(tokenizeTarget([chunk('...')])).toEqual([]);
  });

  it('keeps chunkIndex continuity across chunks', () => {
    const tokens = tokenizeTarget([chunk('a '), chunk('b')]);
    expect(tokens.map((t) => [t.text, t.chunkIndex])).toEqual([
      ['a', 0],
      ['b', 1],
    ]);
  });

  it('guarantees the slice invariant on mixed content', () => {
    const raws = ['Go! ไป', '  ก็ end'];
    const chunks = raws.map(chunk);
    for (const token of tokenizeTarget(chunks)) {
      expect(chunks[token.chunkIndex].raw.slice(token.charIndex, token.charIndex + token.charLength)).toBe(
        token.text,
      );
    }
  });
});

describe('tokenizeHypothesis', () => {
  it('splits on whitespace and drops empties', () => {
    expect(tokenizeHypothesis('the  cat ')).toEqual(['the', 'cat']);
    expect(tokenizeHypothesis('')).toEqual([]);
  });

  it('segments Thai into syllables and normalizes', () => {
    expect(tokenizeHypothesis('กข')).toEqual(['ก', 'ข']);
    expect(tokenizeHypothesis('Hello!')).toEqual(['hello']);
    expect(tokenizeHypothesis('go ไป')).toEqual(['go', 'ไป']);
  });
});
