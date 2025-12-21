import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import всіх перекладів
import commonUk from './locales/uk/common.json';
import uiUk from './locales/uk/ui.json';
import notificationsUk from './locales/uk/notifications.json';
import errorsUk from './locales/uk/errors.json';
import scheduleUk from './locales/uk/schedule.json';

import commonEn from './locales/en/common.json';
import uiEn from './locales/en/ui.json';
import notificationsEn from './locales/en/notifications.json';
import errorsEn from './locales/en/errors.json';
import scheduleEn from './locales/en/schedule.json';

// Конфігурація LanguageDetector для синхронізації з бекендом
const detectionOptions = {
  order: ['localStorage', 'navigator'], // Пріоритет: localStorage -> browser preference
  caches: ['localStorage'], // Зберігати вибір в localStorage
  lookupLocalStorage: 'i18nextLng', // Ключ для localStorage
};

i18n
  .use(LanguageDetector) // Автоматичне визначення мови
  .use(initReactI18next) // React інтеграція
  .init({
    resources: {
      uk: {
        common: commonUk,
        ui: uiUk,
        notifications: notificationsUk,
        errors: errorsUk,
        schedule: scheduleUk,
      },
      en: {
        common: commonEn,
        ui: uiEn,
        notifications: notificationsEn,
        errors: errorsEn,
        schedule: scheduleEn,
      },
    },
    fallbackLng: 'uk', // Мова за замовчуванням
    defaultNS: 'common', // Namespace за замовчуванням
    detection: detectionOptions,
    interpolation: {
      escapeValue: false, // React вже захищає від XSS
    },
    react: {
      useSuspense: false, // Для PWA краще без Suspense
    },
  });

export default i18n;
