# Sigma Nu Scholarship Management System

## Mission

Build a secure, durable scholarship operations system that a future Scholarship Chair can run entirely from the website without code, SQL, Git, hosting consoles, or terminal access.

## Non-negotiable rules

- PostgreSQL through Supabase is the source of truth. Google Sheets is import-only.
- Keep all authorization chapter-scoped and enforce it with Supabase Row Level Security.
- Browser and ordinary authenticated server clients use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` so RLS remains authoritative.
- `SUPABASE_SECRET_KEY` is server-only, bypasses RLS, and is reserved for narrowly scoped privileged infrastructure operations. Never expose it to clients, logs, URLs, generated HTML, or API responses.
- Preserve history: submissions use revisions, courses are archived, policies are versioned, and audit records are append-only.
- There must be exactly one active Scholarship Chair. Chair transfer is atomic and Chair-only.
- Google authentication proves identity but does not grant roster access. Unlinked accounts can only request access and view their request state.
- All trusted-boundary inputs use Zod. Authoritative calculations run server-side.
- Use integer minutes for study duration and snapshot inputs used by historical calculations.
- Buttons and workflows must work; do not ship inert placeholders outside clearly marked demo mode.
- Keep normal-user errors plain and actionable. Do not expose provider or database internals.

## Engineering conventions

- Next.js App Router, strict TypeScript, Tailwind CSS, shadcn/ui-style primitives, Supabase, Recharts, Zod, Resend.
- Organize business behavior in `src/lib/domain` and feature-specific modules, not React components.
- Prefer server components. Use client components only for interaction or browser APIs.
- All mutations go through server actions/route handlers with authentication, authorization, validation, and audit behavior.
- Database changes are forward-only SQL migrations in `supabase/migrations`.
- Use lowercase snake_case in PostgreSQL; use explicit TypeScript domain types at application boundaries.
- Use accessible labels, semantic controls, keyboard support, and mobile-first layouts.
- Fake data must be unmistakably synthetic and enabled only in development/demo mode.

## Verification before handoff

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. Run Supabase database tests when Docker/Supabase CLI is available. Update `docs/IMPLEMENTATION_PLAN.md` after each phase and document external configuration without recording secrets.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
