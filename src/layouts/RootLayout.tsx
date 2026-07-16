import { Suspense } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useTranslation } from '@/context/i18nContext';
import { SettingsButton } from '@/components/settings/SettingsButton';
import { LanguageToggle } from '@/components/settings/LanguageToggle';

function RouteFallback() {
  const { t } = useTranslation();
  return (
    <div className="flex justify-center p-16">
      <span className="loading loading-spinner loading-lg text-primary" aria-label={t.ui.loading} />
    </div>
  );
}

export function RootLayout() {
  const t = useTranslation().t;
  return (
    <div className="flex min-h-screen flex-col bg-base-200 text-base-content">
      <header className="navbar bg-base-100 shadow-sm">
        <div className="flex-1">
          <Link to="/" className="btn btn-ghost gap-2 text-xl font-bold">
            <img src="/favicon.svg" alt="" aria-hidden="true" className="h-7 w-7" />
            {t.appName}
          </Link>
        </div>
        <div className="flex flex-none items-center gap-1">
          <LanguageToggle />
          <SettingsButton />
          <span className="badge badge-outline hidden sm:inline-flex">{t.offlineBadge}</span>
        </div>
      </header>

      <main className="flex-1">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="footer footer-center p-4 text-sm text-base-content/70">
        <aside>
          <p>{t.footer}</p>
        </aside>
      </footer>
    </div>
  );
}
