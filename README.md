# skripsi-fe

Frontend-only Next.js 16 application for a Pre-University LMS.

This repository focuses on UI/UX, routing, feature composition, API integration, and client-side state orchestration. Backend business logic remains in Laravel.

## 1. Project Scope

### Backend assumptions

- Laravel API
- PostgreSQL
- Sanctum with Bearer Token
- Business logic stays in Laravel

### Frontend responsibilities

- UI and UX implementation
- Route composition and access gating
- Domain feature composition
- API consumption through a centralized client
- Server state handling and lightweight global client state

## 2. Role Model

Top-level role separation is intentionally simple:

- Student
- Admin

Instructor is not a separate top-level role area. Instructor use cases are part of Admin capabilities.

Implication:

- Admin = instructor capabilities (course creation, discussion management, etc.) + full access including master-data and platform management.

## 3. Architecture Direction

Use feature-driven architecture.

Target structure as the app grows:

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

Current repository is still in early bootstrap layout and can be refactored incrementally toward this structure.

## 4. Hard Constraints

- Do not connect directly to PostgreSQL from frontend
- Do not move backend business rules into frontend
- Do not assume cookie-based auth flow
- Do not hardcode API base URLs
- Do not bypass centralized API client
- Do not store all API/server data in Zustand
- Do not treat enrollment as a minor helper feature
- Do not split Instructor as a separate top-level role area

## 5. Enrollment as Core Feature

Enrollment is a business-critical gate and must appear in:

- Course detail pages
- Student dashboard summaries
- Course ownership/access status
- Payment handoff for paid flows

Avoid reducing enrollment to just a button without access logic.

## 6. Tech Stack

### Core (currently installed)

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- ESLint

### Required stack direction (project standard)

- shadcn/ui
- Poppins (global app font)
- TanStack Query
- Zustand
- React Hook Form
- Zod
- Sonner
- clsx
- tailwind-merge

## 7. Environment Variables

Create .env.local:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

Notes:

- Keep API URL configurable from environment.
- Attach Bearer token through centralized API client only.

## 8. Getting Started

### Prerequisites

- Node.js 20+
- npm (this repo currently includes package-lock.json)

### Install dependencies

```bash
npm install
```

### Run development server

```bash
npm run dev
```

Open http://localhost:3000

## 9. Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

Type check command:

```bash
npx tsc --noEmit
```

## 10. Development Guidelines

### Data and state

- Use TanStack Query for server state
- Use Zustand only for lightweight global client state (token, user summary, small UI state)
- Use React Hook Form + Zod for forms and validation

### API integration

- Keep request logic in centralized API modules
- Keep route files thin
- Avoid fetching directly inside large presentational components

### UI foundation

- Use shadcn/ui as base primitives
- Keep business logic out of primitive UI components
- Auth forms should use shadcn primitives, including DatePicker (Calendar + Popover)

## 11. Feature Priority

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

## 12. Quality Checklist Before Merge

- TypeScript passes
- Lint passes
- Responsive layout works
- Auth flow works
- Enrollment flow still makes sense
- Student/Admin UI gating behaves correctly
- No direct database access introduced
- No backend business logic duplicated in frontend
- Non-trivial logic is documented with meaningful comments

## 13. Related Docs

- AGENTS guide: see AGENTS.md

If you change auth flow, API layer, enrollment flow, route structure, shadcn usage direction, color tokens, or shared providers, update both AGENTS.md and this README.
