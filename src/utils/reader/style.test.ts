import { describe, it, expect } from 'vitest';
import { buildReaderStyle } from './style';
import { DEFAULT_READER_SETTINGS } from './settings';

describe('buildReaderStyle', () => {
  it('publishes letter-spacing as a custom property, never inline', () => {
    const style = buildReaderStyle({ ...DEFAULT_READER_SETTINGS, letterSpacingEm: 0.08 });
    expect(style['--reader-letter-spacing']).toBe('0.08em');
    expect('letterSpacing' in style).toBe(false);
  });

  it('maps font/size/line/word from settings', () => {
    const style = buildReaderStyle({
      ...DEFAULT_READER_SETTINGS,
      fontChoice: 'mitr',
      fontSizePx: 30,
      lineHeight: 2.2,
      wordSpacingEm: 0.2,
    });
    expect(style.fontFamily).toContain('Mitr');
    expect(style.fontSize).toBe('30px');
    expect(style.lineHeight).toBe(2.2);
    expect(style.wordSpacing).toBe('0.2em');
  });
});
