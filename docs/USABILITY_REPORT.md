# Usability phase — verified 2026-09-13

Status: UI implementation, release gates, deployment, and Chair responsive checks complete. Repeated fresh-load read failures are under investigation; a minimal server-only diagnostic change passed local verification, with hosted capture pending. Live Member and pure-Proctor usability verification remains pending separate synthetic Google accounts. This report distinguishes source/DOM evidence from actual deployed browser checks; it is not a full role or accessibility certification.

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
| 390×844   |                   15 | None                |
| 430×932   |                   15 | None                |
| 768×1024  |                   15 | None                |
| 1366×768  |                   15 | None                |
| 1920×1080 |                   15 | None                |

The 15 routes were Dashboard, Members (Synthetic search), Synthetic Blake's profile, This Week, Study Hours (Synthetic Blake), Analytics, Settings, Administration, Roles, CSV Import, Semester Export, Chair Handoff, Setup, Guide, and Email. Each loaded its expected page heading. The populated synthetic CSV preview and unsaved Proctor form were additionally checked at all five sizes without overflow. Screenshots inspected the phone dashboard/menu, synthetic member cards/profile/course shortcut, expanded hour override, chart axes/legends, populated CSV preview, Proctor logger, and deadline editor, plus the 1366×768 study-hour table. Document-width measurements do not prove every internal control or dialog has been visually inspected.

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

Live synthetic interactions: Members search isolated seven Synthetic rows; Synthetic Blake's Courses shortcut opened the course section and Manage requirement opened the member-filtered Study Hours page. The expanded override retained required-hours, reason, and confirmation controls without submitting. `tests/fixtures/usability-roster.csv` produced three ready / two excluded rows, defaulted blank Status to Active, identified a duplicate and missing first name, and kept Import disabled without acknowledgment. Nothing was imported. Chair access to the Proctor form selected Synthetic Gray and a 0-hour / 30-minute duration; its save control became enabled, but no session was saved. Expanded Week 3 deadline fields remained readable and labeled; no deadline was changed.

Two fresh dashboard requests reached the recovery screen and recovered through Try again. Vercel's runtime log at 2026-09-13T13:20:13.870Z records `Could not load member academic status` (digest `2760687485`). The 75 page/viewport checks then passed without recurrence, but a post-deployment reload at 2026-09-13T13:32:57.809Z failed with `Could not load members` (digest `4065596909`) on follow-up deployment `68AXfJMM3`. The query helper deliberately fails closed when a read fails; existing logs do not identify the underlying query/provider cause. A minimal server-only diagnostic cause is being added: static operation label, bounded HTTP status, and validated database/API error-code shape only. Provider messages, response bodies, URLs, headers, credentials, and academic rows are not retained. No blind retry, secret-key shortcut, or RLS change was added. These are recovered but unresolved recurring read failures, not fixed root causes or successful authorization tests.

## 13. Pilot readiness

The Chair interface has passed the documented deployed responsive checks, but the whole phase is not fully signed off for a real-member pilot. Resolve or adequately characterize the recurring fresh-load read failures first. Separate synthetic Google accounts must still exercise the Member homepage/check-in/course flow and pure-Proctor logging/current-week edit/old-session lock. The complete separate-account authorization matrix remains deferred; automated RLS and mocked DOM coverage are not its replacement. Do not automatically import the real roster or academic records.

No real roster/academic data was imported into Supabase by the agent in this phase, no external email delivery was enabled, no Notification Center/bell/inbox was built, and no credentials were committed by the agent. The agent left roster-import.csv untouched and excluded it from the usability commit; the user's subsequent manual commit tracks it. Existing non-synthetic member records were not used as mutation-test subjects. No database import was performed by the agent.
