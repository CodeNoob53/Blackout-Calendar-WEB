# Changelog

All notable changes to this project will be documented in this file.

## [2.2.1] - 2026-02-06

### Fixed
- Restored offline fallback to show cached schedules when the API is unavailable or the user has no connection.

### Changed
- Refactored initial schedule fetching to Axios.
- Rewrote layout markup with semantic HTML tags.

---

## [2.2.0] - 2025-12-22

### Added
- **Internationalization (i18n) System**:
  - Implemented complete i18n support using `react-i18next` library.
  - Added language detection from localStorage and browser settings.
  - Created 10 translation files (Ukrainian and English) across 5 namespaces (common, ui, notifications, errors, schedule).
  - Added TypeScript type-safe translations with `CustomTypeOptions`.
  - Implemented `useLanguageSync` hook for automatic backend synchronization via `Accept-Language` header.

- **Language Switcher Component**:
  - Created dual-mode language switcher (desktop dropdown + mobile list).
  - Integrated in both desktop header and mobile burger menu.
  - Supports Ukrainian 🇺🇦 and English 🇬🇧 with flag icons.
  - Persists language selection in localStorage.

- **Mobile Burger Menu**:
  - Added full-screen mobile navigation menu with smooth slide-in animation.
  - Includes Settings section (Language switcher, Theme toggle, Notifications).
  - Includes Navigation links (GitHub API, GitHub WEB).
  - Includes Info section with version display and changelog viewer.
  - Implements focus trap for keyboard accessibility.
  - Supports Escape key to close.
  - Added language accordion with animated expand/collapse.

- **Changelog Viewer**:
  - Created interactive changelog modal with markdown parsing.
  - Displays version history with formatted sections (Added, Improved, Fixed, Changed).
  - Shows version badges and release dates.
  - Accessible from burger menu Info section.
  - Responsive design with mobile-optimized layout.

- **Unified Animation System**:
  - Implemented smooth `slideInRight` animation (0.25s cubic-bezier) for burger menu.
  - Updated desktop NotificationCenter modal to use `modalFadeScale` animation.
  - Mobile modals use instant transitions for better UX.
  - All animations use GPU-accelerated transforms.

### Improved
- **Performance Optimizations**:
  - Created universal `--glass-blur` CSS variable to prevent repaint during theme switching.
  - All glass-card components now use shared blur variable (`blur(16px)`).
  - Removed `backdrop-filter: blur()` from modal/menu backdrops to reduce GPU load.
  - Added `will-change: transform, opacity` to animated components.
  - Added `transform: translate3d(0, 0, 0)` for GPU layer promotion.
  - Added `contain: content` for layout isolation.
  - Implemented `body.modal-open` and `body.menu-open` classes to disable blur on underlying content.

- **Component Translations**:
  - Translated all UI text in App.tsx, Header.tsx, Footer.tsx.
  - Translated all 30+ hardcoded texts in NotificationCenter.tsx.
  - All notification messages now support both Ukrainian and English.
  - Emergency notifications now show localized alert titles.

- **Mobile UX**:
  - Burger menu now takes full screen width (100%) instead of 85%.
  - Modal header height increased to 4rem on mobile for better touch targets.
  - Added back button support in NotificationCenter for mobile navigation.
  - Language switcher in burger menu shows current selection with checkmark.
  - Added unread notifications badge on burger menu button and inside burger menu notification item.

### Fixed
- **React Security Update**:
  - Updated React from 19.2.0 to 19.2.3 as preventive measure against CVE-2025-55182, CVE-2025-55184, CVE-2025-67779.
  - Previous version did not use vulnerable features, but updated for security best practices.
  - Documented in README.md.

- **Emergency Notification Deduplication**:
  - Fixed issue where emergency notifications were sent multiple times.
  - Service Worker now uses consistent tag for emergency notifications (grouped by day).
  - Frontend tracks processed emergency notifications to prevent duplicate alerts.
  - Emergency notifications now replace previous ones instead of creating new instances.

- **Translation Keys**:
  - Fixed inconsistent translation keys in NotificationCenter (e.g., `subscriptionActivatedMessage` → `subscriptionActivatedDesc`).
  - Updated schedule translations to match backend message format.
  - Added interpolation support for dynamic values (time, date) in notification messages.

### Changed
- Modal and burger menu backdrops no longer use `backdrop-filter` for better performance.
- Glass-card blur effect now uses CSS variable for consistency across themes.
- NotificationCenter can now be used in controlled mode with `isOpen` and `onOpenChange` props.
- Language switcher mobile version integrated directly into burger menu accordion.

---

## [2.1.0] - 2025-12-21

### Added
- **Global Performance Optimizations**: 
  - Implemented GPU hardware acceleration for all modal and menu animations using `will-change` and `translate3d`.
  - Added layout isolation (`contain: content`) for animated components to reduce reflow scope.
- **Theme Switching Optimization**:
  - Implemented `no-transitions` logic to prevent "paint storms" when switching between light and dark themes.
  - Reduced theme-switch background transition duration for a snappier feel.
- **Background Resource Management**:
  - Implemented dynamic background optimization: `backdrop-filter` and `filter` are now automatically disabled on the main app-root when heavy UI components (modals/menus) are active.
- **Documentation**:
  - Added a comprehensive [Optimization Guide](docs/optimization-guide.md) for future maintenance and learning.

### Improved
- Modal opening animations are now significantly smoother (60FPS) on both Desktop and Mobile devices.
- Theme switching is now instantaneous on mobile without UI stutters.

---

## [2.0.0] - 2025-12-10

### Added
- Initial release of the redesigned Blackout Calendar WEB.
- Multi-queue support.
- Push notification system.
- Multi-language support (UK/EN).
