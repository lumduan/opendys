import { estimateDownscale, DEFAULT_MAX_DIM } from '@/utils/ocr';

/**
 * Prepare an image for OCR: decode with EXIF orientation applied (phone photos are often
 * rotated), downscale very large images (speed + WASM heap), and re-encode to a clean PNG Blob.
 * DOM-dependent (canvas / createImageBitmap) — runs in the browser, not under jsdom tests.
 */
export async function prepareForOcr(file: Blob, maxDim: number = DEFAULT_MAX_DIM): Promise<Blob> {
  const bitmap = await decodeOriented(file);
  try {
    const { width, height } = estimateDownscale(bitmap.width, bitmap.height, maxDim);
    return await drawToBlob(bitmap, width, height);
  } finally {
    bitmap.close();
  }
}

async function decodeOriented(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Older engines: decode without explicit orientation handling.
    return await createImageBitmap(file);
  }
}

function drawToBlob(bitmap: ImageBitmap, width: number, height: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob returned null'))),
      'image/png',
    );
  });
}
