import { describe, it, expect } from 'vitest';
import {
  ACCEPTED_IMAGE_TYPES,
  acceptAttribute,
  isAcceptedImageFile,
  computeOcrSupport,
} from './support';

describe('support', () => {
  it('accepts common image types and rejects others', () => {
    expect(isAcceptedImageFile({ type: 'image/png' })).toBe(true);
    expect(isAcceptedImageFile({ type: 'image/jpeg' })).toBe(true);
    expect(isAcceptedImageFile({ type: 'image/heic' })).toBe(false);
    expect(isAcceptedImageFile({ type: 'application/pdf' })).toBe(false);
    expect(isAcceptedImageFile({})).toBe(false);
    expect(isAcceptedImageFile(null)).toBe(false);
    expect(isAcceptedImageFile(undefined)).toBe(false);
  });

  it('builds the accept attribute from the type list', () => {
    expect(acceptAttribute()).toBe(ACCEPTED_IMAGE_TYPES.join(','));
    expect(acceptAttribute()).toContain('image/png');
  });

  it('requires both WASM and Worker support', () => {
    expect(computeOcrSupport({ hasWasm: true, hasWorker: true })).toBe(true);
    expect(computeOcrSupport({ hasWasm: true, hasWorker: false })).toBe(false);
    expect(computeOcrSupport({ hasWasm: false, hasWorker: true })).toBe(false);
    expect(computeOcrSupport({ hasWasm: false, hasWorker: false })).toBe(false);
  });
});
