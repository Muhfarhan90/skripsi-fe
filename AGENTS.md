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

### State & Data

- TanStack Query
- Zustand

### Forms & Validation

- React Hook Form
- Zod

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

---

## UI / UX Rules

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
