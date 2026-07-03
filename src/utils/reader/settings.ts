import { clampMetrics } from '@/utils/latin';
import { PALETTE_NAMES, type PaletteName } from './palette';

export type FontChoice = 'dyslexic' | 'sarabun' | 'mitr' | 'system';
export type ReaderLanguage = 'en' | 'th';

/** Global reader preferences (persisted to localStorage). */
export interface ReaderSettings {
  fontSizePx: number;
  lineHeight: number;
  letterSpacingEm: number;
  wordSpacingEm: number;
  fontChoice: FontChoice;
  palette: PaletteName;
  colorCoding: boolean;
  guideLines: boolean;
  ruler: boolean;
  rulerDim: number; // 0..0.9 overlay opacity
  rulerBandPx: number; // 24..160 band height
  ttsLang: ReaderLanguage;
  ttsRate: number; // 0.1..2
}

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  fontSizePx: 24,
  lineHeight: 2.0,
  letterSpacingEm: 0.04,
  wordSpacingEm: 0.16,
  fontChoice: 'dyslexic',
  palette: 'classic',
  colorCoding: true,
  guideLines: false,
  ruler: false,
  rulerDim: 0.55,
  rulerBandPx: 56,
  ttsLang: 'en',
  ttsRate: 1,
};

/** CSS font-family stacks. OpenDyslexic (Latin) falls through to Sarabun (Thai) via unicode-range. */
export const FONT_STACKS: Record<FontChoice, string> = {
  dyslexic: "'OpenDyslexic', 'Sarabun', system-ui, sans-serif",
  sarabun: "'Sarabun', system-ui, sans-serif",
  mitr: "'Mitr', 'Sarabun', system-ui, sans-serif",
  system: "system-ui, -apple-system, 'Segoe UI', sans-serif",
};

export function fontStackFor(fontChoice: FontChoice): string {
  return FONT_STACKS[fontChoice] ?? FONT_STACKS.dyslexic;
}

export const READER_LIMITS = {
  rulerDim: [0, 0.9],
  rulerBandPx: [24, 160],
  ttsRate: [0.1, 2],
} as const;

const FONT_CHOICES: readonly FontChoice[] = ['dyslexic', 'sarabun', 'mitr', 'system'];
const TTS_LANGS: readonly ReaderLanguage[] = ['en', 'th'];

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const num = (value: unknown, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/** Coerce and clamp every field to a safe, in-range value (tolerant of garbage input). */
export function clampReaderSettings(settings: ReaderSettings): ReaderSettings {
  const d = DEFAULT_READER_SETTINGS;
  const m = clampMetrics({
    fontSizePx: num(settings.fontSizePx, d.fontSizePx),
    lineHeight: num(settings.lineHeight, d.lineHeight),
    letterSpacingEm: num(settings.letterSpacingEm, d.letterSpacingEm),
    wordSpacingEm: num(settings.wordSpacingEm, d.wordSpacingEm),
  });
  return {
    fontSizePx: m.fontSizePx,
    lineHeight: m.lineHeight,
    letterSpacingEm: m.letterSpacingEm,
    wordSpacingEm: m.wordSpacingEm,
    fontChoice: FONT_CHOICES.includes(settings.fontChoice) ? settings.fontChoice : d.fontChoice,
    palette: PALETTE_NAMES.includes(settings.palette) ? settings.palette : d.palette,
    colorCoding: Boolean(settings.colorCoding),
    guideLines: Boolean(settings.guideLines),
    ruler: Boolean(settings.ruler),
    rulerDim: clamp(num(settings.rulerDim, d.rulerDim), READER_LIMITS.rulerDim[0], READER_LIMITS.rulerDim[1]),
    rulerBandPx: Math.round(
      clamp(num(settings.rulerBandPx, d.rulerBandPx), READER_LIMITS.rulerBandPx[0], READER_LIMITS.rulerBandPx[1]),
    ),
    ttsLang: TTS_LANGS.includes(settings.ttsLang) ? settings.ttsLang : d.ttsLang,
    ttsRate: clamp(num(settings.ttsRate, d.ttsRate), READER_LIMITS.ttsRate[0], READER_LIMITS.ttsRate[1]),
  };
}

/** Merge a partial patch over the defaults and clamp. Unknown keys are dropped. */
export function mergeSettings(partial: Partial<ReaderSettings>): ReaderSettings {
  return clampReaderSettings({ ...DEFAULT_READER_SETTINGS, ...partial });
}

export function serializeSettings(settings: ReaderSettings): string {
  return JSON.stringify(settings);
}

/** Parse persisted settings from a string. Never touches `window` (SSR/test-safe). */
export function parseSettings(raw: string | null): ReaderSettings {
  if (!raw) return { ...DEFAULT_READER_SETTINGS };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_READER_SETTINGS };
    return mergeSettings(parsed as Partial<ReaderSettings>);
  } catch {
    return { ...DEFAULT_READER_SETTINGS };
  }
}
