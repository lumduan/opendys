export type SpeechLang = 'en' | 'th';

/**
 * Pick an OFFLINE voice for a language. Requires `localService === true` — a network voice
 * (`localService: false`, e.g. Google/Edge cloud voices) would send the text to a vendor server,
 * violating the zero-egress guarantee. Returns null when no offline voice exists (caller degrades).
 */
export function pickVoice(
  voices: SpeechSynthesisVoice[],
  lang: SpeechLang,
): SpeechSynthesisVoice | null {
  return voices.find((v) => v.localService === true && v.lang.toLowerCase().startsWith(lang)) ?? null;
}

export function isOfflineVoiceAvailable(voices: SpeechSynthesisVoice[], lang: SpeechLang): boolean {
  return pickVoice(voices, lang) !== null;
}

/** Web Speech accepts rate 0.1–2; out-of-range values are ignored/mute some voices. */
export function clampRate(rate: number): number {
  if (!Number.isFinite(rate)) return 1;
  return Math.min(2, Math.max(0.1, rate));
}
