import { describe, it, expect } from 'vitest';
import {
  toColorTokens,
  toColorClusters,
  toRenderSegments,
  segmentRole,
  THAI_COLORS,
} from './colorTokens';

describe('toColorTokens', () => {
  it('colors consonant, vowel and tone in กิ่', () => {
    const tokens = toColorTokens('กิ่');
    expect(tokens.map((t) => t.role)).toEqual(['consonant', 'vowel', 'tone']);
    expect(tokens.map((t) => t.color)).toEqual([
      THAI_COLORS.consonant,
      THAI_COLORS.vowel,
      THAI_COLORS.tone,
    ]);
    // one visual cluster
    expect(new Set(tokens.map((t) => t.clusterIndex)).size).toBe(1);
  });

  it('colors a karan-silenced final consonant blue in รักษ์', () => {
    const tokens = toColorTokens('รักษ์');
    const byChar = (c: string) => tokens.find((t) => t.char === c)!;
    expect(byChar('ร').role).toBe('consonant');
    expect(byChar('ั').role).toBe('vowel');
    expect(byChar('ก').role).toBe('consonant');
    expect(byChar('ษ').role).toBe('silent');
    expect(byChar('์').role).toBe('silent');
    expect(byChar('ษ').color).toBe(THAI_COLORS.silent);
  });

  it('merges a leading vowel with its consonant into one cluster (เก)', () => {
    const tokens = toColorTokens('เก');
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toMatchObject({ char: 'เ', role: 'vowel', clusterIndex: 0 });
    expect(tokens[1]).toMatchObject({ char: 'ก', role: 'consonant', clusterIndex: 0 });
  });

  it('treats Latin and Thai digits as neutral', () => {
    const tokens = toColorTokens('A๕');
    const a = tokens.find((t) => t.char === 'A')!;
    const digit = tokens.find((t) => t.char === '๕')!;
    expect(a.role).toBe('neutral');
    expect(a.color).toBe(THAI_COLORS.neutral);
    expect(digit.role).toBe('neutral');
  });

  it('returns no tokens for empty input', () => {
    expect(toColorTokens('')).toEqual([]);
  });
});

describe('toColorClusters', () => {
  it('groups tokens by visual syllable', () => {
    const clusters = toColorClusters('เกา'); // เ+ก merged, า separate
    expect(clusters.map((c) => c.text)).toEqual(['เก', 'า']);
    expect(clusters[0].tokens).toHaveLength(2);
  });
});

describe('toRenderSegments', () => {
  it('emits one segment per grapheme cluster, keeping marks with their base (เด็กน้อย)', () => {
    const segs = toRenderSegments('เด็กน้อย');
    // The tone/upper marks (็ ้) stay glued to their base consonant — never a lone segment.
    expect(segs.map((s) => s.text)).toEqual(['เ', 'ด็', 'ก', 'น้', 'อ', 'ย']);
    expect(segs.map((s) => s.role)).toEqual([
      'vowel',
      'consonant',
      'consonant',
      'consonant',
      'consonant',
      'consonant',
    ]);
  });

  it('colors a karan cluster silent and spacing vowels red (รักษ์, กา)', () => {
    expect(toRenderSegments('รักษ์').map((s) => ({ text: s.text, role: s.role }))).toEqual([
      { text: 'รั', role: 'consonant' },
      { text: 'ก', role: 'consonant' },
      { text: 'ษ์', role: 'silent' },
    ]);
    expect(toRenderSegments('กา').map((s) => s.role)).toEqual(['consonant', 'vowel']);
  });

  it('keeps a stacked upper-vowel + tone attached to the base (เกี่ยว)', () => {
    expect(toRenderSegments('เกี่ยว').map((s) => s.text)).toEqual(['เ', 'กี่', 'ย', 'ว']);
  });

  it('treats digits/Latin as neutral and returns [] for empty input', () => {
    expect(toRenderSegments('A๕').map((s) => s.role)).toEqual(['neutral', 'neutral']);
    expect(toRenderSegments('')).toEqual([]);
  });
});

describe('segmentRole', () => {
  it('is faithful: the base/spacing char decides the color, karan → silent', () => {
    expect(segmentRole('ด็')).toBe('consonant'); // base consonant + upper-vowel mark
    expect(segmentRole('น้')).toBe('consonant'); // base consonant + tone mark
    expect(segmentRole('เ')).toBe('vowel'); // leading vowel (spacing)
    expect(segmentRole('า')).toBe('vowel'); // following vowel (spacing)
    expect(segmentRole('ษ์')).toBe('silent'); // karan-silenced consonant
    expect(segmentRole('๕')).toBe('neutral'); // Thai digit
  });
});
