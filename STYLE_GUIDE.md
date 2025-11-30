# Blackout Calendar - Style Guide

## Overview

This style guide documents the design system and CSS architecture for the Blackout Calendar application. We use **BEM (Block Element Modifier)** methodology for all CSS class names and custom CSS properties for theming.

---

## Table of Contents

1. [BEM Methodology](#bem-methodology)
2. [CSS Variables](#css-variables)
3. [Color Palette](#color-palette)
4. [Typography](#typography)
5. [Spacing System](#spacing-system)
6. [Component Patterns](#component-patterns)

---

## BEM Methodology

### Naming Convention

BEM stands for **Block**, **Element**, **Modifier**. All class names follow this pattern:

```
.block__element--modifier
```

### Rules

- **Block**: Standalone component (`.header`, `.timeline`, `.notification-button`)
- **Element**: Part of a block (`.header__title`, `.timeline__track`)
- **Modifier**: Variation of a block or element (`.button--active`, `.empty-state--loading`)

### Examples

```css
/* Block */
.date-selector { }

/* Element */
.date-selector__button { }
.date-selector__day { }

/* Modifier */
.date-selector__button--selected { }

/* Element with Modifier */
.empty-state__icon--waking { }
```

### Best Practices

✅ **DO:**
- Use lowercase with hyphens for multi-word names
- Keep blocks independent and reusable
- Use modifiers for state changes

❌ **DON'T:**
- Nest BEM selectors (`.block__element__subelement`)
- Use IDs for styling
- Mix BEM with utility classes

---

## CSS Variables

All design tokens are defined as CSS custom properties in `src/styles/base/variables.css`.

### Usage

```css
.my-component {
  color: var(--color-primary);
  padding: var(--space-4);
  border-radius: var(--radius-xl);
}
```

### Variable Categories

| Category | Prefix | Example |
|----------|--------|---------|
| Colors | `--color-` | `--color-primary` |
| Spacing | `--space-` | `--space-4` |
| Typography | `--font-` | `--font-sans` |
| Border Radius | `--radius-` | `--radius-xl` |
| Shadows | `--shadow-` | `--shadow-md` |
| Transitions | `--transition-` | `--transition-base` |

---

## Color Palette

### Light Theme

#### Primary Colors (Nature Green)
```css
--color-nature-50: #F1F8E9   /* Lightest */
--color-nature-100: #DCEDC8
--color-nature-200: #C5E1A5
--color-nature-300: #AED581
--color-nature-400: #9CCC65
--color-nature-500: #8BC34A  /* Primary */
--color-nature-600: #7CB342
--color-nature-700: #689F38
--color-nature-800: #558B2F
--color-nature-900: #33691e  /* Darkest */
```

#### Neutral Colors
```css
--color-gray-50: #f9fafb
--color-gray-100: #f3f4f6
--color-gray-200: #e5e7eb
--color-gray-300: #d1d5db
--color-gray-400: #9ca3af
--color-gray-500: #6b7280
--color-gray-600: #4b5563
--color-gray-700: #374151
--color-gray-800: #1f2937
--color-gray-900: #111827
```

### Dark Theme

#### Primary Colors (Amber)
```css
--color-amber-400: #fbbf24
--color-amber-500: #f59e0b  /* Primary */
--color-amber-600: #d97706
```

#### Semantic Colors
```css
--color-error: #ef4444
--color-success: #22c55e
--color-warning: #f59e0b
--color-info: #3b82f6
```

### Theme Switching

The app supports light and dark themes via the `.dark` class on the `<html>` element:

```css
/* Light theme */
.component {
  background: var(--color-nature-50);
}

/* Dark theme */
.dark .component {
  background: var(--color-slate-900);
}
```

---

## Typography

### Font Families

```css
--font-sans: 'Inter', system-ui, sans-serif
--font-mono: 'SF Mono', 'Monaco', 'Cascadia Code', monospace
```

### Font Sizes

| Variable | Size | Usage |
|----------|------|-------|
| `--text-xs` | 0.75rem (12px) | Small labels, captions |
| `--text-sm` | 0.875rem (14px) | Body text, buttons |
| `--text-base` | 1rem (16px) | Default body text |
| `--text-lg` | 1.125rem (18px) | Subheadings |
| `--text-xl` | 1.25rem (20px) | Headings |
| `--text-2xl` | 1.5rem (24px) | Page titles |

### Font Weights

```css
--font-light: 300
--font-normal: 400
--font-medium: 500
--font-semibold: 600
--font-bold: 700
--font-extrabold: 800
```

---

## Spacing System

Based on a 4px (0.25rem) scale:

| Variable | Size | Pixels |
|----------|------|--------|
| `--space-1` | 0.25rem | 4px |
| `--space-2` | 0.5rem | 8px |
| `--space-3` | 0.75rem | 12px |
| `--space-4` | 1rem | 16px |
| `--space-5` | 1.25rem | 20px |
| `--space-6` | 1.5rem | 24px |
| `--space-8` | 2rem | 32px |
| `--space-10` | 2.5rem | 40px |
| `--space-12` | 3rem | 48px |
| `--space-16` | 4rem | 64px |

### Usage Example

```css
.card {
  padding: var(--space-6);
  margin-bottom: var(--space-4);
  gap: var(--space-3);
}
```

---

## Component Patterns

### Card Component

```css
.card {
  backdrop-filter: blur(12px);
  border-radius: var(--radius-2xl);
  padding: var(--space-6);
  box-shadow: var(--shadow-xl);
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.85);
}

.dark .card {
  background: rgba(30, 41, 59, 0.4);
  border-color: var(--color-border);
}
```

### Button Component

```css
.button {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-xl);
  font-weight: 700;
  transition: all var(--transition-base);
  cursor: pointer;
}

.button--primary {
  background: var(--color-nature-500);
  color: white;
}

.dark .button--primary {
  background: var(--color-amber-500);
  color: var(--color-gray-900);
}
```

### Empty State Pattern

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--space-12) var(--space-6);
}

.empty-state__icon {
  width: 2.5rem;
  height: 2.5rem;
  margin-bottom: var(--space-4);
  opacity: 0.5;
}

.empty-state__title {
  font-size: var(--text-lg);
  font-weight: 700;
  margin-bottom: var(--space-2);
}

.empty-state__text {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}
```

---

## Responsive Design

### Breakpoints

```css
/* Mobile first approach */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

### Example

```css
.grid {
  grid-template-columns: repeat(2, 1fr);
}

@media (min-width: 640px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

---

## Animations & Transitions

### Transition Durations

```css
--transition-fast: 150ms
--transition-base: 200ms
--transition-slow: 300ms
--transition-slower: 500ms
```

### Common Transitions

```css
/* Smooth color transitions */
transition: var(--transition-colors);

/* All properties */
transition: all var(--transition-base);

/* Multiple properties */
transition: background-color var(--transition-base),
            border-color var(--transition-base);
```

### Animation Example

```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animated-element {
  animation: fadeIn 0.3s ease-out;
}
```

---

## Accessibility

### Focus States

Always provide visible focus indicators:

```css
.button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

### Color Contrast

- Ensure minimum 4.5:1 contrast ratio for normal text
- Ensure minimum 3:1 contrast ratio for large text (18px+)

### Semantic HTML

Use appropriate HTML elements:
- `<button>` for clickable actions
- `<a>` for navigation
- `<header>`, `<main>`, `<footer>` for layout
- `<section>` for content grouping

---

## File Structure

```
src/styles/
├── base/
│   ├── reset.css          # CSS reset
│   ├── variables.css      # Design tokens
│   └── typography.css     # Font styles
├── components/
│   ├── header.css
│   ├── footer.css
│   ├── clock.css
│   ├── timeline.css
│   └── notification-center.css
├── layout/
│   └── main.css           # App layout
└── index.css              # Main entry point
```

---

## Development Workflow

### Adding New Components

1. Create component CSS file in appropriate directory
2. Follow BEM naming convention
3. Use CSS variables for all values
4. Add dark theme variants
5. Import in `src/styles/index.css`

### CSS Linting

Run stylelint to check for errors:

```bash
npm run lint:css
```

### Production Build

Build optimized CSS for production:

```bash
npm run build
```

---

## Resources

- [BEM Methodology](https://en.bem.info/methodology/)
- [CSS Custom Properties (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Last Updated:** November 2025  
**Maintained by:** Blackout Calendar Team
