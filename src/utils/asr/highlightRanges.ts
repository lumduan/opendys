import type { TargetToken, TokenSpan, TokenStatus } from './types';

export type AsrHighlightName = 'asr-correct' | 'asr-error' | 'asr-current';
export type HighlightGroups = Record<AsrHighlightName, TokenSpan[]>;

/**
 * Bucket target-token spans by the CSS Custom Highlight name that should paint them:
 * `correct` → asr-correct (green); `mispronounced`/`skipped` → asr-error (red); the single token AT
 * the frontier → asr-current (next-word cursor cue); `pending` tokens are omitted (neutral). Each
 * `TokenSpan` is structurally an `ActiveWord`, so the highlight hook turns it into a DOM Range with
 * the shared `buildTextRange` offset math — no conversion.
 */
export function highlightGroups(
  tokens: TargetToken[],
  status: TokenStatus[],
  frontier: number,
): HighlightGroups {
  const groups: HighlightGroups = { 'asr-correct': [], 'asr-error': [], 'asr-current': [] };

  tokens.forEach((token, i) => {
    const span: TokenSpan = {
      chunkIndex: token.chunkIndex,
      charIndex: token.charIndex,
      charLength: token.charLength,
    };
    if (status[i] === 'correct') groups['asr-correct'].push(span);
    else if (status[i] === 'mispronounced' || status[i] === 'skipped') groups['asr-error'].push(span);
  });

  if (frontier < tokens.length) {
    const next = tokens[frontier];
    groups['asr-current'].push({
      chunkIndex: next.chunkIndex,
      charIndex: next.charIndex,
      charLength: next.charLength,
    });
  }

  return groups;
}
