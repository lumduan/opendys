import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAsr } from './useAsr';
import { TyphoonAsrError } from '@/services/asr/typhoonAsrClient';

const transcribeMock = vi.fn();
const terminateMock = vi.fn(async () => {});

// Partial mock: keep the real TyphoonAsrError (used for `instanceof` mapping), stub the factory.
vi.mock('@/services/asr/typhoonAsrClient', async (importActual) => {
  const actual = await importActual<typeof import('./../services/asr/typhoonAsrClient')>();
  return {
    ...actual,
    createTyphoonAsrClient: () => ({ transcribe: transcribeMock, terminate: terminateMock }),
  };
});

class MockAudioWorkletNode {
  static last: MockAudioWorkletNode | null = null;
  port: { onmessage: ((event: { data: Float32Array }) => void) | null } = { onmessage: null };
  constructor() {
    MockAudioWorkletNode.last = this;
  }
  connect() {}
  disconnect() {}
  feed(samples: Float32Array) {
    this.port.onmessage?.({ data: samples });
  }
}

class MockAudioContext {
  sampleRate = 48000;
  state: 'running' | 'closed' = 'running';
  destination = {};
  audioWorklet = { addModule: vi.fn(async () => {}) };
  createMediaStreamSource() {
    return { connect: vi.fn(), disconnect: vi.fn() };
  }
  async close() {
    this.state = 'closed';
  }
}

const fakeStream = () => ({ getTracks: () => [{ stop: vi.fn() }] }) as unknown as MediaStream;
let getUserMediaMock: ReturnType<typeof vi.fn>;

function stubCapabilities(asr: boolean) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ asr }) }) as unknown as Response),
  );
}

beforeEach(() => {
  transcribeMock.mockReset();
  transcribeMock.mockResolvedValue({ text: 'the cat' });
  terminateMock.mockClear();
  MockAudioWorkletNode.last = null;
  getUserMediaMock = vi.fn(async () => fakeStream());
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: getUserMediaMock },
    configurable: true,
    writable: true,
  });
  vi.stubGlobal('AudioContext', MockAudioContext);
  vi.stubGlobal('AudioWorkletNode', MockAudioWorkletNode);
  vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' });
  stubCapabilities(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('useAsr', () => {
  it('reports support and starts idle', async () => {
    const { result } = renderHook(() => useAsr());
    expect(result.current.supported).toBe(true);
    expect(result.current.status).toBe('idle');
    await act(async () => {
      await flush(); // let the capability probe settle inside act
    });
  });

  it('probes cloud availability from /api/ocr-capabilities', async () => {
    const { result } = renderHook(() => useAsr());
    await waitFor(() => expect(result.current.typhoonAsrAvailable).toBe(true));
  });

  it('leaves ASR unavailable when the probe reports asr:false', async () => {
    stubCapabilities(false);
    const { result } = renderHook(() => useAsr());
    await flush();
    expect(result.current.typhoonAsrAvailable).toBe(false);
  });

  it('reports unsupported when the AudioWorklet API is missing', async () => {
    vi.stubGlobal('AudioWorkletNode', undefined);
    const { result } = renderHook(() => useAsr());
    expect(result.current.supported).toBe(false);
    await act(async () => {
      await result.current.start('the cat', 'en');
    });
    expect(result.current.error).toBe('unsupported');
  });

  it('maps a denied microphone permission', async () => {
    getUserMediaMock.mockRejectedValueOnce(new DOMException('no', 'NotAllowedError'));
    const { result } = renderHook(() => useAsr());
    await act(async () => {
      await result.current.start('the cat', 'en');
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('micDenied');
  });

  it('maps a missing microphone to micUnavailable', async () => {
    getUserMediaMock.mockRejectedValueOnce(new Error('no device'));
    const { result } = renderHook(() => useAsr());
    await act(async () => {
      await result.current.start('the cat', 'en');
    });
    expect(result.current.error).toBe('micUnavailable');
  });

  it('transcribes a WAV window and scores the reading', async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useAsr());
      await act(async () => {
        await result.current.start('the cat', 'en');
      });
      expect(result.current.status).toBe('recording');

      act(() => {
        MockAudioWorkletNode.last?.feed(new Float32Array(1600)); // one window's worth of PCM
      });
      await act(async () => {
        vi.advanceTimersByTime(4000); // fire the window interval → encode WAV → transcribe
        await flush();
      });

      expect(result.current.hypothesis).toContain('the cat');
      expect(result.current.evaluation?.accuracy).toBe(1);

      let session: ReturnType<typeof result.current.stop> = null;
      act(() => {
        session = result.current.stop();
      });
      expect(result.current.status).toBe('done');
      expect(session).toMatchObject({ target: 'the cat', lang: 'en', accuracy: 1 });
    } finally {
      vi.useRealTimers();
    }
  });

  it('maps a cloud auth failure', async () => {
    transcribeMock.mockRejectedValueOnce(new TyphoonAsrError('auth'));
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useAsr());
      await act(async () => {
        await result.current.start('the cat', 'en');
      });
      act(() => {
        MockAudioWorkletNode.last?.feed(new Float32Array(1600));
      });
      await act(async () => {
        vi.advanceTimersByTime(4000);
        await flush();
      });
      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe('cloudAuth');
    } finally {
      vi.useRealTimers();
    }
  });

  it('reset returns to idle and clears state', async () => {
    const { result } = renderHook(() => useAsr());
    await act(async () => {
      await result.current.start('the cat', 'en');
    });
    act(() => result.current.reset());
    expect(result.current.status).toBe('idle');
    expect(result.current.evaluation).toBeNull();
    expect(result.current.hypothesis).toBe('');
  });

  // Guided mode flushes on a pause (VAD) rather than a timer: feed a "speech" frame then a long
  // "silence" frame (~666 ms > the 600 ms threshold) to trigger one utterance flush.
  const sayThenPause = (transcript: string) => {
    transcribeMock.mockResolvedValueOnce({ text: transcript });
    MockAudioWorkletNode.last?.feed(new Float32Array(1600).fill(0.1)); // speech (rms 0.1)
    MockAudioWorkletNode.last?.feed(new Float32Array(32000)); // ~666 ms silence → flush
  };

  it('guided mode advances the cursor one word at a time', async () => {
    const { result } = renderHook(() => useAsr());
    await act(async () => {
      await result.current.start('the cat', 'en', 'guided');
    });
    expect(result.current.mode).toBe('guided');
    expect(result.current.status).toBe('recording');

    await act(async () => {
      sayThenPause('the'); // read only the first word
      await flush();
    });
    expect(result.current.evaluation?.frontier).toBe(1); // cursor moved past "the", waits on "cat"
    expect(result.current.evaluation?.status[0]).toBe('correct');
    expect(result.current.status).toBe('recording'); // not finished
  });

  it('guided mode auto-finishes and exposes a session at the last word', async () => {
    const { result } = renderHook(() => useAsr());
    await act(async () => {
      await result.current.start('the cat', 'en', 'guided');
    });
    await act(async () => {
      sayThenPause('the cat'); // both words in one utterance
      await flush();
    });
    expect(result.current.status).toBe('done');
    expect(result.current.evaluation?.frontier).toBe(2);
    expect(result.current.session).toMatchObject({ target: 'the cat', lang: 'en' });
  });

  it('guided skip advances past the current word and marks it skipped', async () => {
    const { result } = renderHook(() => useAsr());
    await act(async () => {
      await result.current.start('the cat', 'en', 'guided');
    });
    act(() => result.current.skip());
    expect(result.current.evaluation?.frontier).toBe(1);
    expect(result.current.evaluation?.status[0]).toBe('skipped');
  });
});
