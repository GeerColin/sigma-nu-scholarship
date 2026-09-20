# Usability phase — verified 2026-09-13

Status: UI implementation, release gates, deployment, and Chair responsive checks complete. Repeated fresh-load read failures remain unexplained; minimal server-only diagnostics are deployed, but the failure did not recur during three fresh-load checks. Live Member and pure-Proctor usability verification remains pending separate synthetic Google accounts. This report distinguishes source/DOM evidence from actual deployed browser checks; it is not a full role or accessibility certification.

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

Deployed browser checks on 2026-09-13 recorded the following document-width measurements:

| Viewport  | Chair routes checked | Horizontal overflow |
| --------- | -------------------: | ------------------- |
| 390×844   |                   17 | None                |
| 430×932   |                   17 | None                |
| 768×1024  |                   17 | None                |
| 1366×768  |                   17 | None                |
| 1920×1080 |                   17 | None                |

The 17 routes were Dashboard, Members (Synthetic search), Synthetic Blake's profile, This Week, Study Hours (Synthetic Blake), Analytics, Settings, Administration, Roles, CSV Import, Semester Export, Chair Handoff, Setup, Guide, Email, Account Requests, and Audit Log. Each loaded its expected page heading (85 measurements). The populated synthetic CSV preview and unsaved Proctor form were additionally checked at all five sizes without overflow. Screenshots inspected the phone dashboard/menu, synthetic member cards/profile/course shortcut, expanded hour override, chart axes/legends, populated CSV preview, Proctor logger, deadline editor, and roster empty state, plus the 1366×768 study-hour table. Document-width measurements do not prove every internal control or dialog has been visually inspected.

## 6. Accessibility

Current-page links now expose `aria-current`. Source order aligns visual, keyboard, and screen-reader content order. Study progress has an accessible name/value; statuses retain text rather than color alone. Course-specific check-in labels and Proctor search help identify inputs. Focus uses dark/white contrasting rings, loading respects reduced-motion preferences, and the recovery button uses this Next.js version's `retry` API. Native confirmation controls protect destructive actions; disconnection, override removal, and freeze confirmation are also checked at the server boundary.

Live phone checks verified the menu expands to all routes, Tab focuses its Dashboard link with a solid visible outline, current-page indicators are present, and the expanded Settings controls have associated accessible labels. No physical screen-reader session or comprehensive WCAG audit is claimed.

## 7. Wording

Standardized On Time, Late, Missing and Estimated Semester GPA chart wording; replaced rule-set/atomic-transfer headings with Study Hour Rules and Transfer Scholarship Chair. Optional email no longer appears as required launch setup. Generic unexpected errors do not claim an uncertain save failed: they tell users to check saved state before resubmitting.

## 8. Reduced clicks

Members can submit/revise directly from their current status card. Chair custom-course and frozen-hour reviews go to their relevant context. A profile opens its own study-hour requirement directly. Common forms show only relevant fields; infrequent controls remain available without dominating the page. Routine check-in and session logging do not add confirmation dialogs.

## 9. Intentionally unchanged

The visual system, RLS, OAuth, grade calculations/revision history, assignment rules, audit behavior, exports, CSV validation, and handoff transaction are preserved. No database migration was needed. Email infrastructure remains future-compatible without enabling external delivery. The full separate-synthetic-Google-account OAuth matrix remains deferred, as previously documented. Browser visual and keyboard checks cannot be substituted by mocked DOM tests. Chair access to the Proctor form does not establish a pure-Proctor account's privacy or edit permissions; the Member homepage was not tested with the Chair's personal academic records.

## 10. Automated evidence

- Unit/DOM suite rerun on 2026-09-13: 101 tests across 19 files pass using one isolated worker. Six new synthetic interaction tests cover prefill/revisions, grading fields, archive acknowledgment, Proctor duration/date/privacy/edit controls, and recovery; two additional tests verify redacted server-read diagnostics. The preceding multi-worker rerun had a DOM-worker startup timeout and is not counted as passing.
- Local PostgreSQL/pgTAP/RLS rerun on 2026-09-13: 182 checks across 13 files pass.
- Hosted PostgreSQL/pgTAP/RLS rerun on 2026-09-13: 182 checks across 13 files pass; fixtures end in rollback.
- Production dependency audit rerun on 2026-09-13: zero vulnerabilities.

## 11. Release gates

ESLint, strict TypeScript, repository-wide Prettier verification, production build, and Git whitespace verification all pass in the 2026-09-13 release rerun, including the server-diagnostic follow-up. The diagnostic text is absent from generated browser static bundles. A DOM worker timed out starting inside the sandbox in an earlier run; a subsequent multi-worker run also timed out. The full 101-test suite passed with one isolated worker outside the sandbox. Failed runs were not ignored as passing.

## 12. Vercel verification

After explicit approval, usability commit `b45e65b` was pushed to `master`. The subsequent user commit `2e5c63b` adds only roster-import.csv and retains the verified application code. On 2026-09-13, GitHub's Vercel status for `2e5c63b` reports `success`: [deployment details](https://vercel.com/sigma-nu/sigma-nu-scholarship/EC44qNfom6AJgDpdMouXF9bcTnaJ).

The Vercel dashboard also identifies this deployment as Production / Ready / Current and assigns the stable domain. After explicit browser-retry approval, the deployed UI was inspected in one reused browser tab; temporary viewport overrides were reset and the tab returned to the scholarship dashboard. The checks in sections 5–6 verify this UI revision, not just deployment metadata. No workaround was used to bypass the earlier usage-limit or publication denials.

Live synthetic interactions: Members search isolated seven Synthetic rows; a 2–3 estimated-GPA range returned Synthetic Blake, Devon, and Gray, while a no-match synthetic search displayed Clear filters. Synthetic Blake's Courses shortcut opened the course section and Manage requirement opened the member-filtered Study Hours page. The expanded override retained required-hours, reason, and confirmation controls without submitting. `tests/fixtures/usability-roster.csv` produced three ready / two excluded rows, defaulted blank Status to Active, identified a duplicate and missing first name, and kept Import disabled without acknowledgment. Nothing was imported. Chair access to the Proctor form selected Synthetic Gray and a 0-hour / 30-minute duration; its save control became enabled, but no session was saved. Expanded Week 3 deadline fields remained readable and labeled; no deadline was changed.

Two fresh dashboard requests reached the recovery screen and recovered through Try again. Vercel's runtime log at 2026-09-13T13:20:13.870Z records `Could not load member academic status` (digest `2760687485`). The initial 75 page/viewport checks then passed without recurrence, but a post-deployment reload at 2026-09-13T13:32:57.809Z failed with `Could not load members` (digest `4065596909`) on follow-up deployment `68AXfJMM3`. The query helper deliberately fails closed when a read fails; existing logs do not identify the underlying query/provider cause. Minimal server-only diagnostics were deployed in commit `0731f50`: static operation label, bounded HTTP status, and validated database/API error-code shape only. Provider messages, response bodies, URLs, headers, credentials, and academic rows are not retained. No blind retry, secret-key shortcut, or RLS change was added. These are recovered but unresolved recurring read failures, not fixed root causes or successful authorization tests.

The [diagnostic deployment](https://vercel.com/sigma-nu/sigma-nu-scholarship/FaYD7bt1wGmud5giDL6KWyQDEKVZ) reported success. Three fresh dashboard loads succeeded, and its runtime log window at approximately 09:46 EDT reported zero errors. There was no failing request from which to capture a new diagnostic cause. Additional account-request/audit viewport checks and synthetic roster filtering also passed. This does not establish that the intermittent failure is fixed.

## 13. Pilot readiness

The Chair interface has passed the documented deployed responsive checks, but the whole phase is not fully signed off for a real-member pilot. Resolve or adequately characterize the recurring fresh-load read failures first. Separate synthetic Google accounts must still exercise the Member homepage/check-in/course flow and pure-Proctor logging/current-week edit/old-session lock. The complete separate-account authorization matrix remains deferred; automated RLS and mocked DOM coverage are not its replacement. Do not automatically import the real roster or academic records.

No real roster/academic data was imported into Supabase by the agent in this phase, no external email delivery was enabled, no Notification Center/bell/inbox was built, and no credentials were committed by the agent. The agent left roster-import.csv untouched and excluded it from the usability commit; the user's subsequent manual commit tracks it. Existing non-synthetic member records were not used as mutation-test subjects. No database import was performed by the agent.

## 14. UI functionality and visual-polish follow-up — 2026-09-20

This follow-up used the current deployed Chair session and the local development project. No form was submitted, no production setting was changed, and no roster or academic record was mutated.

### Browser checklist

| Surface                                                           | Result                     | Evidence / limitation                                                                                                                  |
| ----------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Chair Dashboard                                                   | Passed                     | Direct load settled from the loading state and showed attention, check-in, study-hour, and recurring-schedule summaries.               |
| Members, search, and member detail                                | Passed                     | Search narrowed the directory and a profile opened with overview, courses, history, study sessions, and alerts.                        |
| This Week and status filter                                       | Passed                     | Counts rendered and the Awaiting filter updated the URL and list without mutation.                                                     |
| Schedule and recurring schedule administration                    | Passed                     | Week navigation, occurrences, add-session form, and permission-aware management controls rendered.                                     |
| Study Hours                                                       | Passed                     | Status filters, stacked/table layouts, assignment state, and management disclosure rendered.                                           |
| Analytics                                                         | Passed                     | Summary metrics, reporting-week note, chart legends/axes, and course movement sections rendered.                                       |
| Settings                                                          | Passed                     | Chapter settings, first grade-check week, per-week requirements, and deadline disclosures rendered.                                    |
| Administration, access, roles, import, setup, guide, and email    | Passed                     | Direct routes and empty/pending states rendered; destructive controls were not submitted.                                              |
| Chair Member and Proctor workspaces                               | Passed                     | Chair workspace switcher reached Member home/check-in/courses/history and the Proctor portal.                                          |
| Login and signed-out protected routes                             | Passed locally             | `/login` rendered at 360, 390, 768, and 1440 widths; `/request-access` and `/awaiting-approval` redirected to login without a session. |
| Separate Awaiting Approval, Member, Proctor, and Admin identities | Not verified in this sweep | Requires separate synthetic Google accounts/browser profiles; existing RLS/route tests remain the evidence for those boundaries.       |

### Fix applied

Repeated controls now expose contextual accessible names without changing their visible labels or behavior. Role assignment/removal includes the member and role; recurring-session edit/remove includes weekday and time; Study Hours management includes the member; Settings deadline/requirement controls include the week; and account-disconnection fields/actions include the member. A focused DOM regression test covers member-specific role-control names.

### Responsive evidence

The current mobile login surface was captured at 390×844 and remained fully visible with no horizontal overflow. A local browser measurement round at 360×800, 390×844, 768×1024, and 1440×900 reported `scrollWidth <= innerWidth` for each login render. The previously recorded authenticated Chair responsive round remains applicable to layout (17 routes at each 390×844, 430×932, 768×1024, 1366×768, and 1920×1080); this follow-up changes only accessibility names, not layout geometry. Representative desktop Analytics/Settings and mobile Login screenshots were inspected during this sweep.

### Verification

- Unit/DOM suite: 155 tests across 28 files passed.
- PostgreSQL/RLS suite: 249 checks across 16 files passed.
- ESLint, strict TypeScript, Prettier verification, production build, and `git diff --check` passed.
- No blind retry, RLS change, secret-key shortcut, email send, destructive action, or real-data import was performed.

### Larger recommendations (not implemented)

1. Add Playwright storage-state coverage for separate synthetic Chair, Admin, Proctor, Member, and Awaiting Approval identities. This would turn the remaining role limitation into repeatable E2E evidence; it requires maintaining test OAuth identities and isolated data.
2. Add a small route/viewport smoke matrix to CI for the 17 key surfaces. This would catch regressions in loading/redirect behavior and mobile overflow earlier, at the cost of browser-runtime time and test-environment maintenance.
3. Consider a dedicated “More administration” mobile menu if the Chair navigation grows. It would reduce bottom-navigation density, but adds one extra interaction for less-frequent pages.
