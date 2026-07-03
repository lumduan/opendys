import { describe, it, expect } from 'vitest';
import { OCR_LANGUAGES, isOcrLanguage, resolveLangString, requiredModelFiles } from './language';

describe('language', () => {
  it('lists the supported selections', () => {
    expect(OCR_LANGUAGES).toEqual(['eng', 'tha', 'eng+tha']);
  });

  it('guards valid/invalid language values', () => {
    expect(isOcrLanguage('eng')).toBe(true);
    expect(isOcrLanguage('eng+tha')).toBe(true);
    expect(isOcrLanguage('fra')).toBe(false);
    expect(isOcrLanguage('')).toBe(false);
  });

  it('resolves the tesseract lang string', () => {
    expect(resolveLangString('eng+tha')).toBe('eng+tha');
  });

  it('lists required model files, splitting combined selections', () => {
    expect(requiredModelFiles('eng')).toEqual(['eng.traineddata.gz']);
    expect(requiredModelFiles('tha')).toEqual(['tha.traineddata.gz']);
    expect(requiredModelFiles('eng+tha')).toEqual([
      'eng.traineddata.gz',
      'tha.traineddata.gz',
    ]);
  });
});
