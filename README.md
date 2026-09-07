# Sigma Nu Scholarship Management System

Internal academic operations software for Sigma Nu Eta Chapter at Mercer University. It supports member course and weekly-grade reporting, estimated-semester GPA, study-hour policy and logging, administrative review, secure email workflows, analytics, exports, auditing, and Scholarship Chair handoff.

The database is the source of truth. Google Sheets is not required at runtime.

## Local development

1. Install Node.js 22 LTS and Docker Desktop.
2. Copy `.env.example` to `.env.local`. Use a current `sb_publishable_...` value for `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Leave `SUPABASE_SECRET_KEY` unset unless a narrowly scoped privileged server workflow explicitly requires a current `sb_secret_...` value; legacy `anon`/`service_role` keys are intentionally unsupported.
3. Run `npm install`.
4. Run `npm run dev` for the web app.
5. Run `npm run db:start`, then `npm run db:reset`, `npm run db:test`, and `npm run db:lint` for the local database.
6. Run `npm run test`, `npm run lint`, `npm run typecheck`, and `npm run build` before merging.

For local Supabase setup, deployment, OAuth, email, and one-time bootstrap configuration, see [Deployment](docs/DEPLOYMENT.md) and [Handoff](docs/HANDOFF.md).

## Repository map

- `src/app`: routes, layouts, route handlers, and server actions
- `src/features`: feature-specific UI and application services
- `src/lib/domain`: framework-independent business rules
- `src/lib/supabase`: browser/server/database access
- `supabase/migrations`: reproducible schema, functions, triggers, and RLS
- `supabase/tests`: database and permission tests
- `tests`: unit, integration, and end-to-end tests
- `docs`: product and operating documentation

No real member or academic data belongs in source control.
