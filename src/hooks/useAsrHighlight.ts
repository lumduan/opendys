import { useEffect } from 'react';
import type { SpeechChunk } from '@/utils/reader';
import {
  highlightGroups,
  type AsrEvaluation,
  type AsrHighlightName,
  type TokenSpan,
} from '@/utils/asr';
import { buildTextRange, highlightSupported } from './useWordHighlight';

const HIGHLIGHT_NAMES: AsrHighlightName[] = ['asr-correct', 'asr-error', 'asr-current'];

/** Resolve a token span to a DOM Range. Unlike the karaoke path, `TokenSpan` offsets are already
 *  absolute into `chunk.raw` (from `tokenizeTarget`), so no trim shift is applied. */
function spanToRange(span: TokenSpan, chunks: SpeechChunk[], root: HTMLElement): Range | null {
  if (!chunks[span.chunkIndex]) return null;
  const el = root.querySelector(`[data-chunk-index="${span.chunkIndex}"]`);
  return el ? buildTextRange(el, span.charIndex, span.charIndex + span.charLength) : null;
}

/**
 * Paint the green / red / current reading-assessment highlights over the target surface, reusing the
 * karaoke **CSS Custom Highlight API** pipeline (`buildTextRange`). Registers three named highlights
 * alongside `reader-word`, each holding many Ranges. No-op where the API is unsupported — the target
 * text simply stays plain (a graceful, non-blocking degrade).
 */
export function useAsrHighlight(
  evaluation: AsrEvaluation | null,
  chunks: SpeechChunk[],
  surfaceRef: { readonly current: HTMLElement | null },
): void {
  useEffect(() => {
    if (!highlightSupported()) return;
    const clear = () => {
      for (const name of HIGHLIGHT_NAMES) CSS.highlights.delete(name);
    };
    const root = surfaceRef.current;
    if (!evaluation || !root) {
      clear();
      return clear;
    }
    const groups = highlightGroups(evaluation.tokens, evaluation.status, evaluation.frontier);
    for (const name of HIGHLIGHT_NAMES) {
      const ranges = groups[name]
        .map((span) => spanToRange(span, chunks, root))
        .filter((range): range is Range => range !== null);
      if (ranges.length) CSS.highlights.set(name, new Highlight(...ranges));
      else CSS.highlights.delete(name);
    }
    return clear;
  }, [evaluation, chunks, surfaceRef]);
}
