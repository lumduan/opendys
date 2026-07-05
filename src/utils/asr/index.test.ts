import { describe, it, expect } from 'vitest';
import * as asr from './index';

describe('asr barrel', () => {
  it('re-exports the public surface', () => {
    expect(typeof asr.evaluate).toBe('function');
    expect(typeof asr.joinWindows).toBe('function');
    expect(typeof asr.alignTokens).toBe('function');
    expect(typeof asr.readingFrontier).toBe('function');
    expect(typeof asr.tokenizeTarget).toBe('function');
    expect(typeof asr.tokenizeHypothesis).toBe('function');
    expect(typeof asr.normalizeToken).toBe('function');
    expect(typeof asr.similarity).toBe('function');
    expect(typeof asr.tokensMatch).toBe('function');
    expect(typeof asr.highlightGroups).toBe('function');
    expect(typeof asr.parseAsrText).toBe('function');
    expect(typeof asr.asrFilename).toBe('function');
    expect(typeof asr.encodeWav).toBe('function');
    expect(asr.WAV_MIME).toBe('audio/wav');
    expect(typeof asr.summarize).toBe('function');
    expect(asr.ASR_HISTORY_LIMIT).toBe(100);
    expect(asr.DEFAULT_MATCH_THRESHOLD).toBe(0.7);
  });
});
