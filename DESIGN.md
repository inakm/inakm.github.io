# Design System & Architecture

## Project Overview

Personal portfolio site for Anjani Kumar Mishra — a finance and analytics professional. The site showcases financial modeling, PowerBI dashboards, Bloomberg BQL analysis, and AI automation projects.

## Directory Structure

```
/
├── assets/
│   ├── css/                # Site stylesheets
│   │   ├── me-style.css
│   │   ├── tailwind-compiled.css
│   │   └── view-transitions.css
│   ├── images/             # Static images
│   └── js/                 # Site JavaScript
│       └── me-script.js
├── Data/                   # Notes, study materials
├── me/                     # "About Me" interactive page
├── page/                   # All content pages
│   ├── projects/
│   │   └── dashboards/
│   └── prompts/
├── v0/                     # Archived v0 of the site
├── fix-encoding.js         # Utility script (root-level)
├── generate-sitemap.js     # Build script (root-level)
├── refactor.js             # Build script (root-level)
├── sw.js                   # Service worker (must be in root)
├── tailwind.config.js      # Tailwind config (root-level)
└── tailwind_input.css      # Tailwind source (root-level)
```

## Asset Conventions

- **CSS files** → `assets/css/`
- **JS files** → `assets/js/`
- **Images** → `assets/images/`
- Root-level JS files (`sw.js`, build scripts, configs) stay at root (service worker requires root scope; build tools are not site assets).

## Design Tokens

### Brand Colors

| Token | Value | Usage |
|-------|-------|-------|
| `brand-primary` | `#222222` | Text, backgrounds, primary UI |
| `brand-secondary` | `#7B7B7B` | Secondary text, muted UI |
| `brand-tertiary` | `#F8F8F8` | Section backgrounds, cards |
| `brand-white` | `#ffffff` | White surfaces |
| `brand-highlight` | `#f3c623` | Accents, highlights, CTAs |

### Typography

- **Font**: Manrope (Google Fonts) via `https://fonts.googleapis.com`
- **Fallback**: `sans-serif`
- **Weights used**: 400, 500, 600, 700, 800
- **Monospace**: `Courier New`, `monospace`
- **Icons**: Font Awesome 6.5.1 (CDN)

### Spacing & Layout

- Max content width: `max-w-7xl` (80rem / 1280px)
- Standard section padding: `px-6 md:px-12`
- Section spacing: `mb-40`

## CSS Architecture

Three stylesheets serve the site:

1. **`tailwind-compiled.css`** — Production build from Tailwind v4 (`npx @tailwindcss/cli -i tailwind_input.css -o assets/css/tailwind-compiled.css --minify`)
2. **`view-transitions.css`** — Cross-document view transitions (MPA-style SPA feel)
3. **`me-style.css`** — Themeable styles for the `/me/` interactive page (5 themes: home, hacker, rain, anime, car)

### Inline Styles

The `index.html` and `404.html` contain significant inline `<style>` blocks:
- Custom cursor implementation
- `liquid-glass` glassmorphism effect
- `animate-fade-rise` entrance animations
- Magnetic hover effect
- Scroll-triggered `reveal` animations
- Mega-menu positioning and transitions
- Tailwind utility class fallbacks (missing brand utilities)

## JavaScript Architecture

### Site JS (`assets/js/me-script.js`)
- Interactive page logic for `/me/`
- Theme switching, cursor trails, media controls

### Root-level Scripts
- **`sw.js`** — Service worker for markdown rendering
- **`fix-encoding.js`**, **`fix-encoding-safe.js`** — Encoding repair utilities
- **`fix-remove-btt.js`** — Broken link cleanup
- **`generate-sitemap.js`** — Sitemap generator
- **`refactor.js`** — Codebase refactoring helper

### Third-party JS (CDN)
- Tailwind CDN (`cdn.tailwindcss.com`) — runtime for `index.html` and `404.html`
- Google Analytics (`gtag.js`)
- Puter.js (`js.puter.com/v2/`)

## Component Patterns

### Navigation
- Fixed header with glassmorphism nav pill
- Mega-menus for "Projects" and "Prompts" (CSS-only hover)
- Mobile drawer with slide transition
- Theme-aware header (dark/light via `.header-light`)

### Cards
- Rounded `2rem` / `3xl` borders
- Hover: `-translate-y-2` lift + shadow
- Project cards use layered pseudo-element design

### Animations
- `fade-rise` — staggered entrance (0s / 0.2s / 0.4s delays)
- `reveal` — scroll-triggered opacity + translateY (IntersectionObserver)
- `marquee` — horizontal scrolling ticker
- Custom cursor: dot + outline with `mix-blend-mode: difference`

### Glassmorphism (`.liquid-glass`)
- `backdrop-filter: blur(4px)`
- Inset `box-shadow` for subtle edge
- `::before` pseudo-element with gradient border

## Build & Tooling

```bash
# Build CSS
npm run build:css    # tailwindcss CLI -> assets/css/tailwind-compiled.css

# Tailwind v4 config
tailwind_input.css + tailwind.config.js
```

## Performance Considerations

- Video background hosted on CloudFront CDN
- Font Awesome & Google Fonts from CDN with `preconnect`
- Lazy loading for images (`loading="lazy"`)
- Critical CSS inlined in `<head>`
- Service worker for markdown content rendering
