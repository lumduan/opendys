import { describe, it, expect } from 'vitest';
import { segmentGraphemes, segmentThaiSyllables } from './cluster';

describe('segmentGraphemes', () => {
  it('groups a base consonant with its stacked marks', () => {
    // ก + ิ (above) + ่ (tone) = one cluster
    expect(segmentGraphemes('กิ่')).toEqual(['กิ่']);
  });

  it('keeps spacing characters as separate clusters', () => {
    expect(segmentGraphemes('เก')).toEqual(['เ', 'ก']);
  });

  it('handles empty and Latin text', () => {
    expect(segmentGraphemes('')).toEqual([]);
    expect(segmentGraphemes('ab')).toEqual(['a', 'b']);
  });

  it('starts a new cluster when a combining mark has no base', () => {
    expect(segmentGraphemes('ิก')).toEqual(['ิ', 'ก']);
  });
});

describe('segmentThaiSyllables', () => {
  it('re-merges a leading vowel with the following consonant', () => {
    expect(segmentThaiSyllables('เก')).toEqual(['เก']);
  });

  it('merges a leading vowel with a fully-stacked consonant cluster', () => {
    expect(segmentThaiSyllables('เก่')).toEqual(['เก่']);
  });

  it('leaves a trailing lone leading vowel intact', () => {
    expect(segmentThaiSyllables('กเ')).toEqual(['ก', 'เ']);
  });

  it('passes non-leading-vowel text through unchanged', () => {
    expect(segmentThaiSyllables('กา')).toEqual(['ก', 'า']);
  });
});
