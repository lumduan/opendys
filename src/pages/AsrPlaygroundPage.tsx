import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { strings } from '@/i18n/strings';
import { splitSpeechChunks, type SpeechLang } from '@/utils/reader';
import { THAI_COLORS } from '@/utils/thai';
import { saveAsrSession, ASR_STORAGE_KEY } from '@/services/asr/asrHistory';
import { Chunk } from '@/components/reader/Chunk';
import { useAsr } from '@/hooks/useAsr';
import { useAsrHighlight } from '@/hooks/useAsrHighlight';

const SAMPLE_EN = 'The quick brown fox jumps over the lazy dog.';
const SAMPLE_TH = 'เด็กน้อยอ่านหนังสือทุกวัน';

const noop = () => {};

/**
 * PoC sandbox for the real-time ASR reading-assessment feature (Phase 8 / ADR-0007). Not part of the
 * shipping UI — reachable only at `/dev/asr-playground`. Reuses the production render + CSS Custom
 * Highlight pipeline (`Chunk` + `useAsrHighlight`) so green/red/current feedback is validated
 * end-to-end against the same DOM the reader ships.
 */
export function AsrPlaygroundPage() {
  const t = strings.en.asr;
  const [lang, setLang] = useState<SpeechLang>('en');
  const [text, setText] = useState(SAMPLE_EN);
  const [saved, setSaved] = useState(false);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const asr = useAsr();

  const chunks = useMemo(() => splitSpeechChunks(text), [text]);
  useAsrHighlight(asr.evaluation, chunks, surfaceRef);

  const recording = asr.status === 'requesting' || asr.status === 'recording';
  const canPractice = asr.supported && asr.typhoonAsrAvailable && text.trim() !== '';
  const accuracyPct = Math.round((asr.evaluation?.accuracy ?? 0) * 100);
  const missed = asr.evaluation
    ? [...asr.evaluation.mispronounced, ...asr.evaluation.skipped]
    : [];

  const handlePractice = () => {
    setSaved(false);
    void asr.start(text, lang);
  };

  const handleStop = async () => {
    const session = await asr.stop();
    if (session) {
      saveAsrSession(session);
      setSaved(true);
    }
  };

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <Link to="/" className="link text-sm">
          {t.homeLink}
        </Link>
      </div>
      <p className="mb-4 text-sm text-base-content/80">{t.intro}</p>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn btn-sm ${lang === 'en' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setLang('en')}
        >
          {t.langEnglish}
        </button>
        <button
          type="button"
          className={`btn btn-sm ${lang === 'th' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setLang('th')}
        >
          {t.langThai}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setText(lang === 'th' ? SAMPLE_TH : SAMPLE_EN);
            asr.reset();
          }}
        >
          {t.sample}
        </button>
      </div>

      <label className="form-control">
        <span className="label-text mb-1">{t.targetLabel}</span>
        <textarea
          className="textarea textarea-bordered w-full"
          rows={3}
          value={text}
          disabled={recording}
          lang={lang}
          onChange={(event) => {
            setText(event.target.value);
            asr.reset();
          }}
        />
      </label>

      <div role="note" className="alert alert-warning mt-3 text-sm">
        <span>{t.cloudNotice}</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {recording ? (
          <button type="button" className="btn btn-error" onClick={handleStop}>
            {t.stop}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePractice}
            disabled={!canPractice}
          >
            {t.practice}
          </button>
        )}
        {asr.status === 'requesting' && <span className="text-sm">{t.requesting}</span>}
        {asr.status === 'recording' && <span className="text-sm text-success">{t.recording}</span>}
        {asr.status === 'processing' && <span className="text-sm">{t.processing}</span>}
      </div>

      {!asr.supported && (
        <p className="mt-2 text-sm text-base-content/60">{t.errors.unsupported}</p>
      )}
      {asr.supported && !asr.typhoonAsrAvailable && (
        <p className="mt-2 text-sm text-base-content/60">{t.errors.cloudNotConfigured}</p>
      )}
      {asr.error && (
        <div role="alert" className="alert alert-error mt-3 text-sm">
          <span>{t.errors[asr.error]}</span>
        </div>
      )}

      <div
        ref={surfaceRef}
        className="reader-surface mt-6 whitespace-pre-wrap break-words rounded-box bg-base-100 p-6 text-2xl shadow-sm"
        lang={lang}
        data-testid="asr-surface"
      >
        {chunks.map((chunk, index) => (
          <Chunk
            key={index}
            raw={chunk.raw}
            index={index}
            colorCoding={lang === 'th'}
            palette={THAI_COLORS}
            active={false}
            speakable={false}
            onSpeak={noop}
          />
        ))}
      </div>

      {asr.evaluation && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="stat rounded-box bg-base-100 p-4 shadow-sm">
            <div className="stat-title">{t.accuracyLabel}</div>
            <div className="stat-value text-primary">{accuracyPct}%</div>
          </div>
          <div className="rounded-box bg-base-100 p-4 shadow-sm">
            <div className="text-sm font-semibold">{t.mispronouncedLabel}</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {missed.map((word, i) => (
                <span key={i} className="badge badge-error badge-sm" lang={lang}>
                  {word}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {asr.hypothesis && (
        <div className="mt-4 rounded-box bg-base-100 p-4 shadow-sm">
          <div className="text-sm font-semibold">{t.transcriptLabel}</div>
          <p className="mt-1 text-sm text-base-content/80" lang={lang}>
            {asr.hypothesis}
          </p>
        </div>
      )}

      {saved && (
        <p className="mt-3 text-sm text-success">Saved to on-device history ({ASR_STORAGE_KEY}).</p>
      )}
    </section>
  );
}
