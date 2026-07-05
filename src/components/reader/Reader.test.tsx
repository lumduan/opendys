import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UseAsrResult } from '@/hooks/useAsr';
import type { UseSpeechResult } from '@/hooks/useSpeech';
import type { AsrSession } from '@/utils/asr';

// Mutable holders so each test can set hook state before rendering (hoisted above the vi.mock factories).
const { asrHolder, speechHolder, saveMock } = vi.hoisted(() => ({
  asrHolder: { current: null as unknown as UseAsrResult },
  speechHolder: { current: null as unknown as UseSpeechResult },
  saveMock: vi.fn(),
}));

vi.mock('@/hooks/useAsr', () => ({ useAsr: () => asrHolder.current }));
vi.mock('@/hooks/useSpeech', () => ({ useSpeech: () => speechHolder.current }));
vi.mock('@/services/asr/asrHistory', () => ({ saveAsrSession: saveMock }));

// Imported after the mocks. Reader also uses the real useSettings (SettingsContext has a full default,
// so no provider is needed) and the real highlight hooks (no-ops in jsdom — no CSS.highlights).
import { Reader } from './Reader';

function makeAsr(over: Partial<UseAsrResult> = {}): UseAsrResult {
  return {
    supported: true,
    typhoonAsrAvailable: true,
    status: 'idle',
    error: null,
    hypothesis: '',
    evaluation: null,
    start: vi.fn(async () => {}),
    stop: vi.fn(() => null),
    reset: vi.fn(),
    ...over,
  };
}

function makeSpeech(over: Partial<UseSpeechResult> = {}): UseSpeechResult {
  return {
    supported: true,
    voicesReady: true,
    thaiVoiceAvailable: true,
    englishVoiceAvailable: true,
    speaking: false,
    activeChunkIndex: null,
    activeWord: null,
    speak: vi.fn(),
    speakChunk: vi.fn(),
    stop: vi.fn(),
    ...over,
  };
}

const sessionFixture: AsrSession = {
  id: 'x',
  date: '2026-07-05T00:00:00Z',
  lang: 'en',
  target: 'the cat',
  accuracy: 1,
  totalTokens: 2,
  correct: 2,
  mispronounced: [],
  skipped: [],
};

beforeEach(() => {
  saveMock.mockClear();
  asrHolder.current = makeAsr();
  speechHolder.current = makeSpeech();
});

describe('Reader — Practice control', () => {
  it('hides Practice when ASR is unavailable', () => {
    asrHolder.current = makeAsr({ typhoonAsrAvailable: false });
    const { rerender } = render(<Reader text="the cat" lang="en" />);
    expect(screen.queryByTestId('practice')).toBeNull();

    asrHolder.current = makeAsr({ supported: false });
    rerender(<Reader text="the cat" lang="en" />);
    expect(screen.queryByTestId('practice')).toBeNull();
  });

  it('shows an enabled Practice button when ASR is available and there is text', () => {
    render(<Reader text="the cat" lang="en" />);
    const practice = screen.getByTestId('practice');
    expect(practice).toBeInTheDocument();
    expect(practice).not.toBeDisabled();
  });

  it('disables Practice while TTS is speaking', () => {
    speechHolder.current = makeSpeech({ speaking: true });
    render(<Reader text="the cat" lang="en" />);
    expect(screen.getByTestId('practice')).toBeDisabled();
  });

  it('disables Read Aloud and shows Stop while recording', () => {
    asrHolder.current = makeAsr({ status: 'recording' });
    render(<Reader text="the cat" lang="en" />);
    expect(screen.getByTestId('read-aloud')).toBeDisabled();
    expect(screen.getByTestId('asr-stop')).toBeInTheDocument();
    expect(screen.getByTestId('asr-consent')).toBeInTheDocument(); // consent notice during session
  });

  it('stops TTS before starting practice', () => {
    render(<Reader text="the cat" lang="en" />);
    fireEvent.click(screen.getByTestId('practice'));
    expect(speechHolder.current.stop).toHaveBeenCalled();
    expect(asrHolder.current.start).toHaveBeenCalledWith('the cat', 'en');
    const stopOrder = (speechHolder.current.stop as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    const startOrder = (asrHolder.current.start as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    expect(stopOrder).toBeLessThan(startOrder);
  });

  it('persists the session when practice stops', () => {
    asrHolder.current = makeAsr({ status: 'recording', stop: vi.fn(() => sessionFixture) });
    render(<Reader text="the cat" lang="en" />);
    fireEvent.click(screen.getByTestId('asr-stop'));
    expect(asrHolder.current.stop).toHaveBeenCalled();
    expect(saveMock).toHaveBeenCalledWith(sessionFixture);
  });
});
