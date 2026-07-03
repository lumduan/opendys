export interface DownscaleResult {
  width: number;
  height: number;
  /** Multiplier applied to the source (1 = no downscale). */
  scale: number;
}

/** Cap the longest edge of an OCR input. Big phone photos are slow and can OOM the WASM heap;
 *  ~2400 px keeps accuracy while bounding cost. */
export const DEFAULT_MAX_DIM = 2400;

/**
 * Compute target dimensions that cap the longest edge at `maxDim`, preserving aspect ratio.
 * Returns `scale: 1` (no change) when already within bounds or on invalid input.
 */
export function estimateDownscale(
  width: number,
  height: number,
  maxDim: number = DEFAULT_MAX_DIM,
): DownscaleResult {
  const w = Number.isFinite(width) && width > 0 ? width : 0;
  const h = Number.isFinite(height) && height > 0 ? height : 0;
  const cap = Number.isFinite(maxDim) && maxDim > 0 ? maxDim : DEFAULT_MAX_DIM;
  const longest = Math.max(w, h);

  if (longest === 0 || longest <= cap) {
    return { width: w, height: h, scale: 1 };
  }

  const scale = cap / longest;
  return { width: Math.round(w * scale), height: Math.round(h * scale), scale };
}
