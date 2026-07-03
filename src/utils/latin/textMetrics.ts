import type { CSSProperties } from 'react';

/**
 * Reader typography settings, shared by the English/Latin and Thai render paths (FR-04).
 * Spacing values are in `em` so they scale with the chosen font size.
 */
export interface TextMetricsSettings {
  fontSizePx: number;
  /** Unitless line-height multiplier. */
  lineHeight: number;
  letterSpacingEm: number;
  wordSpacingEm: number;
  fontFamily?: string;
}

export const DEFAULT_TEXT_METRICS: TextMetricsSettings = {
  fontSizePx: 20,
  lineHeight: 1.8,
  letterSpacingEm: 0.05,
  wordSpacingEm: 0.16,
};

/** Inclusive [min, max] bounds enforced by {@link clampMetrics}. */
export const METRIC_LIMITS = {
  fontSizePx: [12, 48],
  lineHeight: [1, 3],
  letterSpacingEm: [0, 0.5],
  wordSpacingEm: [0, 1],
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Merge partial settings over the defaults and clamp every metric to a sane, readable range. */
export function clampMetrics(settings: Partial<TextMetricsSettings> = {}): TextMetricsSettings {
  const merged = { ...DEFAULT_TEXT_METRICS, ...settings };
  return {
    ...merged,
    fontSizePx: clamp(merged.fontSizePx, ...METRIC_LIMITS.fontSizePx),
    lineHeight: clamp(merged.lineHeight, ...METRIC_LIMITS.lineHeight),
    letterSpacingEm: clamp(merged.letterSpacingEm, ...METRIC_LIMITS.letterSpacingEm),
    wordSpacingEm: clamp(merged.wordSpacingEm, ...METRIC_LIMITS.wordSpacingEm),
  };
}

/** Translate reader settings into a React style object for the reading surface. */
export function buildTextStyle(settings: Partial<TextMetricsSettings> = {}): CSSProperties {
  const s = clampMetrics(settings);
  const style: CSSProperties = {
    fontSize: `${s.fontSizePx}px`,
    lineHeight: s.lineHeight,
    letterSpacing: `${s.letterSpacingEm}em`,
    wordSpacing: `${s.wordSpacingEm}em`,
  };
  if (s.fontFamily) style.fontFamily = s.fontFamily;
  return style;
}
