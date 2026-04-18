/**
 * i18n setup for SolarBrain.
 *
 * - Loads English + Arabic dictionaries
 * - Remembers the user's choice in localStorage (key 'sb-lang')
 * - Defaults to English on first visit
 * - Exposes `setLanguage()` which updates i18next AND the <html lang / dir>
 *   attributes so CSS selectors and accessibility tools both get it right
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './en';
import { ar } from './ar';

const STORAGE_KEY = 'sb-lang';

export type Language = 'en' | 'ar';

function readInitial(): Language {
  if (typeof window === 'undefined') return 'en';
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === 'ar' ? 'ar' : 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: readInitial(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// Sync the <html> attributes with the current language.
applyHtmlAttrs(readInitial());

/** Change language + persist + update <html lang / dir>. */
export function setLanguage(lang: Language) {
  i18n.changeLanguage(lang);
  try { window.localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
  applyHtmlAttrs(lang);
}

function applyHtmlAttrs(lang: Language) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
  document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
}

export { i18n };
