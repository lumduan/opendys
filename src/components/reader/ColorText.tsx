import { useMemo, type CSSProperties } from 'react';
import { toRenderSegments, type ColorRole } from '@/utils/thai';

interface ColorTextProps {
  text: string;
  palette: Record<ColorRole, string>;
}

// Non-color cue (WCAG 1.4.1): silenced finals get a dotted underline in addition to color.
const SILENT_CUE: CSSProperties = { textDecoration: 'underline dotted', textUnderlineOffset: '0.15em' };

/**
 * Render a Thai run with the FR-3 4-level color coding (Phase 2 engine + the active palette).
 * One `<span>` per grapheme cluster — a base consonant and its stacked marks stay in a single
 * shaping run. Splitting a nonspacing mark into its own colored element detaches it from its base
 * and the browser renders it on a dotted circle, so coloring is applied at cluster granularity.
 */
export function ColorText({ text, palette }: ColorTextProps) {
  const segments = useMemo(() => toRenderSegments(text), [text]);
  return (
    <>
      {segments.map((segment, index) => (
        <span
          key={index}
          style={{ color: palette[segment.role], ...(segment.role === 'silent' ? SILENT_CUE : null) }}
        >
          {segment.text}
        </span>
      ))}
    </>
  );
}
