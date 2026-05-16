---
version: alpha
name: Skripsi LMS
description: Design system for the Pre-University LMS frontend.
colors:
  background-light: "#F4F7F8"
  foreground-light: "#0F172A"
  card-light: "#FFFFFF"
  popover-light: "#FFFFFF"
  primary: "#0F7A5A"
  primary-foreground: "#FFFFFF"
  secondary: "#D9AF00"
  secondary-foreground: "#111827"
  accent: "#F4C400"
  accent-foreground: "#111827"
  muted-light: "#EDF2F4"
  muted-foreground-light: "#475569"
  border-light: "#CFD8DF"
  input-light: "#DCE4EA"
  ring: "#0F7A5A"
  destructive: "#DC2626"
  surface-hover-light: "#E3EBF0"
  surface-soft-light: "#F0F4F6"
  danger-soft-bg-light: "#FFF1F1"
  danger-soft-border-light: "#FECACA"
  danger-soft-foreground-light: "#B42318"
  background-dark: "#0A1311"
  foreground-dark: "#E5ECEA"
  card-dark: "#10201C"
  popover-dark: "#10201C"
  muted-dark: "#1B2D29"
  muted-foreground-dark: "#AABBB6"
  border-dark: "#2F4540"
  input-dark: "#314944"
  surface-hover-dark: "#213632"
  surface-soft-dark: "#162521"
  danger-soft-bg-dark: "#3A1F22"
  danger-soft-border-dark: "#7F1D1D"
  danger-soft-foreground-dark: "#FECACA"
typography:
  page-title:
    fontFamily: Poppins
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: 0em
  section-title:
    fontFamily: Poppins
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: 0em
  card-title:
    fontFamily: Poppins
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0em
  body:
    fontFamily: Poppins
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0em
  label:
    fontFamily: Poppins
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0em
  caption:
    fontFamily: Poppins
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: 0em
  nav-section:
    fontFamily: Poppins
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.08em
rounded:
  sm: 0.375rem
  md: 0.5rem
  lg: 0.625rem
  xl: 0.875rem
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  2xl: 24px
  3xl: 32px
  page-x-mobile: 16px
  page-x-tablet: 24px
  page-x-desktop: 32px
  page-y: 20px
  topbar-height: 74px
  sidebar-width: 280px
  sidebar-collapsed-width: 92px
  content-max-width: 1320px
components:
  shell-dashboard:
    backgroundColor: "{colors.background-light}"
    textColor: "{colors.foreground-light}"
    maxWidth: "{spacing.content-max-width}"
  sidebar:
    width: "{spacing.sidebar-width}"
    collapsedWidth: "{spacing.sidebar-collapsed-width}"
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
  topbar:
    height: "{spacing.topbar-height}"
    backgroundColor: "{colors.card-light}"
    borderColor: "{colors.border-light}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    height: 36px
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.md}"
    height: 36px
  card:
    backgroundColor: "{colors.card-light}"
    borderColor: "{colors.border-light}"
    rounded: "{rounded.lg}"
  input:
    backgroundColor: "{colors.surface-soft-light}"
    borderColor: "{colors.border-light}"
    rounded: "{rounded.md}"
    height: 36px
---

# Skripsi LMS Design System

## Overview

Skripsi LMS is a structured learning management interface for student learning flows and admin operations. The UI should feel academic, reliable, clear, and efficient. It is not a marketing-first product surface; dashboards and workflow screens should prioritize scanning, repeated actions, status visibility, and predictable navigation.

Use a solid-first visual language. The primary dashboard surfaces are flat, layered, and separated by borders, muted fills, and small shadows. Gradients are not part of the default system UI. The design should remain mobile-first, but desktop admin screens may be dense when the content is tabular or operational.

The main product identity is a green and yellow LMS palette:

- Green is the institutional brand color and primary action color.
- Yellow is the secondary highlight color for active navigation, learning progress, badges, and important secondary actions.
- Neutral blue-gray surfaces keep the interface calm and readable.

## Colors

The implementation source of truth is `src/app/globals.css`. Use semantic CSS variables through Tailwind utilities such as `bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`, and direct variable references such as `bg-[var(--primary)]` when local consistency requires it.

- **Primary / Institutional Green (`#0F7A5A`):** primary buttons, brand marks, active emphasis, focus ring, important links, and avatar backgrounds.
- **Secondary / LMS Yellow (`#D9AF00` light, `#F4C400` dark/accent):** active sidebar items, learning progress, course badges, and secondary CTAs.
- **Background Light (`#F4F7F8`):** page shell background for dashboard and public app surfaces.
- **Background Dark (`#0A1311`):** dark-mode shell background.
- **Card Light (`#FFFFFF`) / Card Dark (`#10201C`):** topbar, cards, popovers, modal surfaces, and table content areas.
- **Muted Light (`#EDF2F4`) / Muted Dark (`#1B2D29`):** table headers, empty-state surfaces, passive pills, and grouped form panels.
- **Border Light (`#CFD8DF`) / Border Dark (`#2F4540`):** structural separators, card borders, table dividers, and inputs.
- **Danger (`#DC2626`) and soft danger tokens:** destructive action states, delete confirmations, failed states, and logout warning treatments.

Avoid hardcoded color values in new components unless the value is a one-off domain status color that is already established, such as emerald for success, amber for pending, sky for upcoming/submitted, or red/rose for failed/destructive states. Prefer semantic tokens for core layout and controls.

## Typography

Use **Poppins** globally through `next/font/google` and `--font-poppins`. Supported weights are `400`, `500`, `600`, and `700`.

- **Page titles:** `text-2xl` or `text-xl`, `font-semibold`, tight but readable line-height.
- **Card/table section titles:** `text-base font-semibold`.
- **Body copy:** `text-sm`, regular weight, `text-muted-foreground` for secondary explanatory text.
- **Labels and actions:** `text-sm font-medium`.
- **Captions, metadata, breadcrumbs:** `text-xs`, usually muted.
- **Sidebar group labels:** `text-[11px] font-semibold uppercase tracking-[0.08em]`.

Do not use negative letter spacing. Keep large typography rare inside dashboards; compact panels, table cards, sidebars, and topbars should use restrained type sizes.

## Layout

The application uses three primary layout families:

- **Dashboard shell:** fixed sidebar and sticky topbar for both admin and student. Desktop sidebar is `280px`, collapsed sidebar is `92px`, and the topbar height is `74px`.
- **Dashboard content:** `max-w-[1320px]`, horizontal padding `px-4 sm:px-6 lg:px-8`, vertical page padding `py-5`.
- **Public/auth surfaces:** centered, simple, and card-based. Auth forms use a max width of `max-w-md`.

Admin screens should be efficient and dense enough for repeated work. Use table cards, compact filters, search inputs, pagination, clear CTAs, and modal/page form split based on complexity. Student screens should make learning progress, cart actions, enrollment state, and next learning action visible without extra navigation.

Responsive behavior should keep navigation reachable:

- On mobile, sidebar opens as a drawer with backdrop.
- On desktop, sidebar can collapse to icon-only mode.
- Tables and wide data regions should use horizontal overflow instead of squeezing text into unreadable columns.

## Elevation & Depth

Depth is intentionally modest. Use borders, muted backgrounds, and small shadows to separate surfaces.

- Use `border border-[var(--border)] bg-[var(--card)] shadow-sm` for dashboard cards and table wrappers.
- Use `shadow-lg` for popovers, floating quick-search results, and modal-like overlays.
- Avoid heavy shadows and decorative depth. Do not stack cards inside cards unless the inner element is a true repeated item, modal, or framed tool.

## Shapes

The shape language is modern but controlled.

- Standard buttons and inputs use `rounded-md`.
- Dashboard headers and cards use `rounded-lg`.
- Course cards may use `rounded-xl` when they include thumbnails or repeated catalog items.
- Use `rounded-full` only for avatars, badges/pills, progress bars, and truly circular counters.
- Admin CRUD controls should avoid overly soft or decorative rounded corners.

## Components

### Buttons

Use `src/components/ui/button.tsx` for base buttons when possible. Use lucide icons for actions like add, edit, delete, search, menu, collapse, cart, and logout.

- Primary action: green background, white text, `h-9` or shadcn `size="lg"` for prominent actions.
- Secondary action: yellow background for active or learning-focused actions.
- Outline/ghost actions: card background with border and muted hover for low-risk actions.
- Destructive action: use destructive/soft-danger tokens and clear disabled/loading states.

### Cards

Use shadcn card primitives for reusable surfaces. Dashboard cards should usually be `border border-[var(--border)] bg-[var(--card)] shadow-sm`. Keep card titles compact and place metadata under titles with muted text.

### Tables

Operational admin lists should be table-first.

- Header: muted background, uppercase `text-xs font-semibold`.
- Body: card background, row dividers, hover with `surface-hover`.
- Search and filters should sit in the table card header.
- Empty and error states should be explicit and visible inside the table area.

### Forms

Use React Hook Form and Zod for non-trivial forms. Inputs should use shadcn primitives, semantic labels, helper/error text, and consistent spacing.

- Simple forms can live in modals.
- Complex forms such as users, courses, offerings, lessons, and quizzes should use dedicated pages or clearly separated sections.
- Keep submit/cancel actions easy to reach.

### Navigation

Admin and student sidebars share the same structural pattern. The sidebar background is primary green; active items use secondary yellow with dark text. Topbar actions are icon-first, square `size-9`, bordered, and hover with `surface-hover`.

Student topbar uses breadcrumbs and page title. Admin topbar uses quick route search. Preserve this distinction unless the product workflow changes.

### Status Badges

Use compact status badges with semantic colors:

- Emerald: active, paid, published, approved, completed, required.
- Amber: pending, waiting, draft, planned, revision required.
- Sky: upcoming or submitted.
- Zinc: closed or neutral/inactive requirement state.
- Red/Rose: failed, blocked, cancelled, archived, destructive states.

### Learning Cards

Course/enrollment cards should prioritize thumbnail, title, category/instructor metadata, progress, and the next action. Progress bars use secondary yellow. Course price highlights may use secondary/accent or established success green depending on the surrounding screen, but avoid introducing a new dominant palette.

## Do's and Don'ts

- Do use semantic CSS variables from `globals.css` as the default source for color, radius, and typography decisions.
- Do keep admin pages dense, structured, and table-friendly.
- Do keep student pages progress-oriented with visible next actions.
- Do provide loading, empty, error, and disabled states on important data-driven screens.
- Do use shadcn/ui primitives for base controls and keep business logic in `src/features/*`.
- Do use lucide-react icons for standard UI actions.
- Don't use gradients for dashboard panels, cards, headers, modals, or shell backgrounds.
- Don't hardcode primary/secondary colors in new code when a semantic token is available.
- Don't make standard admin controls `rounded-full`; reserve that shape for badges, avatars, and progress bars.
- Don't hide important CTAs behind unclear icon-only controls unless an accessible label and obvious context exist.
- Don't place backend business rules, enrollment ownership rules, or direct API request logic inside visual components.
