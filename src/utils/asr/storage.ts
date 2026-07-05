import type { SpeechLang } from '@/utils/reader';
import type { AsrEvaluation } from './session';

/** One persisted practice session. Kept small and JSON-serializable for localStorage. */
export interface AsrSession {
  readonly id: string;
  /** ISO timestamp; supplied by the caller so this module stays pure (no `Date`/`crypto`). */
  readonly date: string;
  readonly lang: SpeechLang;
  readonly target: string;
  readonly accuracy: number;
  readonly totalTokens: number;
  readonly correct: number;
  readonly mispronounced: string[];
  readonly skipped: string[];
}

export interface AsrHistory {
  readonly version: 1;
  readonly sessions: AsrSession[];
}

/** Retain a bounded, newest-first history — enough to chart progress without unbounded growth. */
export const ASR_HISTORY_LIMIT = 100;

export function emptyHistory(): AsrHistory {
  return { version: 1, sessions: [] };
}

/** Prepend a session (newest first) and cap the list. Pure — returns a new history. */
export function addSession(history: AsrHistory, session: AsrSession): AsrHistory {
  return { version: 1, sessions: [session, ...history.sessions].slice(0, ASR_HISTORY_LIMIT) };
}

/** Fold an evaluation + caller-supplied identity into a persistable session record. */
export function summarize(
  evaluation: AsrEvaluation,
  meta: { id: string; date: string; lang: SpeechLang; target: string },
): AsrSession {
  return {
    ...meta,
    accuracy: evaluation.accuracy,
    totalTokens: evaluation.tokens.length,
    correct: evaluation.status.filter((s) => s === 'correct').length,
    mispronounced: [...evaluation.mispronounced],
    skipped: [...evaluation.skipped],
  };
}

export function serializeHistory(history: AsrHistory): string {
  return JSON.stringify(history);
}

/** Parse persisted history; tolerant of null/garbage/legacy shapes (mirrors `parseSettings`). */
export function parseHistory(raw: string | null): AsrHistory {
  if (!raw) return emptyHistory();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return emptyHistory();
    const sessions = (parsed as { sessions?: unknown }).sessions;
    if (!Array.isArray(sessions)) return emptyHistory();
    return { version: 1, sessions: sessions.filter((s): s is AsrSession => !!s && typeof s === 'object') };
  } catch {
    return emptyHistory();
  }
}
