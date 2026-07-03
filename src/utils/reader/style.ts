import type { CSSProperties } from 'react';
import { fontStackFor, type ReaderSettings } from './settings';

/** CSSProperties that also carries CSS custom properties. */
export type StyleVars = CSSProperties & Record<`--${string}`, string | number>;

/**
 * Reader surface style. Crucially, `letter-spacing` is NOT set inline — it is published as
 * `--reader-letter-spacing` and re-applied by CSS only to Latin (`:lang(en)`) runs, because tracking
 * detaches Thai combining marks and breaks the looped connection (see index.css + ADR-0002).
 */
export function buildReaderStyle(settings: ReaderSettings): StyleVars {
  return {
    fontFamily: fontStackFor(settings.fontChoice),
    fontSize: `${settings.fontSizePx}px`,
    lineHeight: settings.lineHeight,
    wordSpacing: `${settings.wordSpacingEm}em`,
    '--reader-letter-spacing': `${settings.letterSpacingEm}em`,
  };
}
