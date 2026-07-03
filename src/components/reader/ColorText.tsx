import { useMemo, type CSSProperties } from 'react';
import { toColorClusters, type ColorRole } from '@/utils/thai';

interface ColorTextProps {
  text: string;
  palette: Record<ColorRole, string>;
}

// Non-color cue (WCAG 1.4.1): silenced finals get a dotted underline in addition to color.
const SILENT_CUE: CSSProperties = { textDecoration: 'underline dotted', textUnderlineOffset: '0.15em' };

/** Render a Thai run with the FR-3 4-level color coding (reuses the Phase 2 engine + the active palette). */
export function ColorText({ text, palette }: ColorTextProps) {
  const clusters = useMemo(() => toColorClusters(text), [text]);
  return (
    <>
      {clusters.map((cluster, clusterIndex) => (
        <span key={clusterIndex}>
          {cluster.tokens.map((token, tokenIndex) => (
            <span
              key={tokenIndex}
              style={{ color: palette[token.role], ...(token.role === 'silent' ? SILENT_CUE : null) }}
            >
              {token.char}
            </span>
          ))}
        </span>
      ))}
    </>
  );
}
