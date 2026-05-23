<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may differ from your training data.
Read the relevant project docs and follow App Router best practices before writing code.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

## Project Overview

This repository is a **frontend-only Next.js 16 application** for a Pre-University LMS.

Backend assumptions:

- Laravel API
- PostgreSQL
- Sanctum with **Bearer Token**
- Business logic stays in Laravel

This repository is responsible for:

- UI / UX
- routing
- feature composition
- API integration
- server state handling
- lightweight client state
- role-based page experience

---

## Hard Constraints

- DO NOT connect directly to PostgreSQL
- DO NOT run any database-changing command in backend workspace (including `php artisan migrate`, `migrate:fresh`, `migrate:refresh`, `db:seed`, or direct write SQL)
- DO NOT implement backend business logic in frontend
- DO NOT assume cookie-based auth
- DO NOT hardcode API base URLs
- DO NOT put all API data in Zustand
- DO NOT bypass the centralized API client
- DO NOT treat enrollment as a minor helper feature
- DO NOT split instructor as a separate top-level role area

---

## Role Model (High-Level)

System role separation should be kept simple at the top level:

- Student
- Admin

Instructor is treated as a capability set inside Admin, not as a separate top-level role or route group.

Implications:

- Admin includes instructor capabilities (course creation, course discussion management, and related teaching operations)
- Admin also retains full access, including master-data and platform management
- Route and UI gating should follow Student vs Admin boundaries

---

## Architecture Rules

Use **feature-driven architecture**.

### Why

This LMS contains multiple business domains:

- auth
- course
- enrollment
- lesson
- quiz
- forum
- payment
- certificate
- review

Because of that, code should be grouped by feature/domain, not scattered by technical layer only.

### Required Direction

- Keep routing in `src/app/*`
- Keep reusable primitive UI in `src/components/ui/*`
- Keep domain logic in `src/features/*`
- Keep shared utilities in `src/lib/*`
- Keep global client stores in `src/stores/*`
- Keep provider setup in `src/providers/*`
- Keep route files thin

---

## Folder Conventions

```txt
src/
	app/
		(public)/
		(student)/
		(admin)/

	features/
		auth/
		course/
		enrollment/
		lesson/
		quiz/
		forum/
		payment/
		certificate/
		review/
		dashboard/

	components/
		ui/
		shared/
		layout/

	lib/
		api/
		utils/
		constants/
		schemas/

	stores/
	providers/
	hooks/
	types/
```

### Folder Responsibilities

- `app/*` -> route entry, layouts, loading, error boundaries
- `features/*` -> domain-specific components, hooks, services, logic
- `components/ui/*` -> **shadcn/ui** generated base components
- `components/shared/*` -> app-wide shared components
- `components/layout/*` -> navbar, sidebar, page shells
- `lib/api/*` -> centralized API wrappers
- `lib/schemas/*` -> Zod schemas
- `stores/*` -> Zustand stores only for lightweight global state
- `providers/*` -> React Query provider, theme provider, etc.

---

## Required Tech Stack

### Core

- Next.js 16
- React
- TypeScript

### Styling & UI

- Tailwind CSS
- **shadcn/ui**
- Lucide React

### UI Copy Rules

- Tampilkan hanya copy yang membantu user memahami status, aksi, atau hasil yang relevan di layar saat itu.
- Jangan tampilkan catatan internal, penjelasan implementasi, debug text, atau keterangan teknis yang bukan untuk user akhir.
- Jika sebuah informasi hanya berguna untuk developer atau agent, simpan di kode, komentar, atau dokumentasi internal; jangan render ke UI.

### State & Data

- TanStack Query
- Zustand

### Forms & Validation

- React Hook Form
- Zod

### Form Validation Rules

- Untuk semua form non-trivial (auth, admin CRUD, payment, enrollment, profile), validasi frontend wajib berbasis schema Zod.
- Hindari validasi ad-hoc berbasis `if` berulang sebagai sumber validasi utama.
- Gunakan satu schema sebagai source of truth agar mapping error field konsisten dan mudah dijelaskan.
- Validasi manual hanya boleh sebagai fallback kecil (contoh: guard navigasi/konfirmasi), bukan menggantikan schema Zod.

### Helpers

- Sonner
- clsx
- tailwind-merge

---

## shadcn/ui Rules

**shadcn/ui is part of the expected stack and must be treated as a standard UI foundation in this repo.**

### Use shadcn/ui for

- buttons
- inputs
- form controls
- dialogs
- sheets
- tables
- tabs
- cards
- badges
- dropdown menus
- alerts
- toasts when appropriate

### Do Not

- rebuild basic primitives from scratch when a shadcn/ui component is the better fit
- place domain-specific business logic inside `components/ui/*`

### Preferred Pattern

- base UI primitive stays in `components/ui/*`
- business wrapper stays in `features/*`
- keep global shadcn design tokens centralized in `src/app/globals.css` (minimally color semantics + base radius tokens)

Example:

- `components/ui/card.tsx`
- `features/course/components/course-card.tsx`
- `features/enrollment/components/enrollment-summary-card.tsx`

---

## Feature Overview

### 1. auth

Tables / backend entities:

- users
- roles

Responsibilities:

- login
- logout
- current user
- role awareness (student/admin)
- bearer token handling

### 2. course

Tables / backend entities:

- courses
- categories

Responsibilities:

- course catalog
- course detail
- course filter
- category filter
- search

### 3. enrollment

Tables / backend entities:

- enrollments
- courses
- orders
- order_items
- transactions

**This is a core LMS feature and must be treated as such.**

Responsibilities:

- enroll flow
- check if user is enrolled
- determine whether access is locked/unlocked
- free vs paid course entry flow
- connect course access to payment result
- show ownership / enrollment status on course detail and dashboard

### 4. lesson

Tables / backend entities:

- sections
- lessons
- lesson_progress

Responsibilities:

- section list
- lesson list
- lesson detail access
- learning progress display
- continue learning flow

### 5. quiz

Tables / backend entities:

- quizzes
- questions
- options
- quiz_attempts
- quiz_answers

Responsibilities:

- quiz rendering
- submission
- scoring display
- attempt history

### 6. forum

Tables / backend entities:

- forum_posts
- forum_replies

Responsibilities:

- thread list
- post detail
- replies
- discussion participation

### 7. payment

Tables / backend entities:

- orders
- order_items
- transactions
- vouchers
- voucher_usages

Responsibilities:

- order summary
- payment status
- voucher usage
- transaction history

### 8. certificate

Tables / backend entities:

- certificates

Responsibilities:

- certificate eligibility
- certificate list
- certificate access / download state

### 9. review

Tables / backend entities:

- reviews

Responsibilities:

- review display
- rating
- review submission

---

## Enrollment Rules (Important)

Enrollment is not optional architecture-wise.

### Treat enrollment as:

- a dedicated feature folder
- a dedicated UI flow
- a dedicated data flow
- a business-critical gate to course access

### Enrollment must appear in:

- course detail pages
- student dashboard summaries
- course ownership / access status
- payment handoff if needed

### Avoid

- burying enrollment logic inside generic course components
- treating enrollment as only a button without access logic
- mixing course browsing and enrollment status carelessly

---

## Authentication Rules

- Use **Bearer Token** only
- Token must be attached through the centralized API client
- Do not use `cookies()` assumptions for auth
- Do not use cookie-session flow unless explicitly changed in the backend architecture

### Expected frontend behavior

- store auth token in lightweight client state
- store current user summary
- use role data for UI gating with Student vs Admin boundaries
- keep token handling centralized

---

## State Management Rules

Use the right tool for the right kind of state.

### Local UI state

Use:

- `useState`
- `useReducer` when local logic becomes complex

Examples:

- modal open/close
- accordion state
- tab selection

### Form state

Use:

- React Hook Form
- Zod

Examples:

- login
- voucher form
- profile form
- reply form
- quiz submission form

### Server state

Use:

- TanStack Query

Examples:

- course list
- course detail
- enrollment status
- lessons
- quiz attempts
- forum threads
- transactions
- certificate data
- review list

### Global client state

Use:

- Zustand

Examples:

- auth token
- current user summary
- role (student/admin)
- sidebar state
- small app-wide UI state

### Avoid

- using Zustand for all fetched API data
- duplicating TanStack Query cache inside Zustand
- creating multiple sources of truth for enrollment/access state without reason

---

## API Rules

- Use a centralized API client in `src/lib/api/*`
- Use `NEXT_PUBLIC_API_URL`
- Normalize request and error handling
- Keep endpoint-specific wrappers small and organized

## Import Rules

- Selalu deklarasikan import di bagian atas file (TypeScript/JavaScript: `import ...`, PHP: `use ...;`) untuk dependency/class yang dipakai.
- Jangan menulis fully qualified class name inline di dalam kode.
- Contoh yang dilarang: `App\Http\Middleware\EnsureAdminAccess::class`.
- Contoh yang benar: deklarasikan `use App\Http\Middleware\EnsureAdminAccess;` di atas, lalu pakai `EnsureAdminAccess::class` di body kode.
- Terapkan pola yang sama untuk middleware, request, resource, service, enum, dan class lain yang direferensikan.

Preferred modules:

- `auth.ts`
- `courses.ts`
- `enrollments.ts`
- `lessons.ts`
- `quiz.ts`
- `forum.ts`
- `payment.ts`
- `certificate.ts`
- `review.ts`

### Do Not

- fetch directly inside large presentational components
- hardcode endpoint URLs inside random files
- mix UI rendering with raw request logic when abstraction is needed

### Admin Management Rules

- For admin CRUD modules (users, categories, courses, vouchers, and related master entities), use real API integration.
- Do not ship admin CRUD pages with hardcoded mock rows as the primary data source.
- Use internal Next.js API proxy routes (`/api/admin/*`) for authenticated admin requests so bearer token handling stays centralized.
- For admin CRUD list screens, keep create/edit form in a modal popup or dedicated page. Do not place full form inline in the table list layout.
- For admin UI controls and forms, avoid overly rounded corners; prefer rigid radius (`rounded-md` / `rounded-lg`) and avoid `rounded-full` for standard controls (except avatar or elements that are intentionally circular).

---

## UI / UX Rules

For detailed visual identity, design tokens, layout guidance, and component-level rules, use `DESIGN.md` as the design system source of truth. Keep `src/app/globals.css` aligned with the tokens documented there.

### Design Philosophy

The UI should feel:

- simple
- modern
- structured
- mobile-first
- easy to understand
- suitable for student users

### Color Rules

- Primary: Green (`#0F7A5A`)
- Secondary: Yellow (`#D9AF00`)
- Accent: `#F4C400`

### Color Usage

Use green for:

- primary buttons
- active nav
- brand emphasis
- important headings
- key progress / success emphasis

Use yellow for:

- highlights
- metric cards
- badges
- secondary CTA
- important callouts

### Visual Consistency Rules

- Gunakan pendekatan `solid-first` untuk background/surface komponen dashboard (admin dan student).
- Hindari gradient sebagai default pada panel, card, header, modal, dan shell layout.
- Gradient hanya boleh dipakai untuk kebutuhan khusus yang eksplisit (misalnya hero marketing), bukan untuk UI sistem utama.
- Semua dashboard role (admin/student) wajib memakai token theme bersama agar tampilan konsisten.

### Required UX Rules

- mobile-first layout
- clear navigation
- avoid clutter
- obvious call to action
- readable typography
- consistent spacing
- important actions must not be hidden

### Required States

Important pages must include:

- loading state
- empty state
- error state
- success feedback where relevant

---

## LMS UI Reference Benchmarks

Gunakan referensi berikut sebagai benchmark wajib untuk pola UX LMS/admin dashboard:

- [Udemy Business - Learning Platform](https://business.udemy.com/learning-and-development/)
- [LinkedIn Learning - Platform Overview](https://learning.linkedin.com/)
- [LinkedIn Learning - Compare Plans/Capabilities](https://learning.linkedin.com/compare-plans)
- [KelasFullstack](https://www.kelasfullstack.id/)
- [Universitas Terbuka - Elearning](https://elearning.ut.ac.id/)
- [UT Tarakan - Portal layanan pembelajaran](https://tarakan.ut.ac.id/)
- [Ruangguru - ruangbelajar](https://www.ruangguru.com/ruangbelajar)
- [Open edX - Course Dashboard](https://docs.openedx.org/en/latest/learners/concepts/open_edx_platform/what_is_course_dashboard.html)
- [Open edX Aspects - At-Risk Dashboard](https://docs.openedx.org/projects/openedx-aspects/en/latest/reference/learner_groups_dashboard.html)
- [Moodle - Dashboard](https://docs.moodle.org/en/My_home)
- [Canvas - Student Dashboard Guide](https://community.canvaslms.com/t5/Canvas-Basics-Guide/How-do-I-use-the-Dashboard-as-a-student/ta-p/618762)
- [Canvas - Admin Analytics Overview](https://community.canvaslms.com/t5/Admin-Guide/How-do-I-view-the-Admin-Analytics-Overview-Dashboard/ta-p/562117)
- [Coursera for Business - Skills Dashboard](https://www.coursera.org/business/products/skillsdashboard)

### How To Use References

- Ambil pola UX dan information hierarchy (dashboard cards, to-do/deadline visibility, analytics snapshots, course progress, quick actions), bukan menyalin komponen 1:1.
- Prioritaskan `efficiency-first` untuk admin: data padat namun tetap terbaca (`dense-but-readable tables`), quick filters, shortcut CTA, dan navigasi cepat antar modul.
- Form panjang/kompleks harus dipecah menjadi section yang jelas dengan aksi simpan/batal yang mudah dijangkau (sticky action jika perlu).
- Selalu pertahankan brand palette skripsi (green/yellow) pada level token/theme, bukan hardcode warna per komponen.

### Form Complexity Split (Admin CRUD)

- Form kompleks/panjang wajib halaman terpisah: `Users`, `Courses`.
- Form sederhana/pendek boleh tetap modal: `Categories`, `Vouchers`.
- Jika kompleksitas naik (field bertambah, validasi bertingkat, dependensi data tinggi), migrasikan dari modal ke halaman terpisah.

---

## Code Documentation Rules

### Mandatory Rule

All non-trivial code MUST include meaningful comments.

### Must Include Comments For

- API integration logic
- token/auth logic
- enrollment flow logic
- state management logic
- complex conditions
- mapping/transformation logic
- edge cases
- workaround logic
- important functions (especially exported/public functions and non-trivial helpers) with short intent-focused comments

### Avoid

- commenting obvious code
- comments that repeat the code literally
- outdated comments
- noisy comments on every trivial line

### Goal

- code should remain readable
- comments should add context, not duplication

---

## Academic Requirement

This project is part of a thesis.

Therefore:

- prioritize clarity over cleverness
- keep code easy to explain
- maintain consistent commenting style
- avoid overly clever abstractions without need
- prefer explicit feature boundaries

---

## Common Mistakes To Avoid

- Fetching API data directly inside random UI components
- Treating enrollment as only a button, not a feature
- Mixing server and client concerns incorrectly
- Overusing Client Components
- Duplicating backend business rules in the frontend
- Storing all server data in Zustand
- Putting too much logic into `page.tsx`
- Ignoring loading / empty / error states
- Ignoring shadcn/ui as the primary UI base

---

## Verification Checklist

Before considering work complete, verify:

- TypeScript passes
- lint passes
- responsive layout works
- auth flow works
- enrollment flow still makes sense
- role-based UI still behaves correctly
- no direct database access was introduced
- no backend business logic was incorrectly moved into frontend
- comments were added for important logic

Suggested commands:

```bash
pnpm lint
pnpm exec tsc --noEmit
```

---

## Git Commit Message Rules

- Do not run `git commit` unless the user explicitly asks for a commit.
- Do not auto-generate commit messages as part of normal code changes.
- If a commit message is requested, write exactly one complete sentence in one line.
- Use this format only: `<type>: <imperative summary>` with one prefix from `feat`, `fix`, `refactor`, `chore`, `docs`, or `test`.
- Use imperative mood for the summary (example: `refactor: unify theme variables for dark mode`).
- Keep one commit message focused on one primary change only.
- Keep the first line concise (target 50-72 characters), and do not end the subject with a period.
- Do not use bullet lists, numbered lists, or multiline commit message formats.

---

## Feature Priority

Build in this order unless task requirements say otherwise:

1. project setup
2. providers and base architecture
3. auth
4. course catalog
5. course detail
6. enrollment
7. student dashboard
8. lesson flow
9. quiz
10. forum
11. payment
12. certificate
13. review
14. admin dashboard (includes instructor use cases)

---

## Change Report Rules

Every completed feature or any code/config change MUST be accompanied by a markdown report file.

### Required Location

- `temp/YYYY-MM-DD-short-topic.md`

### File Reuse Rule

- If the new changes are still within the same context/topic, do not create a new markdown file.
- Update the existing markdown file for that context in `temp` and append a clear "update lanjutan" section.
- Create a new markdown file only when the context/topic is materially different.

### Minimum Content

- short summary of what changed
- list of files added/modified/deleted with one-line purpose per file
- impact notes (architecture, auth, routing, data flow, or UI behavior)

### Completion Rule

Work is not considered complete until the change report markdown file is created or updated.

---

## Maintenance Note

If changes affect:

- auth flow
- API layer
- enrollment flow
- route structure
- shadcn/ui usage direction
- color tokens
- shared providers

then update:

- `README.md`
- `AGENTS.md`
- `temp/*.md`
