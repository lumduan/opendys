import { describe, it, expect } from 'vitest';
import { estimateOcrScale, DEFAULT_MAX_DIM, DEFAULT_MIN_DIM } from './image';

describe('estimateOcrScale', () => {
  it('leaves mid-range images (between minDim and maxDim) unchanged', () => {
    expect(estimateOcrScale(3000, 2200)).toEqual({ width: 3000, height: 2200, scale: 1 });
    // exact boundaries are no-ops
    expect(estimateOcrScale(DEFAULT_MIN_DIM, 1000).scale).toBe(1);
    expect(estimateOcrScale(DEFAULT_MAX_DIM, 1000).scale).toBe(1);
  });

  it('downscales when the longest edge exceeds maxDim', () => {
    expect(estimateOcrScale(7000, 3500)).toEqual({ width: 3500, height: 1750, scale: 0.5 });
    const tall = estimateOcrScale(1000, 5000, { maxDim: 2500 });
    expect(tall).toEqual({ width: 500, height: 2500, scale: 0.5 });
  });

  it('UPSCALES small inputs toward minDim (the Thai-mark fix)', () => {
    // 1300 longest → ×2 to reach 2600
    expect(estimateOcrScale(1300, 1000)).toEqual({ width: 2600, height: 2000, scale: 2 });
  });

  it('caps the upscale factor so tiny thumbnails are not blown up to mush', () => {
    // 500 longest would need ×5.2 to reach 2600, but maxUpscale=3
    expect(estimateOcrScale(500, 400)).toEqual({ width: 1500, height: 1200, scale: 3 });
  });

  it('respects a custom maxDim (e.g. the smaller Typhoon prep target)', () => {
    expect(estimateOcrScale(3000, 2000, { maxDim: 1800 })).toEqual({
      width: 1800,
      height: 1200,
      scale: 0.6,
    });
    // floor can never exceed the cap, so a small image still only grows toward maxDim
    expect(estimateOcrScale(900, 600, { maxDim: 1800 }).width).toBe(1800);
  });

  it('can disable upscaling via maxUpscale = 1', () => {
    expect(estimateOcrScale(1000, 800, { maxUpscale: 1 })).toEqual({
      width: 1000,
      height: 800,
      scale: 1,
    });
  });

  it('passes through degenerate (zero/negative/NaN) dimensions with scale 1', () => {
    expect(estimateOcrScale(0, 0)).toEqual({ width: 0, height: 0, scale: 1 });
    expect(estimateOcrScale(-10, 100)).toEqual({ width: 0, height: 100, scale: 1 });
    expect(estimateOcrScale(NaN, 100).scale).toBe(1);
  });

  it('falls back to the default cap when maxDim is invalid', () => {
    // longest 5000 > default 3500 → downscale to 3500 despite maxDim: 0
    expect(estimateOcrScale(5000, 100, { maxDim: 0 }).width).toBe(DEFAULT_MAX_DIM);
  });
});
