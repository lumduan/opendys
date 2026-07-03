export interface OcrAssetPaths {
  workerPath: string;
  corePath: string;
  langPath: string;
}

function stripTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

/**
 * Build the self-hosted tesseract asset URLs (see ADR-0004). Defaults to Vite's `BASE_URL` so a
 * sub-path deployment (base !== '/') still resolves. These are plain runtime strings — never
 * imported assets — so Vite does not attempt to bundle them.
 *
 * - `corePath` is a DIRECTORY (tesseract's loader appends the CPU-selected core filename).
 * - `langPath` has NO trailing slash (tesseract appends `/<lang>.traineddata.gz`).
 */
export function buildOcrAssetPaths(base: string = import.meta.env.BASE_URL): OcrAssetPaths {
  const root = `${stripTrailingSlash(base)}/tesseract`;
  return {
    workerPath: `${root}/worker.min.js`,
    corePath: `${root}/core`,
    langPath: `${root}/lang`,
  };
}
