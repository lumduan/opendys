import { describe, it, expect } from 'vitest';
import {
  DEFAULT_READER_SETTINGS,
  READER_LIMITS,
  clampReaderSettings,
  mergeSettings,
  serializeSettings,
  parseSettings,
  fontStackFor,
  type ReaderSettings,
} from './settings';

describe('fontStackFor', () => {
  it('maps each choice and falls back to dyslexic', () => {
    expect(fontStackFor('dyslexic')).toContain('OpenDyslexic');
    expect(fontStackFor('sarabun')).toContain('Sarabun');
    expect(fontStackFor('mitr')).toContain('Mitr');
    expect(fontStackFor('system')).toContain('system-ui');
    // @ts-expect-error invalid choice falls back
    expect(fontStackFor('nope')).toBe(fontStackFor('dyslexic'));
  });
});

describe('clampReaderSettings', () => {
  it('clamps out-of-range metrics and reader fields', () => {
    const wild: ReaderSettings = {
      ...DEFAULT_READER_SETTINGS,
      fontSizePx: 9999,
      lineHeight: 0.1,
      rulerDim: 5,
      rulerBandPx: 5,
      ttsRate: 9,
    };
    const c = clampReaderSettings(wild);
    expect(c.fontSizePx).toBe(48); // METRIC_LIMITS max
    expect(c.lineHeight).toBe(1);
    expect(c.rulerDim).toBe(READER_LIMITS.rulerDim[1]);
    expect(c.rulerBandPx).toBe(READER_LIMITS.rulerBandPx[0]);
    expect(c.ttsRate).toBe(READER_LIMITS.ttsRate[1]);
  });

  it('coerces garbage numbers to defaults and validates enums/booleans', () => {
    const c = clampReaderSettings({
      ...DEFAULT_READER_SETTINGS,
      fontSizePx: NaN,
      rulerDim: 'x' as unknown as number,
      fontChoice: 'bogus' as never,
      palette: 'bogus' as never,
      ttsLang: 'fr' as never,
      colorCoding: 1 as unknown as boolean,
    });
    expect(c.fontSizePx).toBe(DEFAULT_READER_SETTINGS.fontSizePx);
    expect(c.rulerDim).toBe(DEFAULT_READER_SETTINGS.rulerDim);
    expect(c.fontChoice).toBe('dyslexic');
    expect(c.palette).toBe('classic');
    expect(c.ttsLang).toBe('en');
    expect(c.colorCoding).toBe(true);
  });
});

describe('mergeSettings', () => {
  it('applies a partial over defaults and drops unknown keys', () => {
    const merged = mergeSettings({ fontSizePx: 30, bogus: 'x' } as Partial<ReaderSettings>);
    expect(merged.fontSizePx).toBe(30);
    expect(merged.lineHeight).toBe(DEFAULT_READER_SETTINGS.lineHeight);
    expect('bogus' in merged).toBe(false);
  });
});

describe('parseSettings', () => {
  it('returns defaults for null / bad JSON / non-object', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_READER_SETTINGS);
    expect(parseSettings('not json{')).toEqual(DEFAULT_READER_SETTINGS);
    expect(parseSettings('42')).toEqual(DEFAULT_READER_SETTINGS);
    expect(parseSettings('null')).toEqual(DEFAULT_READER_SETTINGS);
  });

  it('merges a stored partial and round-trips', () => {
    expect(parseSettings('{"fontChoice":"mitr"}').fontChoice).toBe('mitr');
    const round = parseSettings(serializeSettings({ ...DEFAULT_READER_SETTINGS, fontSizePx: 28 }));
    expect(round.fontSizePx).toBe(28);
  });
});
