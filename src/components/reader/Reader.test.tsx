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
    mode: 'free',
    error: null,
    hypothesis: '',
    evaluation: null,
    session: null,
    micLevel: 0,
    start: vi.fn(async () => {}),
    stop: vi.fn(async () => null),
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
    expect(asrHolder.current.start).toHaveBeenCalledWith('the cat', 'en', 'free');
    const stopOrder = (speechHolder.current.stop as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    const startOrder = (asrHolder.current.start as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    expect(stopOrder).toBeLessThan(startOrder);
  });

  it('stops practice on the Stop button', () => {
    asrHolder.current = makeAsr({ status: 'recording' });
    render(<Reader text="the cat" lang="en" />);
    fireEvent.click(screen.getByTestId('asr-stop'));
    expect(asrHolder.current.stop).toHaveBeenCalled();
  });

  it('persists a finished session via the session effect', () => {
    asrHolder.current = makeAsr({ status: 'done', session: sessionFixture });
    render(<Reader text="the cat" lang="en" />);
    expect(saveMock).toHaveBeenCalledWith(sessionFixture);
  });

  it('line mode: the toggle reveals the TTS preview control and a tap-line hint (no Practice button)', () => {
    render(<Reader text="the cat" lang="en" />);
    fireEvent.click(screen.getByTestId('mode-line'));
    expect(screen.getByTestId('tts-preview-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('line-hint')).toBeInTheDocument();
    expect(screen.queryByTestId('practice')).toBeNull(); // practice starts by tapping a line
  });

  it('line mode: clicking a line plays the TTS preview and defers recording until it ends', () => {
    const { container } = render(<Reader text="the cat" lang="en" />);
    fireEvent.click(screen.getByTestId('mode-line'));
    fireEvent.click(container.querySelector('[data-chunk-index="0"]') as HTMLElement);
    expect(speechHolder.current.stop).toHaveBeenCalled();
    expect(speechHolder.current.speakChunk).toHaveBeenCalledWith(
      'the cat',
      'en',
      0,
      expect.any(Number),
      expect.any(Function),
    );
    expect(asrHolder.current.start).not.toHaveBeenCalled(); // recording starts on TTS end, not now
  });

  it('line mode: with TTS preview off, clicking a line records immediately', () => {
    const { container } = render(<Reader text="the cat" lang="en" />);
    fireEvent.click(screen.getByTestId('mode-line'));
    fireEvent.click(screen.getByTestId('tts-preview-toggle')); // disable the preview
    fireEvent.click(container.querySelector('[data-chunk-index="0"]') as HTMLElement);
    expect(asrHolder.current.start).toHaveBeenCalledWith('the cat', 'en', 'line', 0, 5000);
  });

  it('line mode shows the silence auto-stop select (default 5s) when not recording', () => {
    render(<Reader text="the cat" lang="en" />);
    fireEvent.click(screen.getByTestId('mode-line'));
    const select = screen.getByTestId('silence-select') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe('5');
    fireEvent.change(select, { target: { value: '10' } });
    expect(select.value).toBe('10');
  });

  it('line mode labels the stop button "Done reading"', () => {
    const { rerender } = render(<Reader text="the cat" lang="en" />);
    fireEvent.click(screen.getByTestId('mode-line')); // practiceMode -> 'line'
    asrHolder.current = makeAsr({ status: 'recording', mode: 'line' });
    rerender(<Reader text="the cat" lang="en" />);
    expect(screen.getByTestId('asr-stop')).toHaveTextContent('Done reading');
  });

  it('shows a mic-level gauge while recording', () => {
    asrHolder.current = makeAsr({ status: 'recording', mode: 'line', micLevel: 0.5 });
    render(<Reader text="the cat" lang="en" />);
    const meter = screen.getByRole('meter', { name: /microphone level/i });
    expect(meter).toBeInTheDocument();
    expect(meter).toHaveAttribute('aria-valuenow', '50');
  });
});
