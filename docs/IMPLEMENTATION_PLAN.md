# Implementation plan

Status legend: `[x]` complete, `[~]` in progress, `[ ]` not started, `[!]` external configuration required.

## Phase 0 — Repository and foundation

- [x] Inspect repository and establish application root
- [x] Create `AGENTS.md` and product/operations documentation
- [x] Scaffold strict Next.js, TypeScript, Tailwind, UI primitives, linting, formatting, and test tooling
- [x] Add environment schema and `.env.example`
- [x] Verify install, lint, typecheck, tests, and build

## Phase 1 — Database, authentication, and security

- [x] Supabase clients and auth proxy structure
- [x] Current Supabase publishable/secret API-key boundaries, with the secret isolated to explicit server-only privileged operations
- [x] Normalized chapter-scoped initial schema and migration
- [~] Google OAuth, access request, approval/link/disconnect
- [~] One-time secure bootstrap and initial setup state
- [~] RLS policies and permission/database tests (33 database tests passing; expand assignment/session/email cases with feature implementation)

## Phase 2 — Member course management

- [x] Member dashboard and navigation shell
- [~] Create/edit/archive course workflows (create/archive implemented; edit remains)
- [x] Four grading types, grading-scale snapshots, and custom exclusion defaults

## Phase 3 — Weekly academic check-in

- [x] Academic weeks/deadlines and previous-value prepopulation
- [x] Immutable submissions/revisions and timing states
- [~] Authoritative estimated GPA and member history/trends (calculation complete; production trend UI remains)
- [x] Grade-change alert detection

## Phase 4 — Chair academic operations

- [ ] Action-oriented dashboard, member directory/profile, This Week
- [ ] Alerts and custom-grading review

## Phase 5 — Study hours

- [x] Versioned rules and calculations
- [~] Assignments, override/removal, freeze/post-freeze review (trusted database operations complete; administrative UI remains)
- [x] Member progress display shell

## Phase 6 — Proctor portal

- [x] Searchable active-member selection and integer-minute logging
- [~] Current-week editing, old-week lock, auditing, privacy tests (database operation complete; edit UI and additional tests remain)

## Phase 7 — Email center

- [x] Resend adapter and safe mock transport
- [~] Template, batch, individual edit, preview, approval/send (validated template/edit domain complete; persistent send workflow remains)
- [ ] Idempotency, webhook delivery, failure/retry history

## Phase 8 — Analytics

- [ ] Chapter/member/course trends and submission/study completion analytics

## Phase 9 — Settings and administration

- [ ] Semester/deadline/grading/rule/alert/email settings
- [ ] CSV roster import, ZIP/CSV export, role management, audit UI

## Phase 10 — Handoff and onboarding

- [ ] Readiness checks and atomic Chair handoff
- [ ] New-Chair onboarding and in-app guide

## Phase 11 — Production hardening

- [ ] Accessibility/responsive/security/error/loading/empty-state review
- [ ] Backup/export verification and complete automated test suite
- [!] Configure production Supabase, Google OAuth, Resend, Vercel, and DNS
