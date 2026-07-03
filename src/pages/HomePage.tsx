import { Link } from 'react-router-dom';
import { strings } from '@/i18n/strings';

export function HomePage() {
  const t = strings.en;
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <div className="hero rounded-box bg-base-100 p-8 shadow-sm">
        <div className="hero-content text-center">
          <div className="max-w-xl">
            <h1 className="text-4xl font-bold">{t.appName}</h1>
            <p className="py-4 text-lg">{t.tagline}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <span className="badge badge-primary badge-lg">English</span>
              <span className="badge badge-accent badge-lg">ภาษาไทย</span>
            </div>
            <div className="mt-6">
              <Link to="/read" className="btn btn-primary btn-lg">
                {t.ocr.title} →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {t.pillars.map((pillar) => (
          <article key={pillar.title} className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <h2 className="card-title text-base">{pillar.title}</h2>
              <p className="text-sm text-base-content/80">{pillar.body}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link to="/dev/thai-colors" className="btn btn-outline btn-sm">
          Preview the Thai 4-level color engine →
        </Link>
      </div>

      <p className="mt-8 text-center text-sm text-base-content/60">
        Offline OCR is live. Reading tools and text-to-speech arrive next (see docs/plans/ROADMAP.md).
      </p>
    </section>
  );
}
