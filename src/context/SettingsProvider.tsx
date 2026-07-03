import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  DEFAULT_READER_SETTINGS,
  mergeSettings,
  parseSettings,
  serializeSettings,
  type ReaderSettings,
} from '@/utils/reader';
import { SettingsContext } from './settingsContext';

const STORAGE_KEY = 'opendys.reader.v1';

function safeLocalGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // private-mode Safari / disabled storage — ignore
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ReaderSettings>(() =>
    parseSettings(safeLocalGet(STORAGE_KEY)),
  );

  const update = useCallback((patch: Partial<ReaderSettings>) => {
    // Instant state update (sliders stay live); merge over previous, re-clamped.
    setSettings((prev) => mergeSettings({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => setSettings({ ...DEFAULT_READER_SETTINGS }), []);

  // Persist is the only expensive per-change side effect → debounce it (state stays immediate).
  const timerRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      safeLocalSet(STORAGE_KEY, serializeSettings(settings));
    }, 300);
    return () => {
      if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
    };
  }, [settings]);

  const value = useMemo(() => ({ settings, update, reset }), [settings, update, reset]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
