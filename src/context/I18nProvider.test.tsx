import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from './I18nProvider';
import { useTranslation } from './i18nContext';
import { LANG_STORAGE_KEY } from '@/utils/i18n';

function Consumer() {
  const { lang, t, toggle } = useTranslation();
  return (
    <>
      <span data-testid="lang">{lang}</span>
      <button type="button" onClick={toggle} data-testid="toggle">
        toggle
      </button>
      <span data-testid="offline">{t.offlineBadge}</span>
    </>
  );
}

afterEach(() => {
  localStorage.clear();
  document.documentElement.lang = '';
  Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true });
});

describe('I18nProvider', () => {
  it('defaults to English for a non-Thai browser and syncs <html lang>', () => {
    Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true });
    render(
      <I18nProvider>
        <Consumer />
      </I18nProvider>,
    );
    expect(screen.getByTestId('lang')).toHaveTextContent('en');
    expect(document.documentElement.lang).toBe('en');
    expect(screen.getByTestId('offline')).toHaveTextContent('100% offline');
  });

  it('detects a Thai browser on first visit', () => {
    Object.defineProperty(navigator, 'language', { value: 'th-TH', configurable: true });
    render(
      <I18nProvider>
        <Consumer />
      </I18nProvider>,
    );
    expect(screen.getByTestId('lang')).toHaveTextContent('th');
    expect(document.documentElement.lang).toBe('th');
  });

  it('honors a pre-seeded stored language on mount', () => {
    localStorage.setItem(LANG_STORAGE_KEY, JSON.stringify({ lang: 'th', v: 1 }));
    render(
      <I18nProvider>
        <Consumer />
      </I18nProvider>,
    );
    expect(screen.getByTestId('lang')).toHaveTextContent('th');
    expect(screen.getByTestId('offline')).toHaveTextContent('ออฟไลน์ 100%');
  });

  it('toggle flips the language, persists, and syncs <html lang>', () => {
    Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true });
    render(
      <I18nProvider>
        <Consumer />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByTestId('toggle'));
    expect(screen.getByTestId('lang')).toHaveTextContent('th');
    expect(screen.getByTestId('offline')).toHaveTextContent('ออฟไลน์ 100%');
    expect(document.documentElement.lang).toBe('th');
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toContain('"lang":"th"');
  });
});
