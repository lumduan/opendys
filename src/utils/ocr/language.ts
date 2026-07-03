/** Supported OCR language selections. `eng+tha` runs both models ("auto"). */
export type OcrLanguage = 'eng' | 'tha' | 'eng+tha';

export const OCR_LANGUAGES: readonly OcrLanguage[] = ['eng', 'tha', 'eng+tha'];

export function isOcrLanguage(value: string): value is OcrLanguage {
  return (OCR_LANGUAGES as readonly string[]).includes(value);
}

/** The tesseract language string for `createWorker` (centralized mapping point). */
export function resolveLangString(lang: OcrLanguage): string {
  return lang;
}

/** The traineddata files that must be present/served for a given selection. */
export function requiredModelFiles(lang: OcrLanguage): string[] {
  return lang.split('+').map((code) => `${code}.traineddata.gz`);
}
