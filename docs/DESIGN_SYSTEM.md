# Design System FactureSmart — Coccinelle DRC

## Source
Design system inspired from [coccinelledrc.com](https://coccinelledrc.com) — application SaaS de facturation électronique conforme DGI pour la RDC.

---

## Identity

| Token | Value |
|-------|-------|
| Brand | FactureSmart |
| Context | Fintech / Facturation électronique / OGA-DF / DGI RDC |
| Geography | RDC (Kinshasa, Lubumbashi, etc.) |

---

## Color Palette

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| Primary | `#059669` | `emerald-600` | CTA buttons, primary actions |
| Primary hover | `#047857` | `emerald-700` | Button hover |
| Primary light | `#10b981` | `emerald-500` | Active states, icons |
| Primary 50 | `#ecfdf5` | `emerald-50` | Badges, subtle backgrounds |
| Accent gradient start | `#059669` | `emerald-600` | Gradient start |
| Accent gradient end | `#84cc16` | `lime-400` | Gradient end (lime) |
| Success | `#10b981` | `emerald-500` | Validated, success states |
| Warning | `#f59e0b` | `amber-500` | Pending, warning |
| Error | `#ef4444` | `red-500` | Rejected, error |
| Page background | `#f8fafc` | `slate-50` | Global background |
| Card background | `#ffffff` | `white` | Cards, panels |
| Text primary | `#1e293b` | `slate-800` | Headings, labels |
| Text secondary | `#475569` | `slate-600` | Body text, descriptions |
| Text muted | `#94a3b8` | `slate-400` | Placeholders, disabled |
| Border | `#e2e8f0` | `slate-200` | Subtle borders |
| Dark overlay | `#0f172a` | `slate-900` | Footer, dark sections |

### Usage Rules

- Primary CTA: `bg-emerald-600 hover:bg-emerald-700 text-white`
- Gradient CTA: `bg-gradient-to-r from-emerald-600 to-lime-400 hover:from-emerald-700 hover:to-lime-500`
- Badge success: `bg-emerald-50 text-emerald-700 border border-emerald-200`
- Badge warning: `bg-amber-50 text-amber-700 border border-amber-200`
- Badge error: `bg-red-50 text-red-700 border border-red-200`
- Focus ring: `focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2`

---

## Typography

| Property | Value |
|----------|-------|
| Font | Manrope (Google Fonts) |
| Weights | 300 (light), 400 (regular), 600 (semibold), 700 (bold), 800 (extrabold) |
| Heading XL | `text-4xl lg:text-5xl font-extrabold tracking-tight` |
| Heading L | `text-3xl font-bold` |
| Heading M | `text-2xl font-bold` |
| Heading S | `text-xl font-semibold` |
| Body | `text-base font-normal` |
| Small | `text-sm` |
| XS | `text-xs` |

---

## Tech Stack

```html
<!-- Google Fonts: Manrope -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;600;700;800&display=swap" rel="stylesheet">

<!-- Tailwind CSS CDN -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- Remixicon -->
<link href="https://cdn.jsdelivr.net/npm/remixicon@4.5.0/fonts/remixicon.css" rel="stylesheet">

<!-- Alpine.js (optional for interactivity) -->
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
```

### Tailwind Config

```js
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0',
          300: '#6ee7b7', 400: '#34d399', 500: '#10b981',
          600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b'
        },
        brand: {
          dark: '#064e3b', primary: '#10b981', light: '#a3e635',
          accent: '#ecfccb', lime: '#84cc16'
        }
      }
    }
  }
}
```

---

## Components

### 1. CTA Button (Primary)

```html
<a href="#" class="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-lg shadow-emerald-600/20">
  Texte CTA
</a>
```

**Gradient version:**
```html
<a href="#" class="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-lime-400 hover:from-emerald-700 hover:to-lime-500 rounded-xl transition-all shadow-lg shadow-emerald-500/25">
  Texte CTA
</a>
```

### 2. Ghost Button

```html
<a href="#" class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-emerald-600 border border-emerald-200 rounded-xl hover:bg-emerald-50 transition-all">
  Texte
</a>
```

### 3. Section Badge

```html
<span class="inline-block px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full">
  Badge
</span>
```

### 4. Gradient Text

```html
<style>
.gradient-text {
  background: linear-gradient(135deg, #10b981 0%, #84cc16 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
</style>
<span class="gradient-text">Texte coloré</span>
```

### 5. Card

```html
<div class="bg-white rounded-2xl p-6 shadow-xl ring-1 ring-slate-900/5 hover:shadow-2xl transition-shadow">
```

### 6. Glass Navbar (App screens)

```html
<header class="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100/80">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
    <!-- Logo + nav -->
  </div>
</header>
```

### 7. Glass Sidebar (App screens)

```html
<aside class="w-64 bg-white/90 backdrop-blur-md border-r border-slate-200/80 flex flex-col flex-shrink-0">
  <!-- Logo -->
  <!-- Nav items -->
  <!-- User profile -->
</aside>
```

### 8. Glassmorphism CSS

```css
.glass {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.glass-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(8px);
}
```

### 9. Form Input

```html
<input type="email" placeholder="text@exemple.com"
  class="w-full px-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition bg-white text-slate-800 placeholder-slate-400 shadow-sm">
```

### 10. Table Row

```html
<tr class="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
```

### 11. Stat Card

```html
<div class="bg-white rounded-2xl p-6 shadow-xl ring-1 ring-slate-900/5 hover:shadow-2xl hover:-translate-y-0.5 transition-all">
  <div class="flex items-start justify-between">
    <div>
      <p class="text-sm font-medium text-slate-500">Label</p>
      <p class="text-2xl font-extrabold text-slate-900 mt-1">12 345</p>
    </div>
    <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
      <i class="ri-file-chart-line text-emerald-600 text-lg"></i>
    </div>
  </div>
</div>
```

### 12. Badge (Status)

```html
<span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Actif
</span>
```

### 13. Avatar Initials

```html
<div class="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
  JM
</div>
```

---

## Layout

- **Container**: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- **App layout**: `flex h-screen overflow-hidden` with sidebar + main
- **Card spacing**: `gap-6` between cards in grid
- **Section spacing**: `py-8 lg:py-12`
- **Border radius**: `rounded-2xl` for cards, `rounded-xl` for buttons/inputs

---

## Animations

```css
/* Float (decorative blob) */
animation: float 6s ease-in-out infinite;
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
}

/* Reveal on scroll */
.reveal { opacity: 0; transform: translateY(20px); transition: all 0.6s ease-out; }
.reveal.visible { opacity: 1; transform: translateY(0); }

/* Hover lift */
.hover-lift:hover { transform: translateY(-2px); }
```

---

## Dark Mode Support

All components support `dark:` variants:
- Background: `bg-slate-900` / `bg-slate-800`
- Text: `text-white` / `text-slate-300`
- Borders: `border-slate-700`
- Cards: `dark:bg-slate-800`

---

## File Structure

```
/home/jay/FactureSmart/mockups-dgi/
├── index.html                    # Gallery of all screens
├── screen-00-login.html          # Login / Signup (two-panel)
├── screen-01-dashboard.html      # Dashboard with stats
├── screen-02-factures.html      # Invoice list
├── screen-03-creation-facture.html  # Multi-step invoice creation
├── screen-03b-facture-detail.html    # Invoice detail
├── screen-04-facture-preview.html    # A4 print preview
├── screen-05-dgi-status.html     # DGI transmission status
├── screen-06-clients.html        # Client list
├── screen-06b-client-detail.html # Client detail
├── screen-07-rapports.html       # Reports / TVA
├── screen-08-settings.html       # Settings
└── screen-09-devis.html         # Quote list
```
