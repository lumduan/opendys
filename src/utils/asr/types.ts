import type { Script } from '@/utils/reader';

/**
 * Real-time ASR reading-assessment core types.
 *
 * Everything in `src/utils/asr/` is pure (no React/DOM/hook imports) so it stays inside — and
 * satisfies — the `src/utils/**` coverage gate, and so the alignment logic is testable without a
 * browser. Browser-only concerns (MediaRecorder, DOM Ranges, getUserMedia) live in hooks/services.
 */

/** Per-target-token grading outcome. Drives the green/red/neutral highlight. */
export type TokenStatus = 'pending' | 'correct' | 'mispronounced' | 'skipped';

/**
 * An offset triple addressing a slice of a rendered chunk's untrimmed `raw` string.
 *
 * Structurally identical to `ActiveWord` (src/hooks/useSpeech.ts) on purpose: a `TokenSpan` flows
 * straight into the karaoke highlight machinery (`buildTextRange`) with no conversion, while this
 * type stays in utils to avoid a `utils → hooks` import edge.
 */
export interface TokenSpan {
  readonly chunkIndex: number;
  readonly charIndex: number;
  readonly charLength: number;
}

/** A single gradable target token with its exact render-DOM back-reference. */
export interface TargetToken extends TokenSpan {
  /** Exact source slice: `chunk.raw.slice(charIndex, charIndex + charLength)`. */
  readonly text: string;
  /** Comparison key (NFC + case-fold + tone/edge-punct leniency); '' when it normalizes away. */
  readonly norm: string;
  readonly script: Script;
}
