/**
 * AppHeader.tsx — persistent top bar with brand, tabs, and language toggle.
 */

import { useTranslation } from 'react-i18next';
import { useApp } from '../store/useApp';
import { setLanguage } from '../i18n';
import type { View } from '../store/AppContext.types';

export function AppHeader() {
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useApp();
  const { view, systemDesign } = state;
  const isArabic = i18n.language === 'ar';

  function goto(target: View) {
    if (target === 'simulation' && !systemDesign) return;
    dispatch({ type: 'NAVIGATE', view: target });
  }

  function toggleLang() {
    setLanguage(isArabic ? 'en' : 'ar');
  }

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="app-header__brand" onClick={() => goto('design')} role="button">
          <SunLogo />
          <div className="app-header__title-group">
            <div className="app-header__title">{t('app.name')}</div>
            <div className="app-header__tagline">{t('app.tagline')}</div>
          </div>
        </div>

        <div className="app-header__right">
          <nav className="app-header__nav">
            <button
              type="button"
              className={`nav-tab ${view === 'design' ? 'nav-tab--on' : ''}`}
              onClick={() => goto('design')}
            >
              {t('nav.design')}
            </button>
            <button
              type="button"
              className={`nav-tab ${view === 'simulation' ? 'nav-tab--on' : ''}`}
              onClick={() => goto('simulation')}
              disabled={!systemDesign}
              title={systemDesign ? undefined : t('nav.simDisabledHint')}
            >
              {t('nav.simulation')}
            </button>
          </nav>

          <button
            type="button"
            className="lang-toggle"
            onClick={toggleLang}
            aria-label="Toggle language"
          >
            <GlobeIcon />
            <span>{isArabic ? t('lang.toggleToEnglish') : t('lang.toggleToArabic')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function SunLogo() {
  return (
    <svg
      className="app-header__logo"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="7" fill="#C8932E" />
      <g stroke="#C8932E" strokeWidth="2.5" strokeLinecap="round">
        <line x1="16" y1="2"  x2="16" y2="6"  />
        <line x1="16" y1="26" x2="16" y2="30" />
        <line x1="2"  y1="16" x2="6"  y2="16" />
        <line x1="26" y1="16" x2="30" y2="16" />
        <line x1="6"  y1="6"  x2="9"  y2="9"  />
        <line x1="23" y1="23" x2="26" y2="26" />
        <line x1="26" y1="6"  x2="23" y2="9"  />
        <line x1="9"  y1="23" x2="6"  y2="26" />
      </g>
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 7h11M7 1.5c1.8 2 1.8 9 0 11M7 1.5c-1.8 2-1.8 9 0 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
