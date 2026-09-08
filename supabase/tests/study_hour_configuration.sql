begin;
set local role postgres;
set local search_path = public, extensions;
select plan(19);

insert into auth.users(id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('70000000-0000-4000-8000-000000000001', 'rules-chair@example.test', '{}', '{"full_name":"Rules Chair"}', 'authenticated', 'authenticated'),
  ('70000000-0000-4000-8000-000000000002', 'rules-member@example.test', '{}', '{"full_name":"Rules Member"}', 'authenticated', 'authenticated');

insert into public.chapters(id, fraternity_name, chapter_name, institution_name, initialized_at)
values ('70000000-0000-4000-8000-000000000010', 'Sigma Nu', 'Rules Test Chapter', 'Test University', now());

insert into public.members(id, chapter_id, profile_id, full_name, status)
values
  ('70000000-0000-4000-8000-000000000011', '70000000-0000-4000-8000-000000000010', '70000000-0000-4000-8000-000000000001', 'Rules Chair', 'active'),
  ('70000000-0000-4000-8000-000000000012', '70000000-0000-4000-8000-000000000010', '70000000-0000-4000-8000-000000000002', 'Rules Member', 'active');

insert into public.member_roles(chapter_id, member_id, role)
values
  ('70000000-0000-4000-8000-000000000010', '70000000-0000-4000-8000-000000000011', 'member'),
  ('70000000-0000-4000-8000-000000000010', '70000000-0000-4000-8000-000000000011', 'scholarship_chair'),
  ('70000000-0000-4000-8000-000000000010', '70000000-0000-4000-8000-000000000012', 'member');

insert into public.semesters(id, chapter_id, name, start_date, end_date, default_deadline_weekday, default_deadline_time, active)
values ('70000000-0000-4000-8000-000000000020', '70000000-0000-4000-8000-000000000010', 'Rules Test Semester', current_date - 7, current_date + 30, 5, '23:59', true);

insert into public.academic_weeks(id, chapter_id, semester_id, sequence_number, label, starts_on, ends_on, deadline_at)
values ('70000000-0000-4000-8000-000000000021', '70000000-0000-4000-8000-000000000010', '70000000-0000-4000-8000-000000000020', 1, 'Rules Test Week', current_date - 3, current_date + 3, now() + interval '3 days');

insert into public.courses(id, chapter_id, member_id, semester_id, name, credit_hours, grading_type)
values ('70000000-0000-4000-8000-000000000030', '70000000-0000-4000-8000-000000000010', '70000000-0000-4000-8000-000000000012', '70000000-0000-4000-8000-000000000020', 'Synthetic Course', 3, 'percentage');

insert into public.grade_submissions(
  id,
  chapter_id,
  member_id,
  week_id,
  revision_number,
  original_submitted_at,
  deadline_at_snapshot,
  original_timing,
  revision_timing,
  is_current,
  estimated_gpa_snapshot,
  included_course_count,
  active_course_count
)
values (
  '70000000-0000-4000-8000-000000000040',
  '70000000-0000-4000-8000-000000000010',
  '70000000-0000-4000-8000-000000000012',
  '70000000-0000-4000-8000-000000000021',
  1,
  now(),
  now() + interval '3 days',
  'on_time',
  'on_time',
  true,
  3.20,
  1,
  1
);

insert into public.grade_entries(
  id,
  chapter_id,
  submission_id,
  course_id,
  course_name_snapshot,
  credit_hours_snapshot,
  grading_type_snapshot,
  reported_value,
  included_in_gpa,
  gpa_points,
  letter_equivalent
)
values (
  '70000000-0000-4000-8000-000000000041',
  '70000000-0000-4000-8000-000000000010',
  '70000000-0000-4000-8000-000000000040',
  '70000000-0000-4000-8000-000000000030',
  'Synthetic Course',
  3,
  'percentage',
  '{"percentage":84}',
  true,
  3.00,
  'B'
);

select is(
  (select count(*)::integer from public.study_hour_assignments where chapter_id = '70000000-0000-4000-8000-000000000010'),
  0,
  'a submission created before rule setup has no assignment'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000002', true);
select throws_ok(
  $$select public.configure_study_hour_rule_set(1, 1, 2, 2, 3, 4, 5, 1, 2, 5, 'Unauthorized attempt')$$,
  'P0001',
  'Not authorized',
  'Member cannot configure study-hour rules'
);

select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$select public.configure_study_hour_rule_set(1, 1, 2, 2, 3, 4, 5, 1, 2, 5, 'Initial synthetic policy')$$,
  'Chair can configure the initial rule set'
);

set local role postgres;
select is(
  (select count(*)::integer from public.study_hour_rule_sets where chapter_id = '70000000-0000-4000-8000-000000000010' and active),
  1,
  'one rule set is active'
);
select is(
  (select version from public.study_hour_rule_sets where chapter_id = '70000000-0000-4000-8000-000000000010' and active),
  1,
  'the first rule set has version one'
);
select is(
  (
    select count(*)::integer
    from public.study_hour_bands bands
    join public.study_hour_rule_sets rules on rules.id = bands.rule_set_id
    where rules.chapter_id = '70000000-0000-4000-8000-000000000010'
  ),
  7,
  'the configured rule set contains all approved GPA bands'
);
select is(
  public.calculate_study_hour_requirement(
    (select id from public.study_hour_rule_sets where chapter_id = '70000000-0000-4000-8000-000000000010' and active),
    3.20,
    false,
    false
  ),
  1,
  'base hours use the configured GPA band'
);
select is(
  public.calculate_study_hour_requirement(
    (select id from public.study_hour_rule_sets where chapter_id = '70000000-0000-4000-8000-000000000010' and active),
    3.20,
    true,
    false
  ),
  2,
  'a D applies the configured adjustment'
);
select is(
  public.calculate_study_hour_requirement(
    (select id from public.study_hour_rule_sets where chapter_id = '70000000-0000-4000-8000-000000000010' and active),
    2.80,
    false,
    true
  ),
  4,
  'an F applies the strongest configured adjustment'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000002', true);
select throws_ok(
  $$select public.refresh_study_hour_assignments('70000000-0000-4000-8000-000000000021')$$,
  'P0001',
  'Not authorized',
  'Member cannot refresh chapter assignments'
);

select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', true);
select is(
  public.refresh_study_hour_assignments('70000000-0000-4000-8000-000000000021'),
  1,
  'Chair refresh processes the current synthetic submission'
);

set local role postgres;
select is(
  (select count(*)::integer from public.study_hour_assignments where chapter_id = '70000000-0000-4000-8000-000000000010'),
  1,
  'refresh creates the missing assignment'
);
select is(
  (select final_hours from public.study_hour_assignments where chapter_id = '70000000-0000-4000-8000-000000000010'),
  1,
  'the refreshed assignment uses the authoritative calculation'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$select public.configure_study_hour_rule_set(0, 1, 2, 2, 3, 4, 5, 1, 2, 5, 'Synthetic policy revision')$$,
  'Chair can create a new immutable rule-set version'
);

set local role postgres;
select is(
  (select count(*)::integer from public.study_hour_rule_sets where chapter_id = '70000000-0000-4000-8000-000000000010' and active),
  1,
  'only one rule-set version remains active'
);
select is(
  (select version from public.study_hour_rule_sets where chapter_id = '70000000-0000-4000-8000-000000000010' and active),
  2,
  'the new active rule set increments the version'
);
select is(
  (select active from public.study_hour_rule_sets where chapter_id = '70000000-0000-4000-8000-000000000010' and version = 1),
  false,
  'the prior rule-set version is retained as inactive'
);
select is(
  public.calculate_study_hour_requirement(
    (select id from public.study_hour_rule_sets where chapter_id = '70000000-0000-4000-8000-000000000010' and active),
    3.80,
    false,
    false
  ),
  0,
  'the new version is used for subsequent calculations'
);
select is(
  (
    select count(*)::integer
    from public.audit_log
    where chapter_id = '70000000-0000-4000-8000-000000000010'
      and action in ('study_hour_rules_configured', 'study_hour_assignments_refreshed')
  ),
  3,
  'rule configuration and assignment refresh operations are audited'
);

select * from finish();
rollback;
