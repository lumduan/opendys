import { describe, it, expect } from 'vitest';
import { estimateDownscale, DEFAULT_MAX_DIM } from './image';

describe('estimateDownscale', () => {
  it('leaves images within bounds unchanged', () => {
    expect(estimateDownscale(800, 600)).toEqual({ width: 800, height: 600, scale: 1 });
    expect(estimateDownscale(DEFAULT_MAX_DIM, 100).scale).toBe(1);
  });

  it('downscales a wide image capping the longest edge', () => {
    const r = estimateDownscale(4800, 2400, 2400);
    expect(r).toEqual({ width: 2400, height: 1200, scale: 0.5 });
  });

  it('downscales a tall image', () => {
    const r = estimateDownscale(1000, 5000, 2500);
    expect(r.height).toBe(2500);
    expect(r.width).toBe(500);
    expect(r.scale).toBeCloseTo(0.5);
  });

  it('returns scale 1 for zero/negative/NaN dimensions', () => {
    expect(estimateDownscale(0, 0)).toEqual({ width: 0, height: 0, scale: 1 });
    expect(estimateDownscale(-10, 100)).toEqual({ width: 0, height: 100, scale: 1 });
    expect(estimateDownscale(NaN, 100).scale).toBe(1);
  });

  it('falls back to the default cap when maxDim is invalid', () => {
    expect(estimateDownscale(5000, 100, 0).width).toBe(DEFAULT_MAX_DIM);
  });
});
