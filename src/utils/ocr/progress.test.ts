import { describe, it, expect } from 'vitest';
import { mapTesseractProgress } from './progress';

describe('mapTesseractProgress', () => {
  it('maps known statuses to phase + message key', () => {
    expect(mapTesseractProgress({ status: 'initializing tesseract', progress: 0.2 })).toEqual({
      phase: 'preparing',
      percent: 20,
      messageKey: 'initializing',
    });
    expect(mapTesseractProgress({ status: 'loading language traineddata', progress: 0.5 })).toMatchObject({
      phase: 'preparing',
      messageKey: 'loadingLanguage',
    });
    expect(mapTesseractProgress({ status: 'initializing api', progress: 1 })).toMatchObject({
      phase: 'preparing',
      messageKey: 'initializingApi',
    });
    expect(mapTesseractProgress({ status: 'recognizing text', progress: 0.9 })).toEqual({
      phase: 'recognizing',
      percent: 90,
      messageKey: 'recognizing',
    });
  });

  it('treats unknown / missing status as preparing', () => {
    expect(mapTesseractProgress({ status: 'something new', progress: 0.1 })).toMatchObject({
      phase: 'preparing',
      messageKey: 'initializing',
    });
    expect(mapTesseractProgress({}).phase).toBe('preparing');
  });

  it('clamps and rounds percent', () => {
    expect(mapTesseractProgress({ status: 'recognizing text', progress: 1.5 }).percent).toBe(100);
    expect(mapTesseractProgress({ status: 'recognizing text', progress: -1 }).percent).toBe(0);
    expect(mapTesseractProgress({ status: 'recognizing text', progress: 0.456 }).percent).toBe(46);
    expect(mapTesseractProgress({ status: 'recognizing text', progress: NaN }).percent).toBe(0);
    expect(mapTesseractProgress({ status: 'recognizing text' }).percent).toBe(0);
  });
});
