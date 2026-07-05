import type { TargetToken, TokenStatus } from './types';
import { alignTokens } from './align';
import { readingFrontier } from './frontier';
import { tokenizeHypothesis } from './tokenizeTarget';
import type { NormalizeOptions } from './normalize';
import { DEFAULT_MATCH_THRESHOLD } from './match';

export interface AsrEvaluation {
  readonly tokens: TargetToken[];
  /** Frontier-gated status per target token: 'pending' for anything not yet reached. */
  readonly status: TokenStatus[];
  readonly frontier: number;
  /** Correct ÷ reached, in [0, 1]. Unread tokens never count against the reader. */
  readonly accuracy: number;
  readonly mispronounced: string[];
  readonly skipped: string[];
}

export interface EvaluateOptions {
  threshold?: number;
  normalize?: NormalizeOptions;
}

/**
 * Recompute the assessment from the full accumulated hypothesis. Pure and idempotent — called on
 * every capture window with the growing transcript. Re-aligns the whole hypothesis against the whole
 * target, advances a MONOTONIC reading frontier (never retreats below `prevFrontier`, so a noisier
 * later window can't un-reach earlier text), gates not-yet-reached tokens to 'pending', and scores
 * accuracy over reached tokens only. For the final score, call with `prevFrontier = tokens.length`.
 */
export function evaluate(
  tokens: TargetToken[],
  hypothesis: string,
  prevFrontier = 0,
  opts: EvaluateOptions = {},
): AsrEvaluation {
  const threshold = opts.threshold ?? DEFAULT_MATCH_THRESHOLD;
  const hypTokens = tokenizeHypothesis(hypothesis, opts.normalize);
  const { pairs, status: rawStatus } = alignTokens(
    tokens.map((t) => t.norm),
    hypTokens,
    threshold,
  );

  const frontier = Math.min(Math.max(prevFrontier, readingFrontier(pairs)), tokens.length);

  const status: TokenStatus[] = tokens.map((_, i) => (i < frontier ? rawStatus[i] : 'pending'));

  let correct = 0;
  const mispronounced: string[] = [];
  const skipped: string[] = [];
  status.forEach((s, i) => {
    if (s === 'correct') correct += 1;
    else if (s === 'mispronounced') mispronounced.push(tokens[i].text);
    else if (s === 'skipped') skipped.push(tokens[i].text);
  });

  const accuracy = frontier > 0 ? correct / frontier : 0;

  return { tokens, status, frontier, accuracy, mispronounced, skipped };
}

/**
 * Guided "word-by-word" evaluation. Unlike {@link evaluate} (which grades the whole passage and lets the
 * frontier jump to the furthest matched word), this STRICTLY advances a single cursor through only the
 * LEADING run of correctly-read (or manually skipped) words — so the cursor WAITS on the first word not
 * yet read correctly, and never skips ahead if a later word is heard. Returns the same `AsrEvaluation`
 * shape so the existing highlight pipeline paints green done-words + one amber `asr-current` cursor.
 * `frontier === tokens.length` ⇒ the reader finished.
 */
export function guidedEvaluate(
  tokens: TargetToken[],
  hypothesis: string,
  prevCursor = 0,
  opts: EvaluateOptions = {},
  skipped: ReadonlySet<number> = new Set(),
): AsrEvaluation {
  const threshold = opts.threshold ?? DEFAULT_MATCH_THRESHOLD;
  const hypTokens = tokenizeHypothesis(hypothesis, opts.normalize);
  const { status: raw } = alignTokens(
    tokens.map((t) => t.norm),
    hypTokens,
    threshold,
  );

  let streak = 0;
  while (streak < tokens.length && (raw[streak] === 'correct' || skipped.has(streak))) streak += 1;
  const cursor = Math.min(Math.max(prevCursor, streak), tokens.length);

  const status: TokenStatus[] = tokens.map((_, i) => {
    if (skipped.has(i)) return 'skipped';
    return i < cursor ? 'correct' : 'pending';
  });
  const skippedList = tokens.filter((_, i) => skipped.has(i)).map((t) => t.text);
  const accuracy = tokens.length > 0 ? cursor / tokens.length : 0;

  return { tokens, status, frontier: cursor, accuracy, mispronounced: [], skipped: skippedList };
}

/**
 * Concatenate per-window transcripts into one growing hypothesis. Trivial and pure; the aligner
 * absorbs any stutter/overlap at window seams as cost-free inserts.
 */
export function joinWindows(windows: string[]): string {
  return windows
    .map((w) => w.trim())
    .filter((w) => w !== '')
    .join(' ');
}
