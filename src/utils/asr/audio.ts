/**
 * Filename helper for the ASR upload. Pure, so it stays under the `src/utils/**` coverage gate.
 *
 * The hosted Typhoon ASR API validates the multipart part's **Content-Type** (not the filename) against
 * {wav, flac, mp3, ogg, opus} and rejects `audio/webm` — Chrome's MediaRecorder default — with 415
 * (verified live; see docs/plans/realtime-asr-assessment/PoC/README.md). The capture layer therefore
 * uploads WAV (`audio/wav`, accepted on every browser). This maps a blob's container to a matching
 * accepted extension, defaulting to `.wav`.
 */
export function asrFilename(mimeType: string): string {
  const container = mimeType.toLowerCase().split(';')[0].trim();
  let ext = 'wav';
  if (container.includes('ogg')) ext = 'ogg';
  else if (container.includes('opus')) ext = 'opus';
  else if (container.includes('flac')) ext = 'flac';
  else if (container.includes('wav')) ext = 'wav';
  else if (container.includes('mpeg') || container.includes('mp3')) ext = 'mp3';
  return `clip.${ext}`;
}
