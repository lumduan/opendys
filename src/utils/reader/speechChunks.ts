import { segmentThaiSyllables } from '@/utils/thai';

export interface SpeechChunk {
  /** Exact source slice — chunks TILE the original text (join('') === text) so rendering keeps
   *  every space and newline. */
  raw: string;
  /** Trimmed form for TTS. '' marks a render-only chunk (whitespace) that is never spoken. */
  speak: string;
}

// Keep utterances short: dodges Chrome's ~15s cutoff and gives finer active-chunk highlighting.
const MAX_CHUNK = 240;

/**
 * Split text into speakable/tappable chunks. Boundaries are sentence enders (`. ! ? … ฯ`) and
 * newlines; over-long pieces are hard-split on grapheme-cluster (Thai-syllable) boundaries so a
 * combining mark is never orphaned. Guarantees the tiling invariant.
 */
export function splitSpeechChunks(text: string): SpeechChunk[] {
  if (text === '') return [];

  const pieces: string[] = [];
  const boundary = /[.!?…ฯ]+|\n+/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = boundary.exec(text)) !== null) {
    const end = match.index + match[0].length;
    pieces.push(text.slice(lastIndex, end));
    lastIndex = end;
  }
  if (lastIndex < text.length) pieces.push(text.slice(lastIndex));

  const raws: string[] = [];
  for (const piece of pieces) {
    if (piece.length <= MAX_CHUNK) raws.push(piece);
    else raws.push(...hardSplit(piece));
  }

  return raws.map((raw) => ({ raw, speak: raw.trim() }));
}

function hardSplit(piece: string): string[] {
  const out: string[] = [];
  let buf = '';
  for (const cluster of segmentThaiSyllables(piece)) {
    if (buf !== '' && buf.length + cluster.length > MAX_CHUNK) {
      out.push(buf);
      buf = '';
    }
    buf += cluster;
  }
  if (buf !== '') out.push(buf);
  return out;
}
