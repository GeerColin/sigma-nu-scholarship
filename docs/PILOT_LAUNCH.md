# Controlled production pilot

Updated: 2026-09-14. The owner accepts occasional fresh-load errors as a monitored availability risk. Supabase-side investigation is deferred, not completed; the internal HTTP 504 cause remains unknown. This acceptance does not waive RLS, authorization, data integrity, or recovery requirements.

## Scope and current evidence

Start with a small invited group and a Chair available to help. Do not announce a chapter-wide launch yet. The approved UI and core academic workflows are already deployed at `https://sigma-nu-scholarship.vercel.app`.

- Latest tested application commit: `f95aad6`; Node.js functions in Oregon beside Supabase.
- 74 authenticated fresh loads on that deployment passed, including desktop/mobile, after-login, and all seven required pages in the private window. Private checks were split across two intervals, not one uninterrupted stress round.
- Entire investigation: 168 authenticated attempts, 164 passes/four historical page failures. These are controlled observations, not a predicted production failure rate.
- Local and hosted database/RLS evidence and Chair browser checks are documented in `IMPLEMENTATION_PLAN.md`. The separate synthetic Google-account browser matrix remains explicitly deferred; it has not been completed or implied by Chair tests.
- Outbound email remains optional and in mock mode. Do not tell members that reminders are being delivered.
- Fresh local release checks on 2026-09-14 passed: 133 unit tests, 182 PostgreSQL/RLS checks, lint, strict TypeScript, repository formatting, and production build. Initial worker/lint launch issues and successful clean reruns are retained in the implementation plan. No new hosted test run or unattended browser E2E coverage is claimed.

No real roster or academic records are authorized for import by accepting loading errors. Obtain a separate explicit import approval after reviewing the destination and launch checklist.

## Before inviting real members

- [x] Dedicated production Supabase project confirmed: `bxxbegnexwopamxuknru` in Oregon, Healthy; see [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md). The live Vercel site still uses hosted development. Do not silently repurpose, reset, or delete development fixtures.
- [ ] Keep Vercel Preview/local development pointed at development, never the real-record production database. Configure Production with the new production project URL/publishable key and the stable application origin; see `DEPLOYMENT.md` for exact environment names and key boundaries.
- [x] All 18 repository migrations applied to confirmed production after reviewed dry run, without seeds/fixtures; migration history matches, 182 rollback-only RLS checks pass, and public schema/RLS comparison reports `No schema changes found`. Never use hosted `db reset`.
- [~] Owner reports production Google provider and exact callbacks saved. Owner Google sign-in, logout, fresh reload, and unapproved-account denial against the new destination still need verification before real data entry. Keep OAuth credentials out of chat and Vercel; they belong in the hosted Supabase provider configuration.
- [ ] Initialize the new chapter/Chair through the documented one-time bootstrap workflow. Store only the token hash and expiration in the database; do not introduce an environment bootstrap bypass or copy development auth/profile identifiers.
- [ ] Configure the real semester, timezone, deadlines, and versioned study-hour policy through the existing setup/settings UI. Review them before invitations. No synthetic semester should drive real assignments.
- [ ] Confirm production account approval is intentional, linked to the correct roster member, chapter-scoped, and audited. Never grant everyone Admin to make onboarding easier.
- [ ] Review Supabase Security Advisor findings without turning RLS off or accepting arbitrary proposed SQL. Protect infrastructure accounts with MFA and identify a second trusted recovery-capable owner. Account/security changes are owner actions, not performed by this document.
- [ ] Choose and test a database backup/recovery method in an isolated destination using synthetic data. Keep backups outside Git and restrict access. Record the recovery owner, schedule, and maximum acceptable lost work.
- [ ] Separately approve the exact real-member CSV and production destination before importing. Do not commit roster files, grades, exports, or backup artifacts.

The full separate-account browser role matrix remains deferred by the owner, rather than newly required by this checklist. If synthetic accounts become available, complete it before wider rollout. Any observed authorization failure immediately stops onboarding until fixed; accepting occasional loading failures does not accept unauthorized access.

## Recovery is not the same as export

The existing Chair semester ZIP export is useful for a readable academic archive, but **there is no full database restore wizard**. A ZIP download alone does not prove recovery of authentication, settings, identities, or a usable system. Test restoration of an actual database backup separately and verify RLS afterwards. Supabase recommends off-site CLI dumps for Free projects; available managed backup/retention options depend on the plan. Choose a method rather than assuming a managed backup exists. See [Supabase backups](https://supabase.com/docs/guides/platform/backups).

## During the pilot

- Chair reviews account requests, grade submissions, and study sessions daily. Members verify saved work by reopening the page; do not infer a successful save from a button click alone.
- Explain that a read error may require the existing **Try again** action. No background retry loop was added. If a save reports an uncertain outcome, inspect persisted history before submitting again.
- Record only UTC time, route template, fresh-load/login context, generic error/digest, and the safe diagnostic category/status/duration. No academic screenshots, cookies, headers, response bodies, user identifiers, or raw HAR files in incident reports.
- A single recoverable read error is the accepted risk. If failures recur across users/pages or prevent deadline work, pause further invitations and reopen provider investigation. Agree on a secure alternative submission procedure before a deadline; do not use public/shared spreadsheets as an emergency academic-record store.
- Any wrong-member data, permission bypass, missing/corrupted saved record, or inability to recover is a stop condition, not an accepted availability error.
- Keep outbound email in `mock` unless sender verification, webhook signature/delivery handling, and production secret storage are deliberately configured and tested. Custom DNS is optional; the stable Vercel origin already supports the pilot.

## Release and rollback

Before application changes, rerun unit, PostgreSQL/RLS, lint, strict TypeScript, formatting, and production build checks. Repeat focused synthetic browser checks for changed workflows. The repository currently has Playwright configuration but no `tests/e2e` suite; do not report unattended browser E2E coverage as complete.

Record the promoted commit/deployment. For a code regression, restore the last verified compatible Vercel deployment; redeploying old code does not undo database migrations or saved records. Review schema compatibility before rollback. Never reset a real-record database as a rollback shortcut.

Review pilot outcomes before widening access: successful saved check-ins and session logging, deliberate approvals, manageable support needs, safe diagnostics, and a tested recovery route. Supabase support remains an available escalation, not a prerequisite solely for the accepted occasional read error. Operational considerations follow the [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod).
