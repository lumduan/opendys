import { describe, it, expect } from 'vitest';
import { parseTyphoonText, extractEntryContent, naturalTextOf, TYPHOON_MAX_DIM } from './typhoon';

const entry = (content: string, success = true) => ({
  success,
  message: { choices: [{ message: { content } }] },
});

describe('naturalTextOf', () => {
  it('prefers the JSON natural_text field', () => {
    expect(naturalTextOf('{"natural_text":"เด็กน้อย"}')).toBe('เด็กน้อย');
  });
  it('falls back to raw content when not JSON (markdown)', () => {
    expect(naturalTextOf('# เด็กน้อย\nอ่านหนังสือ')).toBe('# เด็กน้อย\nอ่านหนังสือ');
  });
  it('falls back to raw content when JSON lacks natural_text', () => {
    expect(naturalTextOf('{"other":1}')).toBe('{"other":1}');
  });
});

describe('extractEntryContent', () => {
  it('reads message.choices[0].message.content', () => {
    expect(extractEntryContent(entry('hello'))).toBe('hello');
  });
  it('returns null for a failed entry', () => {
    expect(extractEntryContent(entry('x', false))).toBeNull();
  });
  it('returns null for malformed shapes', () => {
    expect(extractEntryContent(null)).toBeNull();
    expect(extractEntryContent({})).toBeNull();
    expect(extractEntryContent({ message: {} })).toBeNull();
    expect(extractEntryContent({ message: { choices: [] } })).toBeNull();
    expect(extractEntryContent({ message: { choices: [{}] } })).toBeNull();
    expect(extractEntryContent({ message: { choices: [{ message: { content: 5 } }] } })).toBeNull();
  });
});

describe('parseTyphoonText', () => {
  it('joins natural_text across pages', () => {
    const payload = { results: [entry('{"natural_text":"หน้า1"}'), entry('{"natural_text":"หน้า2"}')] };
    expect(parseTyphoonText(payload)).toBe('หน้า1\n\nหน้า2');
  });
  it('mixes markdown + json content and skips failed/empty entries', () => {
    const payload = {
      results: [
        entry('เจ้าเนื้อละมุน'),
        entry('boom', false), // failed → skipped
        entry('{"natural_text":"   "}'), // empty after trim → skipped
        entry('{"natural_text":"เอย"}'),
      ],
    };
    expect(parseTyphoonText(payload)).toBe('เจ้าเนื้อละมุน\n\nเอย');
  });
  it('accepts a bare array payload', () => {
    expect(parseTyphoonText([entry('hi')])).toBe('hi');
  });
  it('returns empty string for garbage / missing results', () => {
    expect(parseTyphoonText({})).toBe('');
    expect(parseTyphoonText(null)).toBe('');
    expect(parseTyphoonText({ results: 'nope' })).toBe('');
    expect(parseTyphoonText({ results: [null, 42, {}] })).toBe('');
  });
});

describe('TYPHOON_MAX_DIM', () => {
  it('targets ≤1800px (smaller than the Tesseract prep target)', () => {
    expect(TYPHOON_MAX_DIM).toBe(1800);
  });
});
