/** Image MIME types we accept for OCR. HEIC/PDF are intentionally excluded (no decode path). */
export const ACCEPTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/bmp',
] as const;

export type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];

/** The `accept` attribute value for a file input. */
export function acceptAttribute(): string {
  return ACCEPTED_IMAGE_TYPES.join(',');
}

export function isAcceptedImageFile(file: { type?: string } | null | undefined): boolean {
  if (!file || typeof file.type !== 'string') return false;
  return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type);
}

export interface OcrSupportInput {
  hasWasm: boolean;
  hasWorker: boolean;
}

/** OCR needs both WebAssembly and Web Workers. The hook feeds this real global availability. */
export function computeOcrSupport(input: OcrSupportInput): boolean {
  return Boolean(input.hasWasm && input.hasWorker);
}
