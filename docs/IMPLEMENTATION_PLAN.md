# Implementation plan

Status legend: `[x]` complete, `[~]` in progress, `[ ]` not started, `[!]` external configuration or test identity required.

## Phase 0 — Repository and foundation

- [x] Inspect repository and establish application root
- [x] Create `AGENTS.md` and product/operations documentation
- [x] Scaffold strict Next.js, TypeScript, Tailwind, UI primitives, linting, formatting, and test tooling
- [x] Add environment schema and `.env.example`
- [x] Verify install, lint, typecheck, tests, and build

## Phase 1 — Database, authentication, and security

- [x] Supabase clients and auth proxy structure
- [x] Current Supabase publishable/secret API-key boundaries, with the secret isolated to explicit server-only privileged operations
- [x] Normalized chapter-scoped schema and forward-only migrations
- [x] Role-aware route guards for Chair/Admin, Member, and Proctor routes; RLS remains the data boundary
- [x] Access-request approval, rejection, roster linking, and audited disconnection operations and UI
- [~] Google OAuth browser verification: the existing Scholarship Chair session, identity, persistence, and live hosted data access are verified; separate synthetic Google identities are still required for the complete browser role matrix
- [~] One-time secure bootstrap and first-time setup wizard
- [x] RLS and database permission coverage: 91 pgTAP checks pass locally and against hosted development
- [!] Complete separate-account browser checks for Awaiting Approval, Member, Proctor, and Admin after those synthetic Google test accounts are available

## Phase 2 — Member course management

- [x] Database-backed Member dashboard and navigation shell
- [x] Create, edit, and archive course workflows
- [x] Percentage, Letter Grade, Pass / Fail, and Custom / Other grading types
- [x] Default and course-specific percentage scales with historical snapshot preservation

## Phase 3 — Weekly academic check-in

- [x] Database-derived semester/week/deadline and previous-value prepopulation
- [x] Immutable submissions/revisions and original on-time/late timing preservation
- [x] Authoritative server-side `Estimated [Semester Name] GPA`, disclaimer, history, and trend data
- [x] Grade-change alert detection

## Phase 4 — Chair academic operations

- [x] Live attention dashboard, member directory, member detail, and This Week operations
- [x] Search and Active/Inactive/Alumni/Missing Grades/Incomplete Hours/Academic Alert/GPA filters
- [~] Academic-alert and custom-grading data are displayed; acknowledgment and review mutation UI remains

## Phase 5 — Study hours

- [x] Audited, immutable versioned rule-set configuration using the approved GPA bands
- [x] Automatic assignment calculation plus explicit current-week backfill/recalculation
- [x] Real required/completed/remaining state and filters
- [x] Confirmed override/removal, freeze, and post-freeze review workflows with audit history
- [x] Member progress display

## Phase 6 — Proctor portal

- [x] Searchable active-member selection and integer-minute logging
- [x] Current-week own-session editing and old-week/other-Proctor restrictions
- [x] Audited Chair/Admin correction workflow for older records
- [x] Hosted database coverage for Proctor privacy and edit restrictions
- [!] Repeat the session-edit path in a real browser under a separate synthetic Proctor Google account

## Phase 7 — Email center

- [x] Resend adapter and safe mock transport
- [x] Real missing-grade recipient preview and stored batch/message status display; preview never sends automatically
- [~] Persistent batch creation, individual edit, approval, and send workflow
- [ ] Idempotency, Resend webhook delivery, failure/retry history

## Phase 8 — Analytics

- [~] Live chapter submission-rate and estimated-GPA charts are implemented; deeper member/course/study-hour analytics remain

## Phase 9 — Settings and administration

- [x] Semester creation, deterministic academic weeks, activation, and deadline overrides
- [x] Study-hour rule configuration and recalculation controls
- [x] Account request approval/rejection/link/disconnect UI
- [ ] CSV roster import and semester ZIP/CSV export
- [ ] Role/proctor management and audit-log UI

## Phase 10 — Handoff and onboarding

- [ ] Readiness checks and atomic Chair handoff wizard
- [ ] New-Chair onboarding and in-app guide

## Phase 11 — Production hardening

- [~] Route, unit, hosted/local database, formatting, lint, strict TypeScript, and build gates are maintained during implementation
- [ ] Accessibility, responsive, security, error/loading, and empty-state review
- [ ] Backup/export verification and final automated test suite
- [!] Configure production Supabase, Google OAuth, Resend, Vercel, and DNS

## Hosted development verification — 2026-09-08

- Repository and hosted migration history both contain `202609070001` through `202609070010`.
- `supabase db diff --linked --schema public` reports `No schema changes found`, including the repository-defined RLS policies.
- The 91-check pgTAP/RLS suite passes both locally and against the hosted development database. Every hosted test uses synthetic fixed identifiers inside a transaction that ends with `rollback`.
- Unauthenticated HTTP requests to `/`, `/members`, `/this-week`, `/study-hours`, `/email`, `/analytics`, `/settings`, `/administration`, `/proctor`, and `/member` each return `307` to `/login`.
- The authenticated Scholarship Chair browser session derives the Google identity, chapter, roles, semester, and current week from Supabase.
- Live browser verification passed for synthetic semester/week generation, course creation/editing, initial check-in, immutable grade revision, This Week counts, rule setup, assignment backfill, study-hour override, session logging, and Chair correction.
- The deadline override inputs were verified to reflect the stored deadline date/time in the semester timezone.

Exact hosted development counts at the verification snapshot:

| Table                  | Rows |
| ---------------------- | ---: |
| profiles               |    1 |
| chapters               |    1 |
| members                |    1 |
| member_roles           |    2 |
| access_requests        |    0 |
| semesters              |    1 |
| academic_weeks         |   16 |
| courses                |    1 |
| grade_submissions      |    2 |
| grade_entries          |    2 |
| academic_alerts        |    0 |
| study_hour_rule_sets   |    1 |
| study_hour_bands       |    7 |
| study_hour_assignments |    1 |
| study_sessions         |    1 |
| email_batches          |    0 |
| email_messages         |    0 |
| audit_log              |   11 |

The semester, course, grades, study-hour policy, override, and session records are explicitly synthetic development data. No real roster or real academic record has been imported.

The remaining live authorization boundary is separate Google OAuth test identities. Add synthetic test-account emails to Google Auth Platform when the app remains in Testing, then use separate browser profiles/sessions to create and exercise Awaiting Approval, Member, Proctor, and Admin accounts. Do not place credentials or recovery codes in repository files or chat.
