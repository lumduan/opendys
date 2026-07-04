import { useEffect } from 'react';
import type { ActiveWord } from './useSpeech';
import { wordRange, type SpeechChunk } from '@/utils/reader';

const HIGHLIGHT_NAME = 'reader-word';

/** True only where the CSS Custom Highlight API exists (Chrome 105+, Safari 17.2+, Firefox 117+). */
function highlightSupported(): boolean {
  return typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight === 'function';
}

/** Build a Range spanning `[start, end)` characters across an element's descendant text nodes. */
function buildTextRange(root: Element, start: number, end: number): Range | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let offset = 0;
  let anchored = false;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const len = node.textContent?.length ?? 0;
    if (!anchored && start <= offset + len) {
      range.setStart(node, Math.max(0, start - offset));
      anchored = true;
    }
    if (anchored && end <= offset + len) {
      range.setEnd(node, Math.max(0, end - offset));
      return range;
    }
    offset += len;
  }
  return anchored ? range : null;
}

function resolveRange(
  activeWord: ActiveWord | null,
  chunks: SpeechChunk[],
  root: HTMLElement | null,
): Range | null {
  if (!activeWord || !root) return null;
  const chunk = chunks[activeWord.chunkIndex];
  if (!chunk) return null;
  const { start, end } = wordRange(chunk.raw, activeWord.charIndex, activeWord.charLength);
  if (end <= start) return null;
  const el = root.querySelector(`[data-chunk-index="${activeWord.chunkIndex}"]`);
  return el ? buildTextRange(el, start, end) : null;
}

/**
 * Karaoke word highlight via the **CSS Custom Highlight API** — it paints a text `Range`, NOT a
 * wrapping element, so Thai combining marks stay in one shaping run (Safari-safe; per-mark spans would
 * detach onto dotted circles — see ADR-0006). No-op where the API is absent or `activeWord` is null
 * (Safari/iOS + many offline voices never fire `onboundary`), leaving the sentence-level chunk
 * highlight as the graceful fallback.
 */
export function useWordHighlight(
  activeWord: ActiveWord | null,
  chunks: SpeechChunk[],
  surfaceRef: { readonly current: HTMLElement | null },
): void {
  useEffect(() => {
    if (!highlightSupported()) return;
    const clear = () => {
      CSS.highlights.delete(HIGHLIGHT_NAME);
    };
    const range = resolveRange(activeWord, chunks, surfaceRef.current);
    if (range) CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(range));
    else clear();
    return clear;
  }, [activeWord, chunks, surfaceRef]);
}
