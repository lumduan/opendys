import { splitScriptRuns, type SpeechChunk } from '@/utils/reader';
import { segmentThaiSyllables } from '@/utils/thai';
import type { TargetToken } from './types';
import { normalizeToken, type NormalizeOptions } from './normalize';

const LATIN_WORD = /\S+/g;

/**
 * Tokenize the tiled render chunks into graded target tokens, each carrying the exact offset triple
 * needed to drive the highlight pipeline.
 *
 * Granularity mirrors what the reader renders and what ASR can plausibly return: within each chunk,
 * `splitScriptRuns` separates scripts, Latin runs are split into whitespace words, Thai runs into
 * visual syllables (`segmentThaiSyllables`). Offsets are accumulated while walking so that
 * `chunk.raw.slice(charIndex, charIndex + charLength) === token.text`. Tokens whose normalized form
 * is empty (pure punctuation/whitespace) are dropped — they are not graded.
 */
export function tokenizeTarget(chunks: SpeechChunk[], opts: NormalizeOptions = {}): TargetToken[] {
  const tokens: TargetToken[] = [];

  chunks.forEach((chunk, chunkIndex) => {
    let runOffset = 0;
    for (const run of splitScriptRuns(chunk.raw)) {
      if (run.script === 'thai') {
        let sylOffset = 0;
        for (const syllable of segmentThaiSyllables(run.text)) {
          pushToken(tokens, chunkIndex, runOffset + sylOffset, syllable, 'thai', opts);
          sylOffset += syllable.length;
        }
      } else {
        LATIN_WORD.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = LATIN_WORD.exec(run.text)) !== null) {
          pushToken(tokens, chunkIndex, runOffset + match.index, match[0], 'latin', opts);
        }
      }
      runOffset += run.text.length;
    }
  });

  return tokens;
}

function pushToken(
  tokens: TargetToken[],
  chunkIndex: number,
  charIndex: number,
  text: string,
  script: 'thai' | 'latin',
  opts: NormalizeOptions,
): void {
  const norm = normalizeToken(text, opts);
  if (norm === '') return;
  tokens.push({ chunkIndex, charIndex, charLength: text.length, text, norm, script });
}

/**
 * Tokenize an ASR hypothesis string into normalized comparison tokens (positions not needed). Uses
 * the same script-split + Latin-word / Thai-syllable granularity as {@link tokenizeTarget}; empties
 * are dropped.
 */
export function tokenizeHypothesis(text: string, opts: NormalizeOptions = {}): string[] {
  const out: string[] = [];
  for (const run of splitScriptRuns(text)) {
    const pieces = run.script === 'thai' ? segmentThaiSyllables(run.text) : run.text.split(/\s+/);
    for (const piece of pieces) {
      const norm = normalizeToken(piece, opts);
      if (norm !== '') out.push(norm);
    }
  }
  return out;
}
