import { describe, it, expect } from 'vitest';
import { splitSpeechChunks } from '@/utils/reader';
import { tokenizeTarget } from './tokenizeTarget';
import { evaluate } from './session';
import {
  ASR_HISTORY_LIMIT,
  addSession,
  emptyHistory,
  parseHistory,
  serializeHistory,
  summarize,
  type AsrSession,
} from './storage';

const session = (id: string): AsrSession => ({
  id,
  date: '2026-07-04T00:00:00Z',
  lang: 'en',
  target: 'the cat',
  accuracy: 1,
  totalTokens: 2,
  correct: 2,
  mispronounced: [],
  skipped: [],
});

describe('history storage', () => {
  it('starts empty', () => {
    expect(emptyHistory()).toEqual({ version: 1, sessions: [] });
  });

  it('prepends newest-first and caps at the limit', () => {
    let history = emptyHistory();
    for (let i = 0; i <= ASR_HISTORY_LIMIT; i += 1) history = addSession(history, session(`s${i}`));
    expect(history.sessions).toHaveLength(ASR_HISTORY_LIMIT);
    expect(history.sessions[0].id).toBe(`s${ASR_HISTORY_LIMIT}`); // newest at front
    expect(history.sessions.some((s) => s.id === 's0')).toBe(false); // oldest dropped
  });

  it('round-trips through serialize/parse', () => {
    const history = addSession(emptyHistory(), session('a'));
    expect(parseHistory(serializeHistory(history))).toEqual(history);
  });

  it('tolerates null / garbage / wrong shapes', () => {
    expect(parseHistory(null)).toEqual(emptyHistory());
    expect(parseHistory('not json')).toEqual(emptyHistory());
    expect(parseHistory('123')).toEqual(emptyHistory());
    expect(parseHistory('{}')).toEqual(emptyHistory());
    expect(parseHistory('{"sessions":"x"}')).toEqual(emptyHistory());
  });

  it('filters out non-object session entries', () => {
    const parsed = parseHistory('{"sessions":[null,{"id":"a"}]}');
    expect(parsed.sessions).toHaveLength(1);
    expect(parsed.sessions[0]).toMatchObject({ id: 'a' });
  });

  it('summarizes an evaluation into a persistable record', () => {
    const tokens = tokenizeTarget(splitSpeechChunks('the cat sat'));
    const e = evaluate(tokens, 'the sat', tokens.length);
    const record = summarize(e, { id: 'x', date: '2026-07-04', lang: 'en', target: 'the cat sat' });
    expect(record).toEqual({
      id: 'x',
      date: '2026-07-04',
      lang: 'en',
      target: 'the cat sat',
      accuracy: e.accuracy,
      totalTokens: 3,
      correct: 2,
      mispronounced: [],
      skipped: ['cat'],
    });
  });
});
