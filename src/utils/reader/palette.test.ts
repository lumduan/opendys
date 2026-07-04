import { describe, it, expect } from 'vitest';
import { PALETTES, PALETTE_NAMES, paletteFor } from './palette';
import { contrastRatio } from './contrast';

// Binding backgrounds: DaisyUI cupcake base-100 (the harder case) and pastel base-100.
const BACKGROUNDS = ['#faf7f5', '#ffffff'];
const ROLES = ['consonant', 'vowel', 'upperVowel', 'lowerVowel', 'tone', 'silent'] as const; // neutral = currentColor

describe('reader palettes', () => {
  it('exposes classic + colorblind with a hex per role', () => {
    expect(PALETTE_NAMES).toEqual(['classic', 'colorblind']);
    for (const name of PALETTE_NAMES) {
      for (const role of ROLES) {
        expect(PALETTES[name][role]).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  // Codifies the Phase 5 contrast audit: reader text is large, so AA-large 3:1 is the threshold.
  it('every palette color clears WCAG AA-large (3:1) on cupcake AND pastel', () => {
    for (const name of PALETTE_NAMES) {
      for (const role of ROLES) {
        for (const bg of BACKGROUNDS) {
          const ratio = contrastRatio(PALETTES[name][role], bg);
          expect(ratio, `${name}.${role} on ${bg} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  it('paletteFor falls back to classic for an unknown name', () => {
    expect(paletteFor('nope' as never)).toBe(PALETTES.classic);
  });
});
