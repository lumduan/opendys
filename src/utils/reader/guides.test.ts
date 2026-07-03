import { describe, it, expect } from 'vitest';
import { buildGuideBackground } from './guides';

describe('buildGuideBackground', () => {
  it('produces four repeating gradient layers keyed to the line box', () => {
    const bg = buildGuideBackground(24, 2); // period = 48
    const image = String(bg.backgroundImage);
    expect((image.match(/repeating-linear-gradient/g) ?? []).length).toBe(4);
    expect(image).toContain('48px'); // period appears as the repeat length
  });

  it('guards degenerate metrics (period never below 1)', () => {
    const bg = buildGuideBackground(0, 0);
    expect(bg.backgroundImage).toBeTruthy();
    expect((String(bg.backgroundImage).match(/repeating-linear-gradient/g) ?? []).length).toBe(4);
  });
});
