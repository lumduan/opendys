import { useState } from 'react';
import { Link } from 'react-router-dom';
import { strings } from '@/i18n/strings';
import { Reader } from '@/components/reader/Reader';
import { detectPrimaryScript, type SpeechLang } from '@/utils/reader';

const SAMPLE = 'เด็กน้อยอ่านหนังสือที่โรงเรียน รักษ์ภาษาไทย — The quick brown fox jumps over the lazy dog.';

/** Standalone "paste & read" surface — exercises every Phase 4 feature without OCR. */
export function ReaderPage() {
  const t = strings.en.reader;
  const [text, setText] = useState('');
  const [lang, setLang] = useState<SpeechLang>('en');

  const loadSample = () => {
    setText(SAMPLE);
    setLang(detectPrimaryScript(SAMPLE));
  };

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t.pageTitle}</h1>
          <p className="mt-1 text-sm text-base-content/70">{t.pageIntro}</p>
        </div>
        <Link to="/" className="link link-primary shrink-0 text-sm">
          ← Home
        </Link>
      </header>

      <div className="mb-5 space-y-2">
        <textarea
          className="textarea textarea-bordered w-full"
          rows={4}
          placeholder={t.placeholder}
          value={text}
          onChange={(event) => setText(event.target.value)}
          data-testid="reader-input"
        />
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" className="tabs tabs-boxed">
            <button
              role="tab"
              type="button"
              className={`tab ${lang === 'en' ? 'tab-active' : ''}`}
              onClick={() => setLang('en')}
            >
              {t.langEnglish}
            </button>
            <button
              role="tab"
              type="button"
              className={`tab ${lang === 'th' ? 'tab-active' : ''}`}
              onClick={() => setLang('th')}
            >
              {t.langThai}
            </button>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={loadSample}>
            {t.sample}
          </button>
        </div>
      </div>

      {text.trim() && <Reader text={text} lang={lang} />}
    </section>
  );
}
