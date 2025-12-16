# Логування у Blackout Calendar

## Рівні логування

У додатку використовується система логування з рівнями (подібно до Winston):

- **debug**: Детальна технічна інформація (завантаження даних, стани підписок, тощо)
- **info**: Загальна інформація про роботу додатку
- **warn**: Попередження про потенційні проблеми
- **error**: Помилки, які потребують уваги

## Production vs Development

**Production (задеплоєний додаток):**
- Фронтенд: тільки `warn` і `error`
- Service Worker: тільки `warn` і `error`
- Консоль браузера чиста від технічних повідомлень

**Development (локальна розробка):**
- Всі рівні логування включені (`debug`, `info`, `warn`, `error`)

## Як увімкнути debug логи у production

Якщо потрібно подивитись технічні логи для діагностики проблем:

### 1. Для фронтенду

Відкрийте консоль браузера (F12) і виконайте:

```javascript
setLogLevel('debug')
```

Тепер ви побачите всі технічні повідомлення. Щоб повернути назад:

```javascript
setLogLevel('warn')
```

### 2. Для Service Worker

У консолі браузера виконайте:

```javascript
setSwLogLevel('debug')
```

Щоб повернути назад:

```javascript
setSwLogLevel('warn')
```

## Приклад використання

```javascript
// Відкрийте консоль (F12)
setLogLevel('debug')  // Увімкнути debug для фронтенду
setSwLogLevel('debug') // Увімкнути debug для Service Worker

// Тепер оновіть сторінку і ви побачите:
// [DEBUG] Loaded 5 notifications from localStorage
// [DEBUG] Loaded 3 notifications from IndexedDB
// [DEBUG] Total unique notifications: 7
// [SW] Push received: {...}
// [SW] Found 1 open clients
// [SW] Sending message to client: https://...
// тощо

// Коли закінчите діагностику, вимкніть debug:
setLogLevel('warn')
setSwLogLevel('warn')
```

## Для розробників

### Додавання нових логів

У коді використовуйте `logger` замість `console.log`:

```typescript
// Фронтенд (TypeScript)
import { logger } from '../utils/logger';

logger.debug('Детальна технічна інфо');
logger.info('Загальна інформація');
logger.warn('Попередження');
logger.error('Помилка', error);
```

```javascript
// Service Worker (JavaScript)
swLogger.debug('Детальна технічна інфо');
swLogger.info('Загальна інформація');
swLogger.warn('Попередження');
swLogger.error('Помилка', error);
```

### Які логи мають бути на якому рівні?

- **debug**: Все що допомагає розуміти внутрішню роботу
  - Завантаження даних
  - Стани підписок
  - Відправка/отримання повідомлень
  - Технічні деталі

- **info**: Важливі події що користувач може захотіти знати
  - "Push notifications not supported"
  - "Successfully subscribed"

- **warn**: Потенційні проблеми
  - "No push subscription to unsubscribe from"
  - "Subscription lost on backend, auto-restoring..."

- **error**: Реальні помилки
  - Failed to load data
  - Network errors
  - Будь-які catch блоки
