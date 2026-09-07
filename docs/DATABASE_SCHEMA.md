# Database schema

All tenant-owned rows carry `chapter_id` directly or inherit it through a constrained parent. UUID primary keys, timestamptz timestamps, foreign keys, checks, unique constraints, and indexes support correctness and RLS.

## Identity and organization

- `profiles`: Supabase Auth identity mirror; Google email/display name.
- `chapters`: organization identity and initialization state.
- `members`: durable roster record, optionally linked to one profile; Active/Inactive/Alumni.
- `member_roles`: many-to-many Member/Proctor/Admin/Scholarship Chair roles.
- `access_requests`: unapproved identity request, requested name, match suggestion, decision state.

## Academic calendar and courses

- `semesters`: dates, timezone, default weekly deadline, GPA weighting mode.
- `academic_weeks`: generated labels/date ranges and effective deadline overrides.
- `grading_scales`: immutable/versioned percentage-to-letter/GPA configuration snapshots.
- `courses`: member/semester course, credits, one of four grading types, grading metadata, archived timestamp.
- `custom_grading_reviews`: auditable administrative GPA treatment.

## Weekly records

- `grade_submissions`: one immutable revision for a member/week, revision number, original/effective timing facts, deadline snapshot, current marker, and GPA snapshot.
- `grade_entries`: immutable course-level snapshots including name, credits, grading type, submitted value, inclusion, and GPA points.
- `academic_alerts`: configurable grade-change detection result and review state.

## Study hours

- `study_hour_rule_sets` and `study_hour_bands`: immutable versioned policy.
- `study_hour_assignments`: calculated, overridden, final, frozen, and post-freeze review values.
- `study_sessions`: member/proctor/week/date/integer minutes/notes; corrections retain audit history.

## Communication and governance

- `email_templates`, `email_batches`, `email_messages`, `email_delivery_events`: rendered final content, approval, idempotency, provider state.
- `audit_log`: append-only actor/action/entity/before/after/reason/timestamp.
- `bootstrap_tokens`: hash-only, single-use, expiring initialization credentials.
- `chapter_settings`: alert thresholds, sender configuration, and operational flags.

Historical grade entries snapshot calculation inputs. Policy changes create versions and never rewrite finalized assignments. Corrections append revisions or audit records rather than rewriting history.
