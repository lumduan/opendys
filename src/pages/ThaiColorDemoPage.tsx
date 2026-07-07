import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/context/i18nContext';
import { THAI_COLORS, type ColorRole } from '@/utils/thai';
import { buildTextStyle } from '@/utils/latin';
import { ColorText } from '@/components/reader/ColorText';

const SAMPLE = 'เด็กน้อยอ่านหนังสือ รักษ์ภาษาไทย';

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
 * Not part of the shipping UI — a fast way to eyeball correctness.
 */
export function ThaiColorDemoPage() {
  const t = useTranslation().t.thaiDemo;
  const [text, setText] = useState(SAMPLE);
  // Thai letter-spacing MUST stay 0 — tracking detaches combining marks (see ColorText / index.css).
  const readerStyle = buildTextStyle({ fontSizePx: 40, lineHeight: 2.4, letterSpacingEm: 0 });

  const legend: ReadonlyArray<{ role: ColorRole; label: string }> = [
    { role: 'consonant', label: t.legendConsonant },
    { role: 'vowel', label: t.legendVowel },
    { role: 'upperVowel', label: t.legendUpperVowel },
    { role: 'lowerVowel', label: t.legendLowerVowel },
    { role: 'tone', label: t.legendTone },
    { role: 'silent', label: t.legendSilent },
  ];

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <Link to="/" className="link text-sm">
          {t.homeLink}
        </Link>
      </div>

      <label className="form-control">
        <span className="label-text mb-1">{t.placeholder}</span>
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
        <ColorText text={text} palette={THAI_COLORS} />
      </p>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        {legend.map((item) => (
          <Swatch key={item.role} role={item.role} label={item.label} />
        ))}
      </div>
    </section>
  );
}
