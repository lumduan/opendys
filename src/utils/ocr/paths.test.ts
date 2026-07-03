import { describe, it, expect } from 'vitest';
import { buildOcrAssetPaths } from './paths';

describe('buildOcrAssetPaths', () => {
  it('builds root-relative paths for base "/"', () => {
    expect(buildOcrAssetPaths('/')).toEqual({
      workerPath: '/tesseract/worker.min.js',
      corePath: '/tesseract/core',
      langPath: '/tesseract/lang',
    });
  });

  it('respects a sub-path base (with and without trailing slash)', () => {
    expect(buildOcrAssetPaths('/app/')).toEqual({
      workerPath: '/app/tesseract/worker.min.js',
      corePath: '/app/tesseract/core',
      langPath: '/app/tesseract/lang',
    });
    expect(buildOcrAssetPaths('/app').corePath).toBe('/app/tesseract/core');
  });

  it('never gives langPath a trailing slash', () => {
    expect(buildOcrAssetPaths('/').langPath.endsWith('/')).toBe(false);
  });

  it('defaults to the Vite BASE_URL', () => {
    // In the test env BASE_URL is '/'.
    expect(buildOcrAssetPaths().workerPath).toBe('/tesseract/worker.min.js');
  });
});
