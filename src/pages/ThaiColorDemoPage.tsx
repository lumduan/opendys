import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toColorClusters, THAI_COLORS, type ColorRole } from '@/utils/thai';
import { buildTextStyle } from '@/utils/latin';

const SAMPLE = 'เด็กน้อยอ่านหนังสือ รักษ์ภาษาไทย';

const LEGEND: ReadonlyArray<{ role: ColorRole; label: string }> = [
  { role: 'consonant', label: 'Consonant (base)' },
  { role: 'vowel', label: 'Vowel' },
  { role: 'tone', label: 'Tone mark' },
  { role: 'silent', label: 'Silent / final (การันต์)' },
];

function Swatch({ role, label }: { role: ColorRole; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className="inline-block h-4 w-4 rounded"
        style={{ backgroundColor: THAI_COLORS[role] }}
      />
      {label}
    </span>
  );
}

/**
 * Developer preview of the Phase 2 engine: renders the 4-level color model live.
 * Not part of the shipping UI (that arrives in Phase 4) — a fast way to eyeball correctness.
 */
export function ThaiColorDemoPage() {
  const [text, setText] = useState(SAMPLE);
  const clusters = toColorClusters(text);
  const readerStyle = buildTextStyle({ fontSizePx: 40, lineHeight: 2.4, letterSpacingEm: 0.02 });

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Thai 4-level color engine — preview</h1>
        <Link to="/" className="link link-primary text-sm">
          ← Home
        </Link>
      </div>

      <label className="form-control">
        <span className="label-text mb-1">Type or paste Thai text</span>
        <textarea
          className="textarea textarea-bordered w-full font-mono"
          rows={2}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>

      <p
        style={readerStyle}
        lang="th"
        className="mt-6 whitespace-pre-wrap break-words rounded-box bg-base-100 p-6 shadow-sm"
      >
        {clusters.map((cluster, clusterIndex) => (
          <span key={clusterIndex}>
            {cluster.tokens.map((token, tokenIndex) => (
              <span key={tokenIndex} style={{ color: token.color }}>
                {token.char}
              </span>
            ))}
          </span>
        ))}
      </p>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        {LEGEND.map((item) => (
          <Swatch key={item.role} role={item.role} label={item.label} />
        ))}
      </div>
    </section>
  );
}
