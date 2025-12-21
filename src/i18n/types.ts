// Type-safe переклади
export type TranslationNamespace = 'common' | 'ui' | 'notifications' | 'errors' | 'schedule';

// Розширюємо react-i18next types
declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof import('./locales/uk/common.json');
      ui: typeof import('./locales/uk/ui.json');
      notifications: typeof import('./locales/uk/notifications.json');
      errors: typeof import('./locales/uk/errors.json');
      schedule: typeof import('./locales/uk/schedule.json');
    };
  }
}
