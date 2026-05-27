# Design System — Movie Review Application

**Document ID:** DESIGN-SYSTEM-1.0
**Owner:** ux-designer
**Status:** DRAFT — Awaiting Product Owner Sign-Off
**Version:** 1.0
**Date:** 2026-05-23
**Produced by:** ux-designer (Phase 4 — Detailed Design)
**Reviewed by:** tech-lead

---

## Table of Contents

1. [Component Inventory](#1-component-inventory)
2. [Design Token Definitions](#2-design-token-definitions)
3. [Component Specifications](#3-component-specifications)
4. [Accessibility Checklist](#4-accessibility-checklist)

---

## 1. Component Inventory

### 1.1 Primitive Components (from Shadcn/ui + Radix UI)

These components are installed via `shadcn-ui` CLI and lightly customized with project tokens. Do not build from scratch.

| Component | Shadcn/ui Source | Customization Required | Used In |
|-----------|-----------------|----------------------|---------|
| `Button` | `button` | Add `destructive`, `admin` variants; update color tokens | All interactive actions |
| `Input` | `input` | Update focus ring token | Search bar, forms |
| `Textarea` | `textarea` | Add character counter wrapper | Review form |
| `Label` | `label` | None | All form fields |
| `Badge` | `badge` | Add `genre`, `flag`, `hidden`, `admin` variants | Genre tags, status indicators |
| `Avatar` | `avatar` | None | User profiles, review cards |
| `Dialog` | `dialog` | Update overlay opacity, ensure focus trap | Confirmation dialogs |
| `AlertDialog` | `alert-dialog` | Semantic destructive confirmation | Delete actions |
| `DropdownMenu` | `dropdown-menu` | None | User avatar menu, sort dropdown |
| `Checkbox` | `checkbox` | None | Genre filter panel |
| `RadioGroup` | `radio-group` | Visually hidden (star icons overlay) | Star rating widget |
| `Pagination` | `pagination` | None | Movie list, review list |
| `Skeleton` | `skeleton` | None | Loading states |
| `Alert` | `alert` | Add `tmdb-offline` variant | API error banners |
| `Toast/Sonner` | `sonner` | Theme tokens applied | Action feedback |
| `Select` | `select` | None | Sort dropdown, year pickers |
| `Sheet` | `sheet` | None | Mobile filter drawer |
| `Separator` | `separator` | None | Section dividers |
| `Card` | `card` | None (base for custom cards) | Base for MovieCard, ReviewCard |

### 1.2 Custom Application Components

These are built by the frontend engineer using Shadcn/ui primitives and Tailwind CSS.

| Component | File Path | Props | Description |
|-----------|-----------|-------|-------------|
| `MovieCard` | `components/movies/MovieCard.tsx` | `movie: MovieCard, isLoading?: boolean` | Poster + title + year + rating chip |
| `MovieGrid` | `components/movies/MovieGrid.tsx` | `movies: MovieCard[], isLoading: boolean, count?: number` | Responsive CSS grid of MovieCards |
| `StarRating` | `components/ui/StarRating.tsx` | `value: number, max: number, interactive?: boolean, onChange?: fn` | Display or interactive star widget |
| `ReviewCard` | `components/reviews/ReviewCard.tsx` | `review: Review, isOwn: boolean, isAdmin: boolean` | Review with author, stars, actions |
| `ReviewForm` | `components/reviews/ReviewForm.tsx` | `movieId: string, existingReview?: Review` | Textarea + counter + submit |
| `CharacterCounter` | `components/ui/CharacterCounter.tsx` | `current: number, max: number` | Live character remaining display |
| `FilterPanel` | `components/movies/FilterPanel.tsx` | `filters: FilterState, onChange: fn` | Genre + year range filter panel |
| `FilterChip` | `components/movies/FilterChip.tsx` | `label: string, onRemove: fn` | Active filter removable chip |
| `AdminReviewRow` | `components/admin/AdminReviewRow.tsx` | `review: Review, onHide, onRestore, onDelete` | Moderation queue row |
| `AuditLogTable` | `components/admin/AuditLogTable.tsx` | `entries: AuditLogEntry[]` | Audit log display table |
| `UserAvatar` | `components/users/UserAvatar.tsx` | `user: UserPublic, size?: 'sm' \| 'md' \| 'lg'` | Avatar with fallback initials |
| `GlobalHeader` | `components/layout/GlobalHeader.tsx` | `user?: UserMe` | App header with nav, search, auth |
| `GlobalFooter` | `components/layout/GlobalFooter.tsx` | none | Footer with privacy + TMDB attribution |
| `PageLayout` | `components/layout/PageLayout.tsx` | `children, title: string` | Wraps main content, sets page title |
| `SkeletonMovieCard` | `components/movies/SkeletonMovieCard.tsx` | none | Loading placeholder for MovieCard |
| `SkeletonReviewCard` | `components/reviews/SkeletonReviewCard.tsx` | none | Loading placeholder for ReviewCard |
| `TMDBOfflineBanner` | `components/ui/TMDBOfflineBanner.tsx` | `visible: boolean` | TMDB API degradation notice |
| `ConfirmDialog` | `components/ui/ConfirmDialog.tsx` | `title, description, onConfirm, onCancel, variant: 'default' \| 'destructive'` | Reusable AlertDialog wrapper |
| `EmptyState` | `components/ui/EmptyState.tsx` | `title, description, action?: ReactNode` | Empty list / no results UI |
| `ErrorState` | `components/ui/ErrorState.tsx` | `title, description, retry?: fn` | API error state |

---

## 2. Design Token Definitions

### 2.1 Tailwind CSS Configuration (tailwind.config.ts)

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class', // toggled via class on <html>
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background:  'hsl(var(--background))',
        surface:     'hsl(var(--surface))',
        'surface-elevated': 'hsl(var(--surface-elevated))',
        border:      'hsl(var(--border))',

        // Text
        'text-primary':   'hsl(var(--text-primary))',
        'text-secondary': 'hsl(var(--text-secondary))',
        'text-disabled':  'hsl(var(--text-disabled))',

        // Brand
        primary:       'hsl(var(--primary))',
        'primary-hover': 'hsl(var(--primary-hover))',

        // Semantic
        star:     'hsl(var(--star))',
        'star-empty': 'hsl(var(--star-empty))',
        danger:   'hsl(var(--danger))',
        'danger-bg': 'hsl(var(--danger-bg))',
        success:  'hsl(var(--success))',
        warning:  'hsl(var(--warning))',

        // Admin
        'admin-badge': 'hsl(var(--admin-badge))',
        'hidden-bg':   'hsl(var(--hidden-bg))',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs:   ['0.75rem',  { lineHeight: '1.5' }],
        sm:   ['0.875rem', { lineHeight: '1.5' }],
        base: ['1rem',     { lineHeight: '1.6' }],
        lg:   ['1.125rem', { lineHeight: '1.4' }],
        xl:   ['1.25rem',  { lineHeight: '1.3' }],
        '2xl': ['1.5rem',  { lineHeight: '1.3' }],
        '3xl': ['1.875rem',{ lineHeight: '1.2' }],
        '4xl': ['2.25rem', { lineHeight: '1.1' }],
      },
      borderRadius: {
        sm:   '4px',
        DEFAULT: '8px',
        lg:   '12px',
        xl:   '16px',
        full: '9999px',
      },
      spacing: {
        // Extending Tailwind's default 4px scale with named semantic tokens
        // All standard Tailwind spacing values (1=4px, 2=8px, etc.) are available
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),        // for Shadcn/ui animations
    require('@tailwindcss/typography'),    // for prose content
  ],
}

export default config
```

### 2.2 CSS Variable Definitions (globals.css)

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  /* ── Light Mode (default) ── */
  :root {
    --background:         0 0% 100%;          /* #FFFFFF */
    --surface:            210 40% 98%;        /* #F8F9FA */
    --surface-elevated:   0 0% 100%;          /* #FFFFFF */
    --border:             214 32% 91%;        /* #E2E8F0 */

    --text-primary:       222 47% 11%;        /* #0F172A */
    --text-secondary:     215 16% 47%;        /* #64748B */
    --text-disabled:      215 20% 65%;        /* #CBD5E1 */

    --primary:            239 84% 67%;        /* #6366F1 */
    --primary-hover:      243 75% 59%;        /* #4F46E5 */

    --star:               38 92% 50%;         /* #F59E0B */
    --star-empty:         220 9% 84%;         /* #D1D5DB */
    --danger:             0 84% 60%;          /* #EF4444 */
    --danger-bg:          0 86% 97%;          /* #FEF2F2 */
    --success:            160 84% 39%;        /* #10B981 */
    --warning:            38 92% 50%;         /* #F59E0B */

    --admin-badge:        263 70% 50%;        /* #7C3AED */
    --hidden-bg:          43 96% 56%;         /* #FEF3C7-ish */
  }

  /* ── Dark Mode ── */
  .dark {
    --background:         228 21% 7%;         /* #0F1117 */
    --surface:            229 19% 13%;        /* #1A1D27 */
    --surface-elevated:   228 19% 17%;        /* #242736 */
    --border:             231 18% 23%;        /* #2D3148 */

    --text-primary:       213 31% 91%;        /* #F1F5F9 */
    --text-secondary:     215 16% 61%;        /* #94A3B8 */
    --text-disabled:      215 19% 35%;        /* #475569 */

    --primary:            234 89% 74%;        /* #818CF8 */
    --primary-hover:      234 100% 82%;       /* #A5B4FC */

    --star:               44 97% 59%;         /* #FCD34D */
    --star-empty:         220 26% 22%;        /* #374151 */
    --danger:             0 91% 71%;          /* #F87171 */
    --danger-bg:          0 79% 18%;          /* #450A0A */
    --success:            152 76% 52%;        /* #34D399 */
    --warning:            44 97% 59%;         /* #FCD34D */

    --admin-badge:        252 95% 75%;        /* #A78BFA */
    --hidden-bg:          27 95% 16%;         /* #451A03 */
  }

  /* ── Typography ── */
  body {
    @apply bg-background text-text-primary font-sans;
    font-size: 16px;
    -webkit-font-smoothing: antialiased;
  }

  /* ── Focus Indicator ── */
  *:focus-visible {
    @apply outline-2 outline-primary outline-offset-2;
  }

  /* Never suppress focus without replacement */
  *:focus:not(:focus-visible) {
    outline: none;
  }

  /* ── Skip Link ── */
  .skip-link {
    @apply sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 
           focus:z-50 focus:bg-primary focus:text-white focus:px-4 focus:py-2 
           focus:rounded focus:text-base focus:font-semibold;
  }
}
```

### 2.3 Component Token Map

| Component State | Tailwind Class / Token | Renders As |
|----------------|----------------------|-----------|
| Primary button | `bg-primary text-white hover:bg-primary-hover` | Indigo fill, white text |
| Destructive button | `bg-danger text-white hover:bg-red-600` | Red fill, white text |
| Ghost button | `bg-transparent text-primary hover:bg-primary/10` | No fill, indigo text |
| Input default | `border-border bg-surface` | Subtle border, surface bg |
| Input focus | `ring-2 ring-primary border-primary` | Indigo ring |
| Input error | `border-danger ring-danger/20` | Red border |
| Genre badge | `bg-primary/10 text-primary rounded-full` | Indigo tint pill |
| Flag badge | `bg-warning/20 text-warning` | Amber tint |
| Hidden badge | `bg-hidden-bg text-warning` | Amber background row |
| Admin badge | `bg-admin-badge/20 text-admin-badge` | Purple tint |
| Star filled | `text-star` | Amber star |
| Star empty | `text-star-empty` | Grey star |

---

## 3. Component Specifications

### 3.1 StarRating Component

**Variants:**
1. **Display-only** (`interactive=false`): Shows filled/empty stars + numeric label. Not focusable. Used in MovieCard, ReviewCard, Movie aggregate display.
2. **Interactive** (`interactive=true`): Radio group. Keyboard operable. Used in review form, rating submission. Requires auth — shown only to registered users.

**States:**
- Unrated: All stars empty, aria-label "Not yet rated"
- Hovered (star N): Stars 1 through N filled (amber), rest empty
- Selected (value N): Stars 1 through N filled permanently
- Readonly: Stars rendered as `<span>` elements, no interactivity

**Keyboard behavior (interactive):**
- `Tab` focuses the radio group
- Left/Right arrow changes selected value
- `Enter`/`Space` confirms and submits (if standalone) or sets value (if part of form)

**Accessibility:**
```html
<!-- Display only -->
<span aria-label="4.3 out of 5 stars">
  <span aria-hidden="true">★★★★☆</span>
</span>

<!-- Interactive (radio group) -->
<fieldset>
  <legend class="sr-only">Rate this movie</legend>
  <label>
    <input type="radio" name="rating" value="1" class="sr-only"
           aria-label="1 star" />
    <span aria-hidden="true" class="star-icon">★</span>
  </label>
  <!-- repeat for 2-5 -->
</fieldset>
```

---

### 3.2 MovieCard Component

**Structure:**
```
<article> (role listitem if in grid)
  <a href="/movies/[id]" aria-label="[Title] ([Year]), rated [X] stars">
    <div> (aspect-ratio: 2/3, overflow-hidden)
      <img src=[poster] alt="[Title] movie poster" loading="lazy" />
    </div>
    <div> (card body)
      <h3>[Title]</h3>
      <p>[Year]</p>
      <StarRating value=[avgRating] max=5 />
      <span>([ratingCount] ratings)</span>
    </div>
  </a>
</article>
```

**Loading state:** Replace with `SkeletonMovieCard` — animated pulse rectangles matching card dimensions.

**Hover state:** Scale 1.02, shadow elevation increase (CSS transition: 150ms ease).

---

### 3.3 ReviewForm Component

**Behavior:**
- Character counter updates on every keystroke via `onInput` event.
- Counter turns `text-warning` when < 50 chars remaining.
- Counter turns `text-danger` when at 0 chars remaining (input is at max).
- Submit button disabled when: body is empty (after trim) OR body length > 500.
- On successful submit: form clears; success toast shown; review appears at top of list.
- On API error: `role="alert"` error message rendered below submit button.

**Validation (client-side, mirrors server):**
- Body: minLength 1 (after trim), maxLength 500
- Empty/whitespace: show "Review cannot be blank"
- Too long: impossible via maxlength attribute, but caught if bypass attempted

---

### 3.4 ConfirmDialog Component

Wraps Shadcn/ui `AlertDialog`. Used for:
- Delete review (user)
- Delete review (admin)
- Hide review (admin)
- Delete movie (admin)
- Delete account (user — GDPR)

Props interface:
```typescript
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;   // default: "Confirm"
  cancelLabel?: string;    // default: "Cancel"
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
  children?: React.ReactNode;  // optional extra content (e.g., reason textarea)
}
```

Focus behavior: On open, focus lands on **Cancel** button (safe default for destructive dialogs). Escape key cancels.

---

### 3.5 FilterPanel Component

**Desktop (sidebar):**
- Always visible, 240px wide left sidebar.
- Genre checkboxes in a scrollable list (max-height 300px).
- Year range: two `<Select>` components (yearFrom, yearTo). yearTo options limited to >= yearFrom.
- "Clear All Filters" button: only shown when any filter is active.

**Mobile (bottom sheet):**
- Triggered by "Filters" button in page header area.
- Slides up using Shadcn/ui `Sheet` component.
- Same content as desktop panel.
- "Apply Filters" and "Clear All" buttons at the bottom of the sheet.

**Active filter chips (below the filter panel / above the movie grid):**
- One chip per active filter.
- Format: `Genre: Action ×` or `Year: 2000–2020 ×`
- Each chip has `aria-label="Remove [filter name] filter"`.

---

## 4. Accessibility Checklist

This checklist must be verified by the QA engineer and frontend engineer before each release. Mark status: PASS, FAIL, or N/A.

### 4.1 Global / Layout

| # | Requirement | WCAG Criterion | Status |
|---|-------------|----------------|--------|
| A-001 | Every page has a unique, descriptive `<title>` | 2.4.2 | - |
| A-002 | Skip-to-main-content link is the first focusable element | 2.4.1 | - |
| A-003 | `<html lang="en">` present on every page | 3.1.1 | - |
| A-004 | Landmark regions used correctly (header, nav, main, footer) | 1.3.1 | - |
| A-005 | Heading hierarchy: one h1 per page, no skipped levels | 1.3.1 | - |
| A-006 | Keyboard-only navigation: all functionality accessible | 2.1.1 | - |
| A-007 | Focus order is logical (top-to-bottom, left-to-right) | 2.4.3 | - |
| A-008 | Focus indicator visible on all interactive elements | 2.4.7 | - |
| A-009 | Focus ring meets 3:1 contrast against adjacent colors | 1.4.11 | - |
| A-010 | No keyboard traps except intentional modal focus traps | 2.1.2 | - |

### 4.2 Color and Contrast

| # | Requirement | WCAG Criterion | Status |
|---|-------------|----------------|--------|
| A-011 | Normal text contrast ≥ 4.5:1 | 1.4.3 | - |
| A-012 | Large text contrast ≥ 3:1 | 1.4.3 | - |
| A-013 | UI components (borders, icons) contrast ≥ 3:1 | 1.4.11 | - |
| A-014 | Information not conveyed by color alone | 1.4.1 | - |
| A-015 | Error states use icon + text, not only red color | 1.4.1 | - |
| A-016 | Star rating uses filled/empty pattern + numeric label | 1.4.1 | - |

### 4.3 Images and Media

| # | Requirement | WCAG Criterion | Status |
|---|-------------|----------------|--------|
| A-017 | All movie poster `<img>` have meaningful alt text | 1.1.1 | - |
| A-018 | All user avatar `<img>` have descriptive alt text | 1.1.1 | - |
| A-019 | Decorative images use `alt=""` or `role="presentation"` | 1.1.1 | - |
| A-020 | Star icons (display) are aria-hidden; container has aria-label | 1.1.1 | - |
| A-021 | Backdrop image has appropriate alt or is aria-hidden | 1.1.1 | - |

### 4.4 Forms

| # | Requirement | WCAG Criterion | Status |
|---|-------------|----------------|--------|
| A-022 | All form inputs have visible, associated labels | 1.3.1, 2.4.6 | - |
| A-023 | Required fields marked with aria-required="true" | 1.3.1 | - |
| A-024 | Validation errors linked to inputs via aria-describedby | 3.3.1 | - |
| A-025 | Error messages use role="alert" or aria-live="assertive" | 4.1.3 | - |
| A-026 | Success messages use aria-live="polite" | 4.1.3 | - |
| A-027 | Character counter uses aria-live="polite" | 4.1.3 | - |
| A-028 | Review textarea has aria-invalid when validation fails | 3.3.1 | - |
| A-029 | Form inputs have sufficient touch targets (44×44px mobile) | 2.5.5 | - |

### 4.5 Star Rating Widget

| # | Requirement | WCAG Criterion | Status |
|---|-------------|----------------|--------|
| A-030 | Interactive star rating uses radiogroup pattern | 1.3.1 | - |
| A-031 | Each star option has distinct aria-label (e.g. "3 stars") | 1.3.1 | - |
| A-032 | Arrow keys navigate star values | 2.1.1 | - |
| A-033 | Display-only stars are aria-hidden; wrapper carries label | 1.1.1 | - |
| A-034 | Star color contrast (amber on dark): ≥ 3:1 | 1.4.11 | - |
| A-035 | Focus visible on the radio group (not individual hidden inputs) | 2.4.7 | - |

### 4.6 Dialogs and Modals

| # | Requirement | WCAG Criterion | Status |
|---|-------------|----------------|--------|
| A-036 | Confirmation dialogs use role="alertdialog" | 4.1.2 | - |
| A-037 | Dialog has aria-labelledby and aria-describedby | 1.3.1 | - |
| A-038 | aria-modal="true" on dialog overlay | 1.3.1 | - |
| A-039 | Focus trapped inside dialog when open | 2.1.2 | - |
| A-040 | Escape key closes dialog; focus returns to trigger | 2.1.1 | - |
| A-041 | Focus defaults to Cancel (not destructive confirm) | 2.4.3 | - |

### 4.7 Dynamic Content

| # | Requirement | WCAG Criterion | Status |
|---|-------------|----------------|--------|
| A-042 | Review submission success announced via aria-live | 4.1.3 | - |
| A-043 | Loading states use aria-busy="true" on container | 4.1.3 | - |
| A-044 | TMDB offline banner uses role="status" | 4.1.3 | - |
| A-045 | Toast notifications use role="status" (info) or role="alert" (error) | 4.1.3 | - |
| A-046 | Route changes announce new page title to screen readers | 2.4.2 | - |
| A-047 | Skeleton loaders are aria-hidden="true" | 1.3.1 | - |

### 4.8 Admin-Specific

| # | Requirement | WCAG Criterion | Status |
|---|-------------|----------------|--------|
| A-048 | Flag count badges have aria-label with full context | 1.3.1 | - |
| A-049 | Moderation buttons have aria-label including review author + movie | 2.4.6 | - |
| A-050 | Audit log table has `<caption>` and `<th scope="col">` | 1.3.1 | - |
| A-051 | "Hidden" review content toggle has aria-expanded state | 4.1.2 | - |
| A-052 | Destructive admin actions require confirmation dialog | 3.3.4 | - |

### 4.9 Responsive and Mobile

| # | Requirement | WCAG Criterion | Status |
|---|-------------|----------------|--------|
| A-053 | Mobile touch targets ≥ 44×44px | 2.5.5 | - |
| A-054 | No horizontal scroll at 375px viewport width | 1.4.10 | - |
| A-055 | Pinch-to-zoom not disabled (no user-scalable=no) | 1.4.4 | - |
| A-056 | Mobile filter drawer has accessible open/close | 2.1.1 | - |
| A-057 | Hamburger menu has aria-expanded and aria-controls | 4.1.2 | - |

---

### 4.10 Automated Testing Setup

**jest-axe integration (per component test):**
```typescript
// Example: MovieCard.test.tsx
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { MovieCard } from './MovieCard'

expect.extend(toHaveNoViolations)

it('has no accessibility violations', async () => {
  const { container } = render(<MovieCard movie={mockMovie} />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

This test must exist and pass for every component in the Component Inventory (Sections 1.1 and 1.2).

---

*Produced by ux-designer — 2026-05-23*
*Reviewed by tech-lead — 2026-05-23*
