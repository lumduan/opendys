#!/usr/bin/env node
/**
 * Node OCR smoke test — proves the VENDORED language models decode real text, using the same
 * tesseract.js@7 + OEM.LSTM_ONLY the browser uses. Points langPath at the committed
 * public/tesseract/lang/*.gz (the assets we ship). Fixtures come from gen-ocr-fixtures.py.
 *
 * Usage:  node scripts/ocr-smoke.mjs
 * Exits non-zero if English or Thai recognition misses the expected words.
 */
import { createWorker, OEM } from 'tesseract.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const LANG_PATH = join(HERE, '..', 'public', 'tesseract', 'lang');
const FIXTURES = join(HERE, '..', 'tests', 'fixtures', 'ocr');

async function recognize(lang, imagePath) {
  const worker = await createWorker(lang, OEM.LSTM_ONLY, {
    langPath: LANG_PATH,
    gzip: true,
    cacheMethod: 'none',
  });
  try {
    const { data } = await worker.recognize(imagePath);
    return data.text.trim();
  } finally {
    await worker.terminate();
  }
}

async function main() {
  for (const file of ['eng.png', 'tha.png']) {
    if (!existsSync(join(FIXTURES, file))) {
      throw new Error(`Missing fixture ${file} — run: python3 scripts/gen-ocr-fixtures.py`);
    }
  }

  const eng = await recognize('eng', join(FIXTURES, 'eng.png'));
  console.log('ENG →', JSON.stringify(eng));
  const tha = await recognize('tha', join(FIXTURES, 'tha.png'));
  console.log('THA →', JSON.stringify(tha));

  const engOk = /quick|brown|fox|lazy|dog/i.test(eng);
  // Thai OCR is not character-perfect; accept any high-signal substring match.
  const thaOk = ['หนัง', 'เด็ก', 'อ่าน', 'โรงเรียน', 'หนังสือ'].some((s) => tha.includes(s));

  console.log(`\nengOk=${engOk}  thaOk=${thaOk}`);
  if (!engOk || !thaOk) {
    console.error('OCR SMOKE FAIL');
    process.exit(1);
  }
  console.log('OCR SMOKE PASS ✓');
}

main().catch((err) => {
  console.error('ocr-smoke failed:', err.message);
  process.exit(1);
});
