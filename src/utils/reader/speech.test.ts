import { describe, it, expect } from 'vitest';
import { pickVoice, isOfflineVoiceAvailable, clampRate } from './speech';

const voice = (lang: string, localService: boolean): SpeechSynthesisVoice =>
  ({ lang, localService, name: `${lang}-${localService}`, default: false, voiceURI: '' }) as SpeechSynthesisVoice;

describe('pickVoice — the zero-egress guarantee', () => {
  it('picks a local voice matching the language', () => {
    const voices = [voice('en-US', true), voice('th-TH', true)];
    expect(pickVoice(voices, 'th')?.lang).toBe('th-TH');
    expect(pickVoice(voices, 'en')?.lang).toBe('en-US');
  });

  it('REJECTS network voices even if the language matches', () => {
    const voices = [voice('th-TH', false)]; // localService:false = cloud voice = egress
    expect(pickVoice(voices, 'th')).toBeNull();
    expect(isOfflineVoiceAvailable(voices, 'th')).toBe(false);
  });

  it('returns null when no voice matches the language', () => {
    expect(pickVoice([voice('en-US', true)], 'th')).toBeNull();
    expect(pickVoice([], 'en')).toBeNull();
  });
});

describe('clampRate', () => {
  it('clamps to 0.1..2 and defaults NaN to 1', () => {
    expect(clampRate(0)).toBe(0.1);
    expect(clampRate(5)).toBe(2);
    expect(clampRate(1.2)).toBe(1.2);
    expect(clampRate(NaN)).toBe(1);
  });
});
