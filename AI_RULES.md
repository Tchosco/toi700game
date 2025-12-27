# AI Rules and Tech Stack Guide

This document defines how AI assistants should contribute to this codebase, which tools to use, and clear rules for library usage.

## Tech Stack (Snapshot)
- React 19 with TypeScript and Vite 5 for fast, modern development.
- Tailwind CSS for styling, with tailwindcss-animate for simple animations.
- shadcn/ui components (built on Radix UI) for accessible, consistent UI primitives.
- React Router v6 for client-side routing, with routes defined in `src/App.tsx`.
- TanStack React Query for server-state fetching, caching, and mutations.
- Supabase (`@supabase/supabase-js`) for backend, auth, and edge functions.
- React Hook Form + Zod for forms and schema validation.
- Lucide React icons for consistent iconography.
- Sonner and Radix Toast for notifications; Recharts for charts; date-fns for dates.
- Embla Carousel for carousels (used via shadcn/ui carousel wrapper).

## Library Usage Rules

### UI & Styling
- Use Tailwind CSS exclusively for styling; avoid inline styles unless trivial.
- Use shadcn/ui components from `src/components/ui` for common primitives (Button, Dialog, Input, Table, etc.).
- When a UI primitive is missing, prefer Radix UI components already included, wrapped with Tailwind for styling.
- Do not add alternative UI libraries (e.g., Material UI, Chakra, Bootstrap).

### Routing
- Use `react-router-dom`; keep all routes centralized in `src/App.tsx`.
- Place page components under `src/pages`; do not use Next.js or file-based routing.

### Data Fetching & Caching
- Use TanStack React Query for all server-state (queries and mutations).
- Co-locate query/mutation hooks with the feature, and use query keys consistently.
- Do not introduce other data libraries (Redux, SWR, Apollo) unless explicitly requested.

### Backend & Auth
- Use Supabase client from `src/integrations/supabase/client.ts` for all backend operations.
- Environment variables required: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Server-side logic should live in Supabase Edge Functions under `supabase/functions/*`.
- Do not add custom backend frameworks or external auth providers without approval.

### Forms & Validation
- Use React Hook Form for all forms.
- Validate with Zod and `@hookform/resolvers/zod`; define schemas per form.
- Use shadcn/ui form components and inputs for consistency and accessibility.

### Icons & Media
- Use `lucide-react` for all icons.
- Do not add other icon sets unless a specific icon is missing and approved.

### Feedback & Notifications
- Prefer Sonner (`src/components/ui/sonner`) for global toast notifications.
- Use Radix Toast (`src/components/ui/toast`/`toaster`) for contextual or inline toasts.
- Avoid custom toast systems or third-party alternatives.

### Charts & Data Visualization
- Use Recharts for charts and graphs.
- Keep chart components small and focused; reuse shared styles and colors from Tailwind tokens.

### Dates & Formatting
- Use `date-fns` for date utilities and formatting.
- Do not add moment.js or other date libraries.

### Carousels & Effects
- Use Embla Carousel via shadcn/ui carousel component.
- Use `tailwindcss-animate` classes for simple transitions; avoid heavy animation libraries.