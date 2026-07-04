export interface OcrScaleResult {
  width: number;
  height: number;
  /** Multiplier applied to the source: 1 = unchanged, <1 = downscaled, >1 = upscaled. */
  scale: number;
}

/** Cap the longest edge of an OCR input. Big photos are slow and can OOM the WASM heap; ~3500 px
 *  keeps a full A4 page near Tesseract's ~300-DPI sweet spot while bounding cost. */
export const DEFAULT_MAX_DIM = 3500;

/** Upscale small inputs so the longest edge reaches ~this. Tesseract's LSTM wants a text x-height of
 *  ~30 px; Thai tone marks and stacked vowels are the first thing to disintegrate when text is small,
 *  so enlarging a small crop before recognition recovers detail the old downscale-only path lost. */
export const DEFAULT_MIN_DIM = 2600;

/** Never enlarge a source by more than this — upsampling a tiny thumbnail 8× just invents mush. */
export const DEFAULT_MAX_UPSCALE = 3;

export interface EstimateOcrScaleOptions {
  /** Downscale when the longest edge exceeds this (default {@link DEFAULT_MAX_DIM}). */
  maxDim?: number;
  /** Upscale small inputs toward this longest edge (default {@link DEFAULT_MIN_DIM}). */
  minDim?: number;
  /** Cap on the upscale factor (default {@link DEFAULT_MAX_UPSCALE}). */
  maxUpscale?: number;
}

/**
 * Compute target dimensions for OCR, preserving aspect ratio. Downscales when the longest edge
 * exceeds `maxDim`; UPSCALES small inputs toward `minDim` (bounded by `maxUpscale`) so small text
 * isn't starved below the model's resolution sweet spot; leaves mid-range inputs unchanged.
 * Returns `scale: 1` on zero/negative/NaN input.
 */
export function estimateOcrScale(
  width: number,
  height: number,
  {
    maxDim = DEFAULT_MAX_DIM,
    minDim = DEFAULT_MIN_DIM,
    maxUpscale = DEFAULT_MAX_UPSCALE,
  }: EstimateOcrScaleOptions = {},
): OcrScaleResult {
  const w = Number.isFinite(width) && width > 0 ? width : 0;
  const h = Number.isFinite(height) && height > 0 ? height : 0;
  const cap = Number.isFinite(maxDim) && maxDim > 0 ? maxDim : DEFAULT_MAX_DIM;
  // The upscale target can never exceed the downscale cap (that would fight itself).
  const floor = Number.isFinite(minDim) && minDim > 0 ? Math.min(minDim, cap) : 0;
  const upCap = Number.isFinite(maxUpscale) && maxUpscale >= 1 ? maxUpscale : 1;

  // Degenerate input (zero/negative/NaN in either axis) → pass through untouched.
  if (w === 0 || h === 0) return { width: w, height: h, scale: 1 };

  const longest = Math.max(w, h);
  let scale = 1;
  if (longest > cap) {
    scale = cap / longest;
  } else if (longest < floor) {
    scale = Math.min(floor / longest, upCap);
  }

  if (scale === 1) return { width: w, height: h, scale: 1 };
  return { width: Math.round(w * scale), height: Math.round(h * scale), scale };
}
