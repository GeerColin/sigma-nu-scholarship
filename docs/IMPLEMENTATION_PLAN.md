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
- [~] Google OAuth browser verification: the production OAuth round trip, Scholarship Chair identity, session persistence, live hosted data access, and logout are verified; separate synthetic Google identities are still required for the complete browser role matrix
- [x] One-time hash-backed bootstrap, guided first-time setup checklist, and audited configuration UI
- [x] RLS and database permission coverage: 182 pgTAP checks pass locally and against hosted development
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
- [x] Academic-alert acknowledgment and custom-grading review UI, with required notes and audit records

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
- [x] Persistent batch creation, whole-batch and individual edits, approval, explicit send, and per-message delivery state
- [x] Stable provider idempotency keys, signature-verified Resend webhook delivery, persisted failure history, and failed-message retry
- [!] Configure a verified Resend sender, webhook, and server-only production credentials before changing `EMAIL_MODE` from `mock`

## Phase 8 — Analytics

- [x] Live submission-rate, chapter GPA, member movement, percentage-course movement, and study-hour analytics

## Phase 9 — Settings and administration

- [x] Semester creation, deterministic academic weeks, activation, and deadline overrides
- [x] Study-hour rule configuration and recalculation controls
- [x] Account request approval/rejection/link/disconnect UI
- [x] Confirmed CSV roster import with preview, validation, duplicate protection, base-role creation, and audit summary
- [x] Read-only semester ZIP export with 19 CSV files and a versioned JSON manifest
- [x] Role and Proctor management with Chair-only Admin controls and active/connected account eligibility
- [x] Append-only audit-log UI

## Phase 10 — Handoff and onboarding

- [x] Readiness checks and atomic Chair handoff wizard
- [x] First-time setup checklist and in-app Scholarship Chair guide

## Phase 11 — Production hardening

- [~] Route, unit, hosted/local database, formatting, lint, strict TypeScript, and build gates are maintained during implementation
- [x] Accessibility and responsive review for the primary production workflows; the mobile menu, bottom navigation, skip link, and tested pages have no horizontal overflow at 390 x 844
- [~] Security, error/loading, empty-state, and backup/export review; the ZIP structure is unit-tested, the authenticated production export endpoint is exposed, and the full automated suite is green
- [!] Production Supabase, Google OAuth, and Vercel are configured; configure Resend and optional custom DNS when production email or a custom domain is required

## Usability phase — 2026-09-12

- [x] Action-first Member homepage with real required/overdue/completed/late state, direct grade actions, deadline, study progress, and Estimated [Semester] GPA disclaimer
- [x] Conditional course grading/scale fields, archive acknowledgment, course-specific check-in labels, prefill/revision clarity, and pending submit feedback
- [x] Proctor hours/minutes entry, semester-timezone date default, visible week, optional notes, and preserved privacy/current-week edit controls
- [x] Exception-first Chair dashboard and direct custom-grading/frozen-hour review links; email removed from launch-critical attention
- [x] Responsive Members, Study Hours, CSV preview, profile section navigation, fluid filters/deadline controls, plain-language settings/handoff, and explicitly optional email setup/guide
- [x] Accessible progress/current-page indicators, document-order alignment, stronger focus visibility, reduced-motion loading, safe error recovery, and destructive-action confirmations
- [x] Automated regression evidence: 99 unit/DOM tests (18 files), 182 local pgTAP/RLS checks (13 files), and 182 hosted rollback-only pgTAP/RLS checks (13 files) pass; production dependency audit reports zero vulnerabilities
- [x] Final release gates: ESLint, strict TypeScript, repository-wide Prettier verification, production build, and whitespace verification pass
- [!] Verified UI revision committed locally. GitHub push to default `master` was rejected by auto-review because it triggers deployment; explicit publication approval is required. No new Vercel deployment is claimed.
- [!] New live responsive/keyboard and synthetic role usability verification: browser navigation was denied by the tool's usage limit; no bypass was attempted. Previous browser results do not verify the new UI revision.
- [!] Keep the phase open until deployed checks at 390×844, larger phone, tablet, 1366×768, and 1920×1080 are recorded. Separate synthetic Google-account identities remain required for the complete OAuth/browser role matrix.

See [USABILITY_REPORT.md](USABILITY_REPORT.md) for changes, evidence, deferred checks, and pilot-readiness assessment. No database migrations, real roster import, real academic data import, external email activation, or notification-center feature were added. The local roster-import.csv is intentionally excluded from the release.

## Hosted development verification — 2026-09-08

- Repository and hosted migration history both contain `202609070001` through `202609070010`.
- `supabase db diff --linked --schema public` reports `No schema changes found`, including the repository-defined RLS policies.
- The 91-check pgTAP/RLS suite passes both locally and against the hosted development database. Every hosted test uses synthetic fixed identifiers inside a transaction that ends with `rollback`.
- Unauthenticated HTTP requests to `/`, `/members`, `/this-week`, `/study-hours`, `/email`, `/analytics`, `/settings`, `/administration`, `/proctor`, and `/member` each return `307` to `/login`.
- The authenticated Scholarship Chair browser session derives the Google identity, chapter, roles, semester, and current week from Supabase.
- Live browser verification passed for synthetic semester/week generation, course creation/editing, initial check-in, immutable grade revision, This Week counts, rule setup, assignment backfill, study-hour override, session logging, and Chair correction.
- The deadline override inputs were verified to reflect the stored deadline date/time in the semester timezone.

Baseline hosted development counts before the connected-workflow fixture:

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

## Production OAuth verification — 2026-09-09

- Production Google OAuth now sends `https://sigma-nu-scholarship.vercel.app/auth/callback` as the application callback and `https://bryppeounpmtobjwwpfs.supabase.co/auth/v1/callback` as the Google-authorized Supabase callback.
- A real Google OAuth round trip returned to the stable Vercel domain and resolved the linked account as the existing Scholarship Chair.
- The authenticated production session survived a full page reload and retained access to the Chair-only Administration area.
- Added an authenticated-shell logout control for desktop and mobile. Production logout redirects to `/login`, and a subsequent request to `/administration` redirects back to `/login`.
- The complete live role matrix remains blocked on separate synthetic Google test accounts; local and hosted pgTAP/RLS tests continue to cover those authorization boundaries without real roster or academic data.

## Functional completion verification — 2026-09-09

- Added a browser-side CSV preview that requires `First Name` and `Last Name`, defaults optional blank Status to Active, trims whitespace, excludes invalid/malformed/duplicate rows, and requires explicit confirmation. The trusted server boundary validates again before calling a chapter-derived RLS-aware import RPC.
- Added read-only semester exports with schema-stable CSVs for the roster, roles, calendar, courses, submissions, grade entries, rules, assignments, overrides, sessions, alerts, email history, settings, and audit history plus a versioned JSON manifest.
- Added real Role/Proctor management. Admins can manage Proctors; only the current Chair can manage Admins; operational grants require an active linked account; Member and Chair roles remain outside this workflow.
- Added persisted email-template versions, exact-message review, attempt counts, failure state, failed-message retry, Resend signature verification, provider-event idempotency, and a service-role-only webhook database operation. `EMAIL_MODE=mock` remains the safe deployment default.
- Added the hash-backed first-time setup page/checklist, handoff readiness UI, explicit atomic Chair transfer confirmation, an in-app Chair guide, skip navigation, and a complete mobile administration menu.
- Local evidence: 89 unit tests pass across 16 files and 182 pgTAP/RLS checks pass across 13 files. The new migrations are `202609090014` through `202609090018`.
- Hosted migration history matches the repository through `202609090018`, the hosted schema diff is clean through `202609090018`, and all 182 hosted synthetic pgTAP/RLS checks pass. The hosted run exposed and then verified the fix for a legacy cross-chapter access-request visibility flaw.
- No real roster or academic record was imported. The new workflows are deployed and production browser verification is recorded below.

## Production workflow verification — 2026-09-09

- The stable Vercel deployment exposes the completed Chair workflows at `/administration/import`, `/administration/export`, `/administration/roles`, `/administration/handoff`, `/settings`, `/setup`, `/email`, and `/guide`.
- A signed-out request to `/administration` redirected to `/login`. A fresh Google OAuth round trip returned to the production dashboard as the existing Scholarship Chair and restored the protected navigation and synthetic chapter state.
- The Administration hub reported one awaiting request, one Proctor, one Admin, and 43 append-only audit events. The role page disabled operational grants for unlinked members, and the handoff page offered only active connected successors.
- The setup checklist reported chapter identity, semester, academic weeks, study-hour rules, and roster complete; only the production email identity remains incomplete.
- The email center reloaded four persistent synthetic batches: seven messages completed with zero failures and one retained five-recipient draft. No send, approval, role, handoff, settings, roster, or academic mutation was performed during this verification.
- At a 390 x 844 viewport, Settings, Email, Roles, CSV Import, Semester Export, Chair Handoff, Setup, and Guide all reported no horizontal overflow. The compact navigation expanded to all application routes and the bottom primary navigation remained available.
- The authenticated export page exposed the active synthetic semester ZIP endpoint. Archive generation and its 19 schema-stable CSV files plus manifest remain covered by unit tests; no real roster or academic data was downloaded or imported.

## Connected synthetic workflow verification — 2026-09-08

- Loaded the additive, idempotent `supabase/fixtures/connected_workflow.sql` fixture into the hosted development project. It uses only reserved `.invalid` email addresses and explicitly synthetic names, courses, grades, and sessions. No real roster or academic record was imported.
- Added two non-login synthetic auth actors, without passwords or external identities, so member and Proctor RPC behavior could be exercised as the `authenticated` database role through the normal RLS-aware identity functions.
- Verified 7 synthetic members, 11 synthetic courses, 13 immutable submission records, and 23 grade-entry snapshots. Current synthetic Week 3 status is 5 on time, 1 late, and 1 missing.
- Verified all four grading types. Custom / Other remained excluded from GPA until the Chair recorded an audited review; the reviewed Synthetic S/U course remains excluded by the chosen disposition.
- Verified a frozen Blake assignment held at 1 hour after an authenticated revision changed GPA from 4.00 to 2.00 and proposed 4 hours. The Chair UI raised `Review required`, exposed Keep Existing and Update Assignment, and the audited Update decision produced a frozen 4-hour assignment.
- Verified Synthetic Gray Proctor edited their own current-week session and added a session through authenticated Proctor RPCs. The final persisted total is 3 sessions / 180 minutes, and Study Hours shows 3 of 3 hours complete.
- Verified the alert workflow from a 20-point percentage drop through Chair email draft review and audited acknowledgment. The final alert state is 1 total, 1 acknowledged, 0 open.
- In mock email mode, explicitly approved and processed 5 study-hour assignment messages, 1 missing-grade reminder, and 1 Chair alert with zero failures. Hosted persistence contains 4 batches / 12 messages total; 7 are marked sent and the intentionally retained second study-hour draft contains the other 5.
- Cross-screen browser checks agree: Dashboard and This Week show 6 on time / 1 late / 1 missing across all 8 active rows; Analytics shows 75% on time, 13% late, 13% missing, 17% study-hour completion, and 16 required / 3.75 completed hours; Members and Study Hours show Gray complete and Blake at 2.00 GPA / 4 frozen hours.
- Reopened Study Hours in a fresh browser tab and reloaded member details from Supabase to verify persistence. The audit UI contains the grade revision, freeze, frozen-assignment decision, override and removal, Proctor edit/add, custom grading review, alert acknowledgment, batch approvals, and message sends.
- Hosted migration history is current through `202609080013`. The repository verifier is `supabase/fixtures/verify_connected_workflow.sql`; the local connected-workflow pgTAP suite adds 38 checks to the existing authorization coverage.
- The only intentionally deferred item is the complete separate-browser Google OAuth role matrix, as documented above. The database/RLS suite still covers those authorization boundaries with synthetic identities.
