import { Link, Outlet } from 'react-router-dom';
import { strings } from '@/i18n/strings';

export function RootLayout() {
  const t = strings.en;
  return (
    <div className="flex min-h-screen flex-col bg-base-200 text-base-content">
      <header className="navbar bg-base-100 shadow-sm">
        <div className="flex-1">
          <Link to="/" className="btn btn-ghost gap-2 text-xl font-bold">
            <img src="/favicon.svg" alt="" aria-hidden="true" className="h-7 w-7" />
            {t.appName}
          </Link>
        </div>
        <div className="flex-none">
          <span className="badge badge-secondary badge-outline">{t.offlineBadge}</span>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="footer footer-center p-4 text-sm text-base-content/70">
        <aside>
          <p>{t.footer}</p>
        </aside>
      </footer>
    </div>
  );
}
