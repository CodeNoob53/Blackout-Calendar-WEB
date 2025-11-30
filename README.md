# ⚡ Blackout Calendar WEB

**Сучасний веб-додаток для моніторингу графіків відключень електроенергії**

[![React](https://img.shields.io/badge/React-19.2.0-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite)](https://vitejs.dev/)
[![CSS](https://img.shields.io/badge/CSS-BEM-1572B6?logo=css3)](https://en.bem.info/)

[🌐 Live Demo](https://blackout-calendar-122838488015.us-west1.run.app/) • [📖 API Docs](https://github.com/CodeNoob53/blackout_calendar) • [🎨 Style Guide](./STYLE_GUIDE.md)

</div>

---

## 📋 Зміст

- [Про проєкт](#-про-проєкт)
- [Можливості](#-можливості)
- [Технологічний стек](#️-технологічний-стек)
- [Швидкий старт](#-швидкий-старт)
- [Структура проєкту](#-структура-проєкту)
- [Розробка](#-розробка)
- [Changelog](#-changelog)
- [Ліцензія](#-ліцензія)

---

## 🎯 Про проєкт

**Blackout Calendar WEB** — це Progressive Web Application (PWA) для зручного перегляду графіків планових відключень електроенергії в Україні. Додаток надає інтуїтивний інтерфейс для відстеження розкладу відключень, підтримує офлайн-режим та push-сповіщення.

### Ключові переваги

- 🎨 **Сучасний дизайн** - Чистий UI з підтримкою світлої та темної теми
- 📱 **PWA** - Працює як нативний додаток на будь-якому пристрої
- 🔔 **Push-сповіщення** - Отримуйте сповіщення за 30 хвилин до відключення
- 📊 **Візуалізація** - Наочний timeline з графіком відключень на добу
- 🌐 **Офлайн-режим** - Працює без інтернету завдяки Service Worker
- ⚡ **Швидкість** - Оптимізована збірка з code splitting та lazy loading

---

## 🚀 Можливості

### Основний функціонал

- ✅ Перегляд графіків відключень для всіх 12 черг (1.1 - 6.2)
- ✅ Вибір дати (вчора, сьогодні, завтра)
- ✅ Візуальний timeline з поточним часом
- ✅ Детальна інформація про інтервали відключень
- ✅ Збереження обраної черги в localStorage
- ✅ Автоматичне визначення теми системи

### Сповіщення

- 🔔 Push-сповіщення за 30 хвилин до відключення
- 🔔 Сповіщення про включення світла
- 🔔 Сповіщення про зміни в графіку
- ⚙️ Налаштування типів сповіщень

### PWA функції

- 📲 Встановлення на домашній екран
- 🔄 Автоматичне оновлення даних
- 💾 Кешування для офлайн-доступу
- 🎨 Адаптивний дизайн для всіх пристроїв

---

## 🛠️ Технологічний стек

### Core

- **React 19.2** - UI бібліотека
- **TypeScript 5.6** - Типізація
- **Vite 6.0** - Збірка та dev-сервер

### Styling

- **Vanilla CSS** - Чистий CSS без фреймворків
- **BEM Methodology** - Методологія найменування класів
- **CSS Custom Properties** - Система дизайн-токенів
- **Google Sans Text** - Шрифт

### Tools & Libraries

- **Lucide React** - Іконки
- **Stylelint** - CSS лінтер
- **Service Worker** - PWA функціонал
- **Notification API** - Push-сповіщення

### API

Додаток використовує [Blackout Calendar API](https://github.com/CodeNoob53/blackout_calendar) для отримання даних про графіки відключень.

---

## ⚡ Швидкий старт

### Передумови

- Node.js 18+ або Yarn
- Git

### Встановлення

```bash
# 1. Клонуйте репозиторій
git clone https://github.com/CodeNoob53/Blackout-Calendar-WEB.git
cd Blackout-Calendar-WEB

# 2. Встановіть залежності
npm install
# або
yarn install

# 3. Створіть .env.local файл (опціонально)
cp .env.example .env.local

# 4. Запустіть dev-сервер
npm run dev
# або
yarn dev
```

Додаток буде доступний за адресою `http://localhost:5173`

### Збірка для production

```bash
# Створити production збірку
npm run build

# Переглянути production збірку локально
npm run preview
```

---

## 📁 Структура проєкту

```
Blackout-Calendar-WEB/
├── public/              # Статичні файли
│   ├── manifest.json    # PWA manifest
│   └── service-worker.js # Service Worker
├── src/
│   ├── components/      # React компоненти
│   │   ├── layout/      # Layout компоненти (Header, Footer)
│   │   ├── notifications/ # Система сповіщень
│   │   ├── schedule/    # Timeline компонент
│   │   └── ui/          # UI компоненти (Clock, ThemeToggle)
│   ├── services/        # API сервіси
│   ├── styles/          # CSS файли
│   │   ├── base/        # Reset, Variables
│   │   ├── components/  # Стилі компонентів
│   │   └── layout/      # Layout стилі
│   ├── types/           # TypeScript типи
│   ├── utils/           # Утиліти
│   ├── App.tsx          # Головний компонент
│   └── index.tsx        # Entry point
├── STYLE_GUIDE.md       # Гайд по стилізації
├── vite.config.ts       # Vite конфігурація
└── package.json
```

---

## 💻 Розробка

### Доступні команди

```bash
# Запуск dev-сервера
npm run dev

# Збірка для production
npm run build

# Перегляд production збірки
npm run preview

# Лінтинг CSS
npm run lint:css

# Автофікс CSS
npm run lint:css:fix
```

### Стилізація

Проєкт використовує **BEM методологію** для CSS. Детальну інформацію можна знайти в [STYLE_GUIDE.md](./STYLE_GUIDE.md).

#### Приклад BEM структури:

```css
/* Block */
.queue-selector { }

/* Element */
.queue-selector__button { }

/* Modifier */
.queue-selector__button--active { }

/* Dark theme */
.dark .queue-selector__button--active { }
```

#### CSS змінні:

```css
/* Використання дизайн-токенів */
.my-component {
  color: var(--color-primary);
  padding: var(--space-4);
  border-radius: var(--radius-xl);
  transition: var(--transition-base);
}
```

### API Integration

Додаток підключається до API за адресою, вказаною в `src/services/api.ts`:

```typescript
const API_BASE_URL = 'https://your-api-url.com/api';
```

Для локальної розробки з власним API:

1. Запустіть [Blackout Calendar API](https://github.com/CodeNoob53/blackout_calendar)
2. Оновіть `API_BASE_URL` на `http://localhost:3000/api`

---

## 📝 Changelog

### v2.0.0 - CSS Architecture Migration (November 2025)

#### Major Changes

- 🎨 **Migrated from Tailwind CSS to Vanilla CSS** - Complete rewrite of all styling using custom CSS with BEM (Block Element Modifier) methodology
- 📦 **Removed Tailwind dependency** - Reduced bundle size and improved performance by eliminating Tailwind CSS and PostCSS
- 🎯 **Implemented BEM naming convention** - Improved code maintainability and readability with consistent class naming
- 🎨 **Enhanced Design System** - Created comprehensive CSS variables system for colors, spacing, typography, and transitions
- 🌙 **Refined Dark Theme** - Updated color palette with vibrant amber/orange accents (#ffb300) for better visual hierarchy
- 🔤 **Typography Update** - Switched to Google Sans Text font family for improved readability
- 📐 **Improved Border Radius** - Increased border radius values for a more modern, rounded aesthetic
- ⚡ **Production Optimization** - Configured Vite for CSS code splitting and minification using esbuild

#### Technical Details

- All component styles now use BEM methodology (e.g., `.queue-selector__button--active`)
- CSS custom properties (variables) defined in `src/styles/base/variables.css`
- Modular CSS architecture with separate files for components, layout, and base styles
- Stylelint integration for CSS linting and code quality
- Comprehensive style guide documentation in `STYLE_GUIDE.md`

#### Breaking Changes

- Removed all Tailwind CSS classes from components
- Updated all component files to use BEM class names
- Changed build configuration to remove Tailwind processing

---

## 🤝 Contributing

Ми вітаємо будь-який внесок у розвиток проєкту!

1. Fork репозиторій
2. Створіть feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit зміни (`git commit -m 'Add some AmazingFeature'`)
4. Push в branch (`git push origin feature/AmazingFeature`)
5. Відкрийте Pull Request

### Code Style

- Використовуйте BEM для CSS класів
- Дотримуйтесь TypeScript best practices
- Додавайте коментарі для складної логіки
- Перевіряйте код через Stylelint перед commit

---

## 📄 Ліцензія

Цей проект розповсюджується під ліцензією MIT. Деталі у файлі [LICENSE](./LICENSE).

---

## 🔗 Посилання

- [Live Demo](https://blackout-calendar-122838488015.us-west1.run.app/)
- [Backend API](https://github.com/CodeNoob53/blackout_calendar)
- [Style Guide](./STYLE_GUIDE.md)

---

<div align="center">

**Розроблено з ❤️ для енергонезалежності України**

[⬆ Повернутися до початку](#-blackout-calendar-web)

</div>
