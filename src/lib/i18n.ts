import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from '../locales/en/common.json';
import viCommon from '../locales/vi/common.json';
import enNews from '../locales/en/news.json';
import viNews from '../locales/vi/news.json';

export const DVA_LANG_STORAGE_KEY = 'dva_lang';
export type SupportedLanguage = 'en' | 'vi';

const resources = {
  en: {
    common: enCommon,
    news: enNews,
  },
  vi: {
    common: viCommon,
    news: viNews,
  },
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'vi'],
    defaultNS: 'common',
    ns: ['common', 'news'],
    detection: {
      // English-first policy: only read user's explicit saved choice from localStorage;
      // if absent, fall back to 'en' instead of browser locale.
      order: ['localStorage'],
      lookupLocalStorage: DVA_LANG_STORAGE_KEY,
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
