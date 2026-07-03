import { THAI_COLORS, type ColorRole } from '@/utils/thai';

export type PaletteName = 'classic' | 'colorblind';

export const PALETTE_NAMES: readonly PaletteName[] = ['classic', 'colorblind'];

/**
 * The two 4-level color palettes for Thai rendering.
 * - `classic` = the FR-3 spec palette (consonant charcoal / vowel red / tone green / silent blue).
 * - `colorblind` = an Okabe-Ito–derived set that stays distinguishable under deuteranopia/protanopia
 *   (the red/green pair is otherwise confusable). All clear WCAG AA-large 3:1 on cupcake + pastel;
 *   the silent role also carries a non-color underline cue (see ColorText).
 */
export const PALETTES: Record<PaletteName, Record<ColorRole, string>> = {
  classic: THAI_COLORS,
  colorblind: {
    consonant: '#333333',
    vowel: '#d55e00', // Okabe-Ito vermilion
    tone: '#0072b2', // Okabe-Ito blue
    silent: '#aa3377', // Paul Tol magenta
    neutral: 'currentColor',
  },
};

export function paletteFor(name: PaletteName): Record<ColorRole, string> {
  return PALETTES[name] ?? PALETTES.classic;
}
