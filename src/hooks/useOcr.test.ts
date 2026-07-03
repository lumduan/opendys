import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useOcr } from './useOcr';

const recognizeMock = vi.fn();
const terminateMock = vi.fn(async () => {});

vi.mock('@/services/ocr/tesseractClient', () => ({
  createTesseractClient: () => ({
    recognize: recognizeMock,
    terminate: terminateMock,
  }),
}));

beforeEach(() => {
  recognizeMock.mockReset();
  terminateMock.mockClear();
  recognizeMock.mockImplementation(async (_img: Blob, _lang: string, onProgress?: (i: unknown) => void) => {
    onProgress?.({ phase: 'recognizing', percent: 50, messageKey: 'recognizing' });
    return { text: 'the quick brown fox', confidence: 91 };
  });
  // jsdom provides WebAssembly but not Worker; stub it so the support check passes.
  vi.stubGlobal('Worker', class {});
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true }) as Response),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const pngBlob = () => new Blob(['x'], { type: 'image/png' });

describe('useOcr', () => {
  it('reports support and starts idle', () => {
    const { result } = renderHook(() => useOcr());
    expect(result.current.isSupported).toBe(true);
    expect(result.current.status).toBe('idle');
  });

  it('transitions to done and exposes recognized text', async () => {
    const { result } = renderHook(() => useOcr());
    await act(async () => {
      await result.current.recognize(pngBlob(), 'eng');
    });
    expect(result.current.status).toBe('done');
    expect(result.current.text).toBe('the quick brown fox');
    expect(result.current.confidence).toBe(91);
    expect(result.current.progress).toBeNull();
  });

  it('rejects a non-image File before doing any work', async () => {
    const { result } = renderHook(() => useOcr());
    const pdf = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    await act(async () => {
      await result.current.recognize(pdf, 'eng');
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('invalidFile');
    expect(recognizeMock).not.toHaveBeenCalled();
  });

  it('errors with modelMissing when a model is not served', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false }) as Response),
    );
    const { result } = renderHook(() => useOcr());
    await act(async () => {
      await result.current.recognize(pngBlob(), 'tha');
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('modelMissing');
    expect(recognizeMock).not.toHaveBeenCalled();
  });

  it('errors with recognizeFailed when the client throws', async () => {
    recognizeMock.mockRejectedValueOnce(new Error('wasm boom'));
    const { result } = renderHook(() => useOcr());
    await act(async () => {
      await result.current.recognize(pngBlob(), 'eng');
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('recognizeFailed');
  });

  it('reports unsupported when Worker is unavailable', async () => {
    vi.stubGlobal('Worker', undefined);
    const { result } = renderHook(() => useOcr());
    expect(result.current.isSupported).toBe(false);
    await act(async () => {
      await result.current.recognize(pngBlob(), 'eng');
    });
    expect(result.current.error).toBe('unsupported');
  });

  it('reset returns to idle and clears the result', async () => {
    const { result } = renderHook(() => useOcr());
    await act(async () => {
      await result.current.recognize(pngBlob(), 'eng');
    });
    expect(result.current.status).toBe('done');
    act(() => result.current.reset());
    expect(result.current.status).toBe('idle');
    expect(result.current.text).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('cancel terminates the client and returns to idle', async () => {
    const { result } = renderHook(() => useOcr());
    await act(async () => {
      await result.current.recognize(pngBlob(), 'eng');
    });
    act(() => result.current.cancel());
    expect(result.current.status).toBe('idle');
    await waitFor(() => expect(terminateMock).toHaveBeenCalled());
  });
});
