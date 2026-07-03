import type { CSSProperties } from 'react';

/** Faint guide-line color (charcoal at low alpha). */
const GUIDE_COLOR = 'rgba(44, 62, 80, 0.13)';

/** Fractional positions of the four Thai levels within one line box: tone, above, base, below. */
const LEVEL_FRACTIONS = [0.2, 0.4, 0.72, 0.9];

/**
 * Build a background of four faint horizontal guide lines that auto-repeat for every wrapped line,
 * anchoring the reader's eye to the Thai 4-level structure (FR-3). Keyed to the same
 * `fontSizePx * lineHeight` period as the text, so it stays in sync with wrapping and user spacing.
 * Offsets are heuristic (not font-metric-exact across faces).
 */
export function buildGuideBackground(fontSizePx: number, lineHeight: number): CSSProperties {
  const period = Math.max(1, Math.round(fontSizePx * lineHeight));
  const layers = LEVEL_FRACTIONS.map((fraction) => {
    const y = Math.min(period - 1, Math.round(period * fraction));
    return (
      `repeating-linear-gradient(to bottom, ` +
      `transparent 0 ${y}px, ${GUIDE_COLOR} ${y}px ${y + 1}px, transparent ${y + 1}px ${period}px)`
    );
  });
  return {
    backgroundImage: layers.join(', '),
  };
}
