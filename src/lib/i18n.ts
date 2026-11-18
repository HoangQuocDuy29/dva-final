import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from '../locales/en/common.json';
import viCommon from '../locales/vi/common.json';
import enNews from '../locales/en/news.json';
import viNews from '../locales/vi/news.json';
import enTournaments from '../locales/en/tournaments.json';
import viTournaments from '../locales/vi/tournaments.json';
import enTryout from '../locales/en/tryout.json';
import viTryout from '../locales/vi/tryout.json';

export const DVA_LANG_STORAGE_KEY = 'dva_lang';
export type SupportedLanguage = 'en' | 'vi';

const resources = {
  en: {
    common: enCommon,
    news: enNews,
    tournaments: enTournaments,
    tryout: enTryout,
  },
  vi: {
    common: viCommon,
    news: viNews,
    tournaments: viTournaments,
    tryout: viTryout,
  },
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs: ['en', 'vi'],
    defaultNS: 'common',
    ns: ['common', 'news', 'tournaments', 'tryout'],
    detection: {
      // English-first policy: initialize to 'en' by default and only persist explicit selection.
      order: ['localStorage'],
      lookupLocalStorage: DVA_LANG_STORAGE_KEY,
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
