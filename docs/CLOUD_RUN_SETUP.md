# Google Cloud Run Environment Setup

## Problem

Frontend на Google Cloud Run не може відправляти API запити до backend на Render, тому що відсутня environment variable `API_URL` для nginx проксі.

## Symptoms

Консоль браузера показує:
```
/api/notifications/update-queue:1  Failed to load resource: the server responded with a status of 404 ()
[WARN] Failed to update queue, subscription might be missing on backend
```

## Solution

Потрібно додати environment variable `API_URL` в Google Cloud Run.

---

## Варіант 1: Через Google Cloud Console (Web UI)

1. Відкрити [Google Cloud Console](https://console.cloud.google.com/)
2. Перейти до **Cloud Run** → Вибрати ваш сервіс
3. Натиснути **"EDIT & DEPLOY NEW REVISION"** (вгорі)
4. Прокрутити до розділу **"Container, Variables & Secrets, Connections, Security"**
5. Перейти на вкладку **"Variables & Secrets"**
6. В секції **"Environment variables"** натиснути **"+ ADD VARIABLE"**
7. Додати:
   - **Name:** `API_URL`
   - **Value:** `https://blackout-calendar.onrender.com`
8. Натиснути **"DEPLOY"** внизу сторінки
9. Дочекатися завершення деплою (~2-3 хвилини)

---

## Варіант 2: Через gcloud CLI

Якщо встановлено gcloud CLI:

```bash
# Встановити змінну оточення
gcloud run services update SERVICE_NAME \
  --update-env-vars API_URL=https://blackout-calendar.onrender.com \
  --region=REGION

# Приклад (замініть SERVICE_NAME та REGION на свої):
gcloud run services update blackout-calendar-web \
  --update-env-vars API_URL=https://blackout-calendar.onrender.com \
  --region=us-west1
```

---

## Перевірка

Після деплою:

1. Відкрити ваш сайт на Cloud Run URL
2. Відкрити DevTools (F12) → вкладка **Network**
3. Вибрати чергу в налаштуваннях сповіщень
4. Перевірити, що запит `/api/notifications/update-queue` йде на `https://blackout-calendar.onrender.com` і повертає 200 OK

---

## Як це працює

1. **Nginx** в Docker контейнері використовує `nginx.conf.template`
2. Template містить: `proxy_pass ${API_URL};`
3. Nginx автоматично замінює `${API_URL}` на значення environment variable при старті
4. Якщо `API_URL` не встановлена, використовується дефолт з Dockerfile: `https://blackout-calendar.onrender.com`
5. **Проблема:** Google Cloud Run НЕ підхоплює дефолтне значення з Dockerfile, тому потрібно явно встановити через Cloud Run settings

---

## Додаткова інформація

### Перевірити поточні environment variables:

```bash
gcloud run services describe SERVICE_NAME --region=REGION --format="value(spec.template.spec.containers[0].env)"
```

### Видалити environment variable (якщо потрібно):

```bash
gcloud run services update SERVICE_NAME \
  --remove-env-vars API_URL \
  --region=REGION
```

### Переглянути всі сервіси Cloud Run:

```bash
gcloud run services list
```

---

## Troubleshooting

### Якщо після деплою все ще 404:

1. Перевірити, що новий revision активний:
   ```bash
   gcloud run revisions list --service=SERVICE_NAME --region=REGION
   ```

2. Перевірити логи Cloud Run:
   ```bash
   gcloud run logs read --service=SERVICE_NAME --region=REGION --limit=50
   ```

3. Перевірити, що nginx бачить змінну:
   - В Cloud Run logs шукати рядок з `proxy_pass`

### Якщо API_URL не підхоплюється:

Можливо, потрібно перебілдити образ. Переконайтесь, що в `Dockerfile` є:

```dockerfile
# Copy custom nginx config template
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Default API URL (can be overridden at runtime)
ENV API_URL=https://blackout-calendar.onrender.com
```

І в `nginx.conf.template`:

```nginx
location /api/ {
    proxy_pass ${API_URL};
    proxy_ssl_server_name on;
    # ... інші налаштування
}
```

---

## Підсумок

**Що треба зробити:**
1. Відкрити Google Cloud Run console
2. Edit & Deploy New Revision
3. Додати environment variable: `API_URL=https://blackout-calendar.onrender.com`
4. Deploy
5. Дочекатися завершення і перевірити роботу

**Очікуваний результат:**
- Запити `/api/*` з фронтенду будуть проксуватися на `https://blackout-calendar.onrender.com/api/*`
- Сповіщення зможуть оновлювати обрану чергу без помилок 404
