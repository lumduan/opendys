import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ColorText } from './ColorText';
import { THAI_COLORS } from '@/utils/thai';

/**
 * Regression guard for the dotted-circle bug: a Thai base consonant and its stacked combining
 * marks (tone / upper-lower vowel / karan) MUST render inside a single `<span>` (one shaping run).
 * The previous per-code-point rendering isolated each mark in its own span and the browser drew it
 * on a dotted circle. These tests pin the one-span-per-grapheme-cluster structure.
 */
function spansOf(text: string): HTMLSpanElement[] {
  const { container } = render(<ColorText text={text} palette={THAI_COLORS} />);
  return Array.from(container.querySelectorAll('span'));
}

describe('ColorText — Thai combining marks stay attached to their base', () => {
  it('renders a base consonant + its tone mark in a SINGLE span (น้)', () => {
    const spans = spansOf('น้');
    expect(spans).toHaveLength(1);
    expect(spans[0].textContent).toBe('น้');
  });

  it('never isolates a combining mark in its own span (เด็กน้อย)', () => {
    // One span per grapheme cluster: เ | ด็ | ก | น้ | อ | ย — the ็ and ้ ride with their base.
    const spans = spansOf('เด็กน้อย');
    expect(spans.map((s) => s.textContent)).toEqual(['เ', 'ด็', 'ก', 'น้', 'อ', 'ย']);
  });

  it('keeps a stacked upper-vowel + tone with the base (เกี่ยว)', () => {
    const spans = spansOf('เกี่ยว');
    expect(spans.map((s) => s.textContent)).toEqual(['เ', 'กี่', 'ย', 'ว']);
  });

  it('colors a karan-silenced final with the non-color underline cue (รักษ์)', () => {
    const spans = spansOf('รักษ์');
    expect(spans.map((s) => s.textContent)).toEqual(['รั', 'ก', 'ษ์']);
    const silentFinal = spans[2];
    expect(silentFinal.textContent).toBe('ษ์');
    expect(silentFinal.style.textDecoration).toContain('underline');
    // The plain consonant carries no underline cue.
    expect(spans[1].style.textDecoration).not.toContain('underline');
  });

  it('gives a leading vowel a different color from the following consonant (เก)', () => {
    const spans = spansOf('เก');
    expect(spans.map((s) => s.textContent)).toEqual(['เ', 'ก']);
    expect(spans[0].style.color).not.toBe('');
    expect(spans[0].style.color).not.toBe(spans[1].style.color);
  });
});
