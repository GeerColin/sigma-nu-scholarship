# Product specification

## Product promise

The system replaces the chapter's Google Forms and Sheets workflow. A nontechnical Scholarship Chair must be able to operate roster approval, semesters and deadlines, weekly grade collection, estimated GPA, study-hour rules and overrides, proctor logging, email review and delivery, analytics, exports, audit review, and Chair handoff through the website.

PostgreSQL is authoritative. Historical records remain queryable and exportable. Normal operation never requires developer tools or vendor consoles.

## Personas and surfaces

- **Member:** sees only personal courses, weekly check-ins, estimated semester GPA, study-hour progress, and history.
- **Proctor:** retains the member surface and can search active member names to record sessions; sees only sessions they entered.
- **Admin:** assists with routine chapter operations but cannot assign Admins or replace/demote the Chair.
- **Scholarship Chair:** has chapter-scoped authority over academic operations, configuration, email, exports, auditing, and atomic handoff.

Members may hold multiple roles. Member statuses are exactly Active, Inactive, and Alumni. Status changes and role changes preserve records and are audited.

## Core journeys

1. Google sign-in -> linked member dashboard, or access request -> Chair/Admin review -> roster link.
2. Secure one-time bootstrap -> initial Chair -> guided chapter, semester, rules, roster, and email setup.
3. Member sets up semester courses once, then submits immutable weekly snapshots with revisions.
4. Server calculates an explicitly labeled estimated-semester GPA from eligible course snapshots.
5. Server evaluates grade drops and prepares academic alerts without automatically punishing members.
6. Versioned study-hour rules create weekly assignments; Chair/Admin may reasoned-override them.
7. Sending assignment email freezes the assignment. Later grade changes create a review decision.
8. Proctors record integer-minute sessions and may edit their own entries only during the current week.
9. Chair/Admin prepares, edits, previews, and explicitly sends email batches.
10. Chair reviews actionable exceptions, analytics, exports, audit history, and completes atomic successor handoff.

## UX requirements

Member navigation: Home, Weekly Check-In, My Courses, My Study Hours, My History / Trends. Chair navigation: Dashboard, Members, This Week, Study Hours, Email, Analytics, Settings, Administration. Interfaces are responsive and keyboard accessible. Status is never communicated by color alone. Normal-user errors state what failed, whether data was saved, and what to do next.

The member dashboard prominently shows semester/week, submission state, `Estimated [Semester] GPA` with disclaimer and included-course count, required/completed/remaining study hours, and the next deadline. The Chair dashboard prioritizes missing/late submissions, alerts, grading reviews, incomplete hours, and email requiring approval.

## V1 exclusions

No password authentication, QR-code attendance, arbitrary file/transcript uploads, Google Sheets runtime dependency, chapter rankings for members, public academic URLs, or unreviewed automated bulk email.
