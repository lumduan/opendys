import {
  addSession,
  parseHistory,
  serializeHistory,
  type AsrHistory,
  type AsrSession,
} from '@/utils/asr';

/** On-device practice history. localStorage convention `opendys.<domain>.v<N>` (see SettingsProvider). */
export const ASR_STORAGE_KEY = 'opendys.asr.v1';

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // private-mode Safari / disabled storage
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private-mode / disabled storage — ignore */
  }
}

/** Bank a finished practice session immediately (capture-first — even before the P4 dashboard exists). */
export function saveAsrSession(session: AsrSession): void {
  const history = parseHistory(safeGet(ASR_STORAGE_KEY));
  safeSet(ASR_STORAGE_KEY, serializeHistory(addSession(history, session)));
}

/** Read the persisted history (newest-first); consumed by the forthcoming P4 stats dashboard. */
export function loadAsrHistory(): AsrHistory {
  return parseHistory(safeGet(ASR_STORAGE_KEY));
}
