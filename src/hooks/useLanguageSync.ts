import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Хук для синхронізації мови між frontend та backend
 * Додає заголовок Accept-Language до всіх API запитів
 * Backend вже має підтримку i18n і визначає мову через цей заголовок
 */
export const useLanguageSync = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    // Зберігаємо оригінальний fetch
    const originalFetch = window.fetch;

    // Перевизначаємо fetch для додавання Accept-Language header
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);

      // Додаємо Accept-Language header з поточною мовою
      // Backend підтримує формат: "uk" або "en"
      headers.set('Accept-Language', i18n.language);

      return originalFetch(input, {
        ...init,
        headers,
      });
    };

    // Cleanup: відновлюємо оригінальний fetch
    return () => {
      window.fetch = originalFetch;
    };
  }, [i18n.language]);
};
