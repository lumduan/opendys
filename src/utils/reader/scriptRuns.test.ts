import { describe, it, expect } from 'vitest';
import { splitScriptRuns } from './scriptRuns';

describe('splitScriptRuns', () => {
  it('returns a single run for pure Latin or pure Thai', () => {
    expect(splitScriptRuns('hello')).toEqual([{ script: 'latin', text: 'hello' }]);
    expect(splitScriptRuns('กขค')).toEqual([{ script: 'thai', text: 'กขค' }]);
  });

  it('alternates on script boundaries', () => {
    expect(splitScriptRuns('abกขcd')).toEqual([
      { script: 'latin', text: 'ab' },
      { script: 'thai', text: 'กข' },
      { script: 'latin', text: 'cd' },
    ]);
  });

  it('treats spaces/punctuation as latin', () => {
    expect(splitScriptRuns('ก a')).toEqual([
      { script: 'thai', text: 'ก' },
      { script: 'latin', text: ' a' },
    ]);
  });

  it('handles empty input', () => {
    expect(splitScriptRuns('')).toEqual([]);
  });
});
