import { describe, it, expect } from 'vitest';
import { relativeLuminance, contrastRatio } from './contrast';

describe('contrast', () => {
  it('computes relative luminance at the extremes', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
  });

  it('expands 3-digit hex', () => {
    expect(relativeLuminance('#fff')).toBeCloseTo(1, 5);
  });

  it('computes WCAG contrast ratio, order-independent', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1);
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });
});
