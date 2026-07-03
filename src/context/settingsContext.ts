import { createContext, useContext } from 'react';
import { DEFAULT_READER_SETTINGS, type ReaderSettings } from '@/utils/reader';

export interface SettingsContextValue {
  settings: ReaderSettings;
  update: (patch: Partial<ReaderSettings>) => void;
  reset: () => void;
}

// Component-free module (context + hook) so react-refresh/only-export-components stays satisfied.
export const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_READER_SETTINGS,
  update: () => {},
  reset: () => {},
});

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
