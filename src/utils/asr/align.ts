import type { TokenStatus } from './types';
import { similarity } from './distance';
import { DEFAULT_MATCH_THRESHOLD } from './match';

export type AlignOp = 'match' | 'substitute' | 'delete' | 'insert';

export interface AlignedPair {
  readonly op: AlignOp;
  /** Index into the target token array; null for an inserted (extra spoken) token. */
  readonly targetIndex: number | null;
  /** Index into the hypothesis token array; null for a deleted (skipped) target token. */
  readonly hypIndex: number | null;
  /** Similarity for match/substitute; 0 for delete/insert. */
  readonly score: number;
}

export interface AlignmentResult {
  readonly pairs: AlignedPair[];
  /** Per-target status from the alignment alone (never 'pending' — the frontier adds that). */
  readonly status: TokenStatus[];
}

// Backtrace directions. Plain constants (not a `const enum`) to stay friendly to esbuild /
// isolatedModules. Diag = align; Up = delete a target token (skipped); Left = insert a spoken token.
type Move = 0 | 1 | 2;
const DIAG: Move = 0;
const UP: Move = 1;
const LEFT: Move = 2;

/**
 * Global (Needleman–Wunsch) alignment of a target token sequence against a spoken-hypothesis
 * sequence, with a FUZZY substitution cost of `1 - similarity` (so a near-miss costs less than a
 * full indel pair). Backtracking yields, per target token: aligned & similarity ≥ threshold →
 * `correct`; aligned & below → `mispronounced`; unaligned target → `skipped`. Extra hypothesis
 * tokens become cost-1 inserts, which absorbs stutters, repeats, and window-seam duplication
 * without penalizing the target.
 */
export function alignTokens(
  target: string[],
  hyp: string[],
  threshold: number = DEFAULT_MATCH_THRESHOLD,
): AlignmentResult {
  const n = target.length;
  const m = hyp.length;

  const cost: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  const back: Move[][] = Array.from({ length: n + 1 }, () => new Array<Move>(m + 1).fill(DIAG));

  for (let i = 1; i <= n; i += 1) {
    cost[i][0] = i;
    back[i][0] = UP;
  }
  for (let j = 1; j <= m; j += 1) {
    cost[0][j] = j;
    back[0][j] = LEFT;
  }

  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const sub = 1 - similarity(target[i - 1], hyp[j - 1]);
      const diag = cost[i - 1][j - 1] + sub;
      const up = cost[i - 1][j] + 1;
      const left = cost[i][j - 1] + 1;

      // Prefer diagonal, then up (skip), then left (extra) on ties.
      let best = diag;
      let move = DIAG;
      if (up < best) {
        best = up;
        move = UP;
      }
      if (left < best) {
        best = left;
        move = LEFT;
      }
      cost[i][j] = best;
      back[i][j] = move;
    }
  }

  const pairs: AlignedPair[] = [];
  const status: TokenStatus[] = new Array<TokenStatus>(n);
  let i = n;
  let j = m;
  // Backpointer invariants guarantee DIAG only at i,j>0 and UP only at i>0, so the moves need no
  // extra bounds guards here.
  while (i > 0 || j > 0) {
    const move = back[i][j];
    if (move === DIAG) {
      const score = similarity(target[i - 1], hyp[j - 1]);
      const correct = score >= threshold;
      pairs.push({
        op: correct ? 'match' : 'substitute',
        targetIndex: i - 1,
        hypIndex: j - 1,
        score,
      });
      status[i - 1] = correct ? 'correct' : 'mispronounced';
      i -= 1;
      j -= 1;
    } else if (move === UP) {
      pairs.push({ op: 'delete', targetIndex: i - 1, hypIndex: null, score: 0 });
      status[i - 1] = 'skipped';
      i -= 1;
    } else {
      pairs.push({ op: 'insert', targetIndex: null, hypIndex: j - 1, score: 0 });
      j -= 1;
    }
  }

  pairs.reverse();
  return { pairs, status };
}
