import { describe, it, expect } from 'vitest';
import {
  buildTextStyle,
  clampMetrics,
  DEFAULT_TEXT_METRICS,
  METRIC_LIMITS,
} from './textMetrics';

describe('clampMetrics', () => {
  it('returns defaults when nothing is provided', () => {
    expect(clampMetrics()).toEqual(DEFAULT_TEXT_METRICS);
  });

  it('clamps out-of-range values to the limits', () => {
    const m = clampMetrics({
      fontSizePx: 999,
      lineHeight: 0.1,
      letterSpacingEm: 5,
      wordSpacingEm: -1,
    });
    expect(m.fontSizePx).toBe(METRIC_LIMITS.fontSizePx[1]);
    expect(m.lineHeight).toBe(METRIC_LIMITS.lineHeight[0]);
    expect(m.letterSpacingEm).toBe(METRIC_LIMITS.letterSpacingEm[1]);
    expect(m.wordSpacingEm).toBe(METRIC_LIMITS.wordSpacingEm[0]);
  });

  it('preserves in-range overrides', () => {
    expect(clampMetrics({ fontSizePx: 24 }).fontSizePx).toBe(24);
  });
});

describe('buildTextStyle', () => {
  it('produces CSS with px font size and em spacing', () => {
    const style = buildTextStyle({
      fontSizePx: 24,
      lineHeight: 2,
      letterSpacingEm: 0.1,
      wordSpacingEm: 0.2,
    });
    expect(style).toMatchObject({
      fontSize: '24px',
      lineHeight: 2,
      letterSpacing: '0.1em',
      wordSpacing: '0.2em',
    });
    expect(style.fontFamily).toBeUndefined();
  });

  it('includes fontFamily only when provided', () => {
    expect(buildTextStyle({ fontFamily: 'OpenDyslexic' }).fontFamily).toBe('OpenDyslexic');
  });
});
