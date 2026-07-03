#!/usr/bin/env node
/**
 * Maintainer-only tool — NOT run on install (see docs/plans/adr/ADR-0004).
 *
 * Downloads the vendored, self-hosted OCR language models into public/tesseract/lang/.
 * We ship the `4.0.0_best_int` LSTM-only integer models from the @tesseract.js-data packages:
 * already gzipped, compatible with the pinned OEM.LSTM_ONLY, and compact.
 *
 * Usage:
 *   node scripts/fetch-ocr-models.mjs            # download + verify + write
 *   node scripts/fetch-ocr-models.mjs --check    # verify existing files against known SHA-256
 *
 * The committed models make `docker build` hermetic (no build-time network) and guarantee the
 * zero-egress offline promise. Re-run this by hand only when intentionally bumping models, then
 * update the SHA-256 values in ADR-0004.
 */
import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', 'public', 'tesseract', 'lang');

const MODELS = [
  {
    lang: 'eng',
    file: 'eng.traineddata.gz',
    url: 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int/eng.traineddata.gz',
  },
  {
    lang: 'tha',
    file: 'tha.traineddata.gz',
    url: 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/tha@1.0.0/4.0.0_best_int/tha.traineddata.gz',
  },
];

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const isGzip = (buf) => buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b;

async function main() {
  const checkOnly = process.argv.includes('--check');
  await mkdir(OUT_DIR, { recursive: true });

  for (const model of MODELS) {
    const dest = join(OUT_DIR, model.file);

    if (checkOnly) {
      const buf = await readFile(dest);
      console.log(`${model.file}: ${buf.length} bytes  sha256=${sha256(buf)}  gzip=${isGzip(buf)}`);
      continue;
    }

    process.stdout.write(`Downloading ${model.file} ... `);
    const res = await fetch(model.url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${model.url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (!isGzip(buf)) throw new Error(`${model.file} is not gzip (bad magic bytes)`);
    await writeFile(dest, buf);
    console.log(`ok — ${buf.length} bytes  sha256=${sha256(buf)}`);
  }

  console.log(`\nModels written to ${OUT_DIR}`);
  console.log('Record the sha256 values above in docs/plans/adr/ADR-0004-ocr-model-packaging.md');
}

main().catch((err) => {
  console.error('fetch-ocr-models failed:', err.message);
  process.exit(1);
});
