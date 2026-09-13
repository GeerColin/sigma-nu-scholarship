# Usability phase — 2026-09-12

Status: implementation and automated regression verification complete; new live visual/role verification is pending browser access. Do not treat the previous deployment's browser checks as verification of this UI revision.

## 1. Member homepage

The current weekly action leads the page. Required, overdue, completed, and submitted-late check-ins are derived from stored submissions and the deadline. The card shows the deadline, original submission timestamp, revision timing, and a direct submit/revise action. Study-hour remaining/completed progress precedes Estimated [Semester] GPA and its official-GPA disclaimer. No chapter averages or rankings were added.

## 2. Proctor workflow

Logging separates hours and minutes, combines them into the existing server-validated duration, defaults the date in the semester timezone, and clamps it to the current academic week. Member search has an explicit label and helper text; notes remain optional. Existing own-current-week edit and old/other-Proctor lock rules are preserved. Pending submit controls prevent duplicate clicks. No academic information was added to Proctor views.

## 3. Chair dashboard

Needs attention appears before passive summary metrics in both visual and document order. Real missing, late, open academic-alert, unreviewed custom-course, and frozen-assignment-review state drives the cards. Custom review links open the relevant profile course section; frozen-hour review links select Needs Review. Email drafts are no longer operational attention items.

## 4. Other UI changes

Course setup reveals only relevant grading fields, explains default/custom percentage scales, and requires acknowledgment before archive. Weekly check-in distinguishes previous-week versus current-revision values, labels course-specific controls, and supports decimal mobile entry. Member profiles have wrapping section navigation and a direct administrative requirement-management link. This Week filters include counts and a helpful everyone-submitted state. Settings collapse infrequent deadline edits, prior weeks, and optional email configuration/templates. Setup and the Chair guide mark email as optional. Chair transfer language no longer requires database knowledge.

## 5. Responsive issues addressed

Members use linked cards below the wide-desktop breakpoint. Study Hours uses labeled stacked rows while retaining all administrative controls. Dense tables wait until enough space exists beside the sidebar. CSV previews use phone cards. GPA filters use fluid widths; deadline controls fit their form columns. Profile section links wrap instead of requiring horizontal scrolling.

These are implementation/source findings. Actual checks at 390×844, a larger phone, tablet, 1366×768, and 1920×1080 remain pending; no new screenshot/overflow results are claimed.

## 6. Accessibility

Current-page links now expose `aria-current`. Visual, keyboard, and screen-reader content order agree. Study progress has an accessible name/value; statuses retain text rather than color alone. Course-specific check-in labels and Proctor search help identify inputs. Focus uses dark/white contrasting rings, loading respects reduced-motion preferences, and the recovery button uses this Next.js version's `retry` API. Native confirmation controls protect destructive actions; disconnection, override removal, and freeze confirmation are also checked at the server boundary.

## 7. Wording

Standardized On Time, Late, Missing and Estimated Semester GPA chart wording; replaced rule-set/atomic-transfer headings with Study Hour Rules and Transfer Scholarship Chair. Optional email no longer appears as required launch setup. Generic unexpected errors do not claim an uncertain save failed: they tell users to check saved state before resubmitting.

## 8. Reduced clicks

Members can submit/revise directly from their current status card. Chair custom-course and frozen-hour reviews go to their relevant context. A profile opens its own study-hour requirement directly. Common forms show only relevant fields; infrequent controls remain available without dominating the page. Routine check-in and session logging do not add confirmation dialogs.

## 9. Intentionally unchanged

The visual system, RLS, OAuth, grade calculations/revision history, assignment rules, audit behavior, exports, CSV validation, and handoff transaction are preserved. No database migration was needed. Email infrastructure remains future-compatible without enabling external delivery. The full separate-synthetic-Google-account OAuth matrix remains deferred, as previously documented. Browser visual and keyboard checks cannot be substituted by mocked DOM tests.

## 10. Automated evidence

- Unit/DOM suite: 99 tests across 18 files pass. Six new synthetic interaction tests cover prefill/revisions, grading fields, archive acknowledgment, Proctor duration/date/privacy/edit controls, and recovery.
- Local PostgreSQL/pgTAP/RLS: 182 checks across 13 files pass.
- Hosted PostgreSQL/pgTAP/RLS: 182 checks across 13 files pass; fixtures end in rollback.
- Production dependency audit: zero vulnerabilities.

## 11. Release gates

ESLint, strict TypeScript, repository-wide Prettier verification, production build, and Git whitespace verification all pass in the final release run. A DOM worker timed out starting inside the sandbox; the same test suite passed outside it. This was not ignored as a passing test run.

## 12. Vercel verification

The verified revision is committed locally, but publication to GitHub's default `master` branch was rejected by auto-review because it triggers deployment. Explicit publication approval is required; no new Vercel deployment is claimed. Live UI verification is also pending: the browser tool previously denied navigation because of its usage limit. No alternate publication route, browser, raw browser protocol, or other workaround was used to bypass either denial.

## 13. Pilot readiness

The implemented interface is a better candidate for a small member pilot, but this phase is not fully signed off until the new deployed UI passes the required viewport/keyboard checks and the available synthetic role workflows. Do not automatically import the real roster or academic records.

No real roster/academic data was imported, no external email delivery was enabled, no Notification Center/bell/inbox was built, and no credentials were committed. The local roster-import.csv remains untouched and excluded from the release.
