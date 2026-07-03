/**
 * Ask the browser for persistent storage so the Service Worker cache (opendys-tesseract-v1) and
 * tesseract.js's IndexedDB model cache aren't evicted under storage pressure. Best-effort:
 * Chromium grants via engagement heuristics; Firefox may prompt. Safe to call every visit
 * (guarded by persisted()).
 */
export async function ensurePersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
