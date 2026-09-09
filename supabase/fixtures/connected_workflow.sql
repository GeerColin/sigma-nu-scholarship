-- Development-only hosted fixture for the connected scholarship workflow.
-- Every person, email address, course, and academic value below is synthetic.
-- This script is idempotent and intentionally does not delete existing data.

do $$
declare
  v_chapter_id uuid;
  v_semester_id uuid;
  v_current_week_id uuid;
  v_previous_week_id uuid;
  v_current_deadline timestamptz;
  v_previous_deadline timestamptz;
  v_rule_set_id uuid;
  v_actor uuid;
begin
  select roles.chapter_id, members.profile_id
  into v_chapter_id, v_actor
  from public.member_roles roles
  join public.members members on members.id = roles.member_id
  where roles.role = 'scholarship_chair' and roles.active
  limit 1;

  select id into v_semester_id
  from public.semesters
  where chapter_id = v_chapter_id and active
  limit 1;

  select id, deadline_at into v_current_week_id, v_current_deadline
  from public.academic_weeks
  where semester_id = v_semester_id
    and current_date between starts_on and ends_on
  limit 1;

  select id, deadline_at into v_previous_week_id, v_previous_deadline
  from public.academic_weeks
  where semester_id = v_semester_id
    and sequence_number = (
      select sequence_number - 1
      from public.academic_weeks
      where id = v_current_week_id
    )
  limit 1;

  select id into v_rule_set_id
  from public.study_hour_rule_sets
  where chapter_id = v_chapter_id and active
  order by version desc
  limit 1;

  if v_chapter_id is null or v_semester_id is null or v_current_week_id is null
    or v_previous_week_id is null or v_rule_set_id is null then
    raise exception 'Active chapter, semester, adjacent weeks, and study-hour rules are required';
  end if;

  -- These non-login auth rows let the workflow verifier exercise member and
  -- proctor RPCs with an authenticated JWT identity while keeping every actor
  -- synthetic. They have no password, no external identity, and use reserved
  -- .invalid email addresses.
  insert into auth.users(id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
  values
    (
      '82000000-0000-4000-9000-000000000102',
      'blake.improving@scholarship.invalid',
      '{}'::jsonb,
      '{"full_name":"Synthetic Blake Improving"}'::jsonb,
      'authenticated',
      'authenticated'
    ),
    (
      '82000000-0000-4000-9000-000000000107',
      'gray.proctor@scholarship.invalid',
      '{}'::jsonb,
      '{"full_name":"Synthetic Gray Proctor"}'::jsonb,
      'authenticated',
      'authenticated'
    )
  on conflict (id) do update set
    email = excluded.email,
    raw_user_meta_data = excluded.raw_user_meta_data;

  insert into public.members(id, chapter_id, profile_id, full_name, notification_email, status)
  values
    ('82000000-0000-4000-8000-000000000101', v_chapter_id, null, 'Synthetic Avery Strong', 'avery.strong@scholarship.invalid', 'active'),
    ('82000000-0000-4000-8000-000000000102', v_chapter_id, '82000000-0000-4000-9000-000000000102', 'Synthetic Blake Improving', 'blake.improving@scholarship.invalid', 'active'),
    ('82000000-0000-4000-8000-000000000103', v_chapter_id, null, 'Synthetic Casey Needs Support', 'casey.support@scholarship.invalid', 'active'),
    ('82000000-0000-4000-8000-000000000104', v_chapter_id, null, 'Synthetic Devon Late', 'devon.late@scholarship.invalid', 'active'),
    ('82000000-0000-4000-8000-000000000105', v_chapter_id, null, 'Synthetic Ellis Custom', 'ellis.custom@scholarship.invalid', 'active'),
    ('82000000-0000-4000-8000-000000000106', v_chapter_id, null, 'Synthetic Finley Missing', 'finley.missing@scholarship.invalid', 'active'),
    ('82000000-0000-4000-8000-000000000107', v_chapter_id, '82000000-0000-4000-9000-000000000107', 'Synthetic Gray Proctor', 'gray.proctor@scholarship.invalid', 'active')
  on conflict (id) do update set
    profile_id = excluded.profile_id,
    full_name = excluded.full_name,
    notification_email = excluded.notification_email,
    status = excluded.status;

  insert into public.member_roles(chapter_id, member_id, role, active, granted_by)
  values
    (v_chapter_id, '82000000-0000-4000-8000-000000000101', 'member', true, v_actor),
    (v_chapter_id, '82000000-0000-4000-8000-000000000102', 'member', true, v_actor),
    (v_chapter_id, '82000000-0000-4000-8000-000000000102', 'admin', true, v_actor),
    (v_chapter_id, '82000000-0000-4000-8000-000000000103', 'member', true, v_actor),
    (v_chapter_id, '82000000-0000-4000-8000-000000000104', 'member', true, v_actor),
    (v_chapter_id, '82000000-0000-4000-8000-000000000105', 'member', true, v_actor),
    (v_chapter_id, '82000000-0000-4000-8000-000000000106', 'member', true, v_actor),
    (v_chapter_id, '82000000-0000-4000-8000-000000000107', 'member', true, v_actor),
    (v_chapter_id, '82000000-0000-4000-8000-000000000107', 'proctor', true, v_actor)
  on conflict (member_id, role) do update set active = true, revoked_at = null;

  insert into public.grading_scales(id, chapter_id, name, version, scale, active, created_by)
  values (
    '82000000-0000-4000-8000-000000000201',
    v_chapter_id,
    'Synthetic Plus Scale',
    1,
    '[{"letter":"A","minimum":93,"gradePoints":4},{"letter":"B","minimum":85,"gradePoints":3},{"letter":"C","minimum":75,"gradePoints":2},{"letter":"D","minimum":65,"gradePoints":1},{"letter":"F","minimum":0,"gradePoints":0}]',
    true,
    v_actor
  )
  on conflict (id) do nothing;

  insert into public.courses(id, chapter_id, member_id, semester_id, name, credit_hours, grading_type, grading_scale_id, custom_grading_description)
  values
    ('82000000-0000-4000-8000-000000000211', v_chapter_id, '82000000-0000-4000-8000-000000000101', v_semester_id, 'Synthetic Calculus', 4, 'percentage', null, null),
    ('82000000-0000-4000-8000-000000000212', v_chapter_id, '82000000-0000-4000-8000-000000000101', v_semester_id, 'Synthetic Chemistry Plus', 3, 'percentage', '82000000-0000-4000-8000-000000000201', null),
    ('82000000-0000-4000-8000-000000000221', v_chapter_id, '82000000-0000-4000-8000-000000000102', v_semester_id, 'Synthetic History', 3, 'letter', null, null),
    ('82000000-0000-4000-8000-000000000222', v_chapter_id, '82000000-0000-4000-8000-000000000102', v_semester_id, 'Synthetic Seminar', 1, 'pass_fail', null, null),
    ('82000000-0000-4000-8000-000000000231', v_chapter_id, '82000000-0000-4000-8000-000000000103', v_semester_id, 'Synthetic Biology', 3, 'percentage', null, null),
    ('82000000-0000-4000-8000-000000000232', v_chapter_id, '82000000-0000-4000-8000-000000000103', v_semester_id, 'Synthetic Writing', 3, 'letter', null, null),
    ('82000000-0000-4000-8000-000000000241', v_chapter_id, '82000000-0000-4000-8000-000000000104', v_semester_id, 'Synthetic Economics', 3, 'percentage', null, null),
    ('82000000-0000-4000-8000-000000000251', v_chapter_id, '82000000-0000-4000-8000-000000000105', v_semester_id, 'Synthetic Practicum Standing', 3, 'custom', null, 'Satisfactory / Unsatisfactory'),
    ('82000000-0000-4000-8000-000000000261', v_chapter_id, '82000000-0000-4000-8000-000000000106', v_semester_id, 'Synthetic Computer Science', 4, 'percentage', null, null),
    ('82000000-0000-4000-8000-000000000271', v_chapter_id, '82000000-0000-4000-8000-000000000107', v_semester_id, 'Synthetic Learning Theory', 3, 'percentage', null, null),
    ('82000000-0000-4000-8000-000000000272', v_chapter_id, '82000000-0000-4000-8000-000000000107', v_semester_id, 'Synthetic Leadership', 1, 'letter', null, null)
  on conflict (id) do nothing;

  insert into public.grade_submissions(
    id, chapter_id, member_id, week_id, revision_number, previous_revision_id,
    submitted_at, original_submitted_at, deadline_at_snapshot,
    original_timing, revision_timing, is_current,
    estimated_gpa_snapshot, included_course_count, active_course_count
  )
  values
    ('82000000-0000-4000-8000-000000000301', v_chapter_id, '82000000-0000-4000-8000-000000000101', v_previous_week_id, 1, null, v_previous_deadline - interval '2 hours', v_previous_deadline - interval '2 hours', v_previous_deadline, 'on_time', 'on_time', false, 4.00, 2, 2),
    ('82000000-0000-4000-8000-000000000302', v_chapter_id, '82000000-0000-4000-8000-000000000101', v_previous_week_id, 2, '82000000-0000-4000-8000-000000000301', v_previous_deadline + interval '2 hours', v_previous_deadline - interval '2 hours', v_previous_deadline, 'on_time', 'late', true, 3.57, 2, 2),
    ('82000000-0000-4000-8000-000000000303', v_chapter_id, '82000000-0000-4000-8000-000000000101', v_current_week_id, 1, null, now() - interval '1 hour', now() - interval '1 hour', v_current_deadline, 'on_time', 'on_time', true, 3.57, 2, 2),
    ('82000000-0000-4000-8000-000000000311', v_chapter_id, '82000000-0000-4000-8000-000000000102', v_previous_week_id, 1, null, v_previous_deadline - interval '3 hours', v_previous_deadline - interval '3 hours', v_previous_deadline, 'on_time', 'on_time', true, 3.00, 1, 2),
    ('82000000-0000-4000-8000-000000000312', v_chapter_id, '82000000-0000-4000-8000-000000000102', v_current_week_id, 1, null, now() - interval '2 hours', now() - interval '2 hours', v_current_deadline, 'on_time', 'on_time', true, 4.00, 1, 2),
    ('82000000-0000-4000-8000-000000000321', v_chapter_id, '82000000-0000-4000-8000-000000000103', v_previous_week_id, 1, null, v_previous_deadline - interval '4 hours', v_previous_deadline - interval '4 hours', v_previous_deadline, 'on_time', 'on_time', true, 3.00, 2, 2),
    ('82000000-0000-4000-8000-000000000322', v_chapter_id, '82000000-0000-4000-8000-000000000103', v_current_week_id, 1, null, now() - interval '3 hours', now() - interval '3 hours', v_current_deadline, 'on_time', 'on_time', true, 0.50, 2, 2),
    ('82000000-0000-4000-8000-000000000331', v_chapter_id, '82000000-0000-4000-8000-000000000104', v_current_week_id, 1, null, now(), now(), now() - interval '1 day', 'late', 'late', true, 3.00, 1, 1),
    ('82000000-0000-4000-8000-000000000341', v_chapter_id, '82000000-0000-4000-8000-000000000105', v_previous_week_id, 1, null, v_previous_deadline - interval '1 hour', v_previous_deadline - interval '1 hour', v_previous_deadline, 'on_time', 'on_time', true, null, 0, 1),
    ('82000000-0000-4000-8000-000000000342', v_chapter_id, '82000000-0000-4000-8000-000000000105', v_current_week_id, 1, null, now() - interval '30 minutes', now() - interval '30 minutes', v_current_deadline, 'on_time', 'on_time', true, null, 0, 1),
    ('82000000-0000-4000-8000-000000000351', v_chapter_id, '82000000-0000-4000-8000-000000000107', v_previous_week_id, 1, null, v_previous_deadline - interval '1 hour', v_previous_deadline - interval '1 hour', v_previous_deadline, 'on_time', 'on_time', true, 2.75, 2, 2),
    ('82000000-0000-4000-8000-000000000352', v_chapter_id, '82000000-0000-4000-8000-000000000107', v_current_week_id, 1, null, now() - interval '45 minutes', now() - interval '45 minutes', v_current_deadline, 'on_time', 'on_time', true, 2.50, 2, 2)
  on conflict (id) do nothing;

  insert into public.grade_entries(
    id, chapter_id, submission_id, course_id, course_name_snapshot,
    credit_hours_snapshot, grading_type_snapshot, grading_scale_snapshot,
    reported_value, included_in_gpa, gpa_points, letter_equivalent
  )
  values
    ('82000000-0000-4000-8000-000000000401', v_chapter_id, '82000000-0000-4000-8000-000000000301', '82000000-0000-4000-8000-000000000211', 'Synthetic Calculus', 4, 'percentage', null, '95', true, 4, 'A'),
    ('82000000-0000-4000-8000-000000000402', v_chapter_id, '82000000-0000-4000-8000-000000000301', '82000000-0000-4000-8000-000000000212', 'Synthetic Chemistry Plus', 3, 'percentage', '[{"letter":"A","minimum":93,"gradePoints":4},{"letter":"B","minimum":85,"gradePoints":3}]', '94', true, 4, 'A'),
    ('82000000-0000-4000-8000-000000000403', v_chapter_id, '82000000-0000-4000-8000-000000000302', '82000000-0000-4000-8000-000000000211', 'Synthetic Calculus', 4, 'percentage', null, '95', true, 4, 'A'),
    ('82000000-0000-4000-8000-000000000404', v_chapter_id, '82000000-0000-4000-8000-000000000302', '82000000-0000-4000-8000-000000000212', 'Synthetic Chemistry Plus', 3, 'percentage', '[{"letter":"A","minimum":93,"gradePoints":4},{"letter":"B","minimum":85,"gradePoints":3}]', '90', true, 3, 'B'),
    ('82000000-0000-4000-8000-000000000405', v_chapter_id, '82000000-0000-4000-8000-000000000303', '82000000-0000-4000-8000-000000000211', 'Synthetic Calculus', 4, 'percentage', null, '94', true, 4, 'A'),
    ('82000000-0000-4000-8000-000000000406', v_chapter_id, '82000000-0000-4000-8000-000000000303', '82000000-0000-4000-8000-000000000212', 'Synthetic Chemistry Plus', 3, 'percentage', '[{"letter":"A","minimum":93,"gradePoints":4},{"letter":"B","minimum":85,"gradePoints":3}]', '89', true, 3, 'B'),
    ('82000000-0000-4000-8000-000000000411', v_chapter_id, '82000000-0000-4000-8000-000000000311', '82000000-0000-4000-8000-000000000221', 'Synthetic History', 3, 'letter', null, '"B"', true, 3, 'B'),
    ('82000000-0000-4000-8000-000000000412', v_chapter_id, '82000000-0000-4000-8000-000000000311', '82000000-0000-4000-8000-000000000222', 'Synthetic Seminar', 1, 'pass_fail', null, '"Pass"', false, null, null),
    ('82000000-0000-4000-8000-000000000413', v_chapter_id, '82000000-0000-4000-8000-000000000312', '82000000-0000-4000-8000-000000000221', 'Synthetic History', 3, 'letter', null, '"A"', true, 4, 'A'),
    ('82000000-0000-4000-8000-000000000414', v_chapter_id, '82000000-0000-4000-8000-000000000312', '82000000-0000-4000-8000-000000000222', 'Synthetic Seminar', 1, 'pass_fail', null, '"Pass"', false, null, null),
    ('82000000-0000-4000-8000-000000000421', v_chapter_id, '82000000-0000-4000-8000-000000000321', '82000000-0000-4000-8000-000000000231', 'Synthetic Biology', 3, 'percentage', null, '85', true, 3, 'B'),
    ('82000000-0000-4000-8000-000000000422', v_chapter_id, '82000000-0000-4000-8000-000000000321', '82000000-0000-4000-8000-000000000232', 'Synthetic Writing', 3, 'letter', null, '"B"', true, 3, 'B'),
    ('82000000-0000-4000-8000-000000000423', v_chapter_id, '82000000-0000-4000-8000-000000000322', '82000000-0000-4000-8000-000000000231', 'Synthetic Biology', 3, 'percentage', null, '65', true, 1, 'D'),
    ('82000000-0000-4000-8000-000000000424', v_chapter_id, '82000000-0000-4000-8000-000000000322', '82000000-0000-4000-8000-000000000232', 'Synthetic Writing', 3, 'letter', null, '"F"', true, 0, 'F'),
    ('82000000-0000-4000-8000-000000000431', v_chapter_id, '82000000-0000-4000-8000-000000000331', '82000000-0000-4000-8000-000000000241', 'Synthetic Economics', 3, 'percentage', null, '82', true, 3, 'B'),
    ('82000000-0000-4000-8000-000000000441', v_chapter_id, '82000000-0000-4000-8000-000000000341', '82000000-0000-4000-8000-000000000251', 'Synthetic Practicum Standing', 3, 'custom', null, '"Satisfactory"', false, null, null),
    ('82000000-0000-4000-8000-000000000442', v_chapter_id, '82000000-0000-4000-8000-000000000342', '82000000-0000-4000-8000-000000000251', 'Synthetic Practicum Standing', 3, 'custom', null, '"Satisfactory"', false, null, null),
    ('82000000-0000-4000-8000-000000000451', v_chapter_id, '82000000-0000-4000-8000-000000000351', '82000000-0000-4000-8000-000000000271', 'Synthetic Learning Theory', 3, 'percentage', null, '88', true, 3, 'B'),
    ('82000000-0000-4000-8000-000000000452', v_chapter_id, '82000000-0000-4000-8000-000000000351', '82000000-0000-4000-8000-000000000272', 'Synthetic Leadership', 1, 'letter', null, '"C"', true, 2, 'C'),
    ('82000000-0000-4000-8000-000000000453', v_chapter_id, '82000000-0000-4000-8000-000000000352', '82000000-0000-4000-8000-000000000271', 'Synthetic Learning Theory', 3, 'percentage', null, '88', true, 3, 'B'),
    ('82000000-0000-4000-8000-000000000454', v_chapter_id, '82000000-0000-4000-8000-000000000352', '82000000-0000-4000-8000-000000000272', 'Synthetic Leadership', 1, 'letter', null, '"D"', true, 1, 'D')
  on conflict (id) do nothing;

  insert into public.study_hour_assignments(
    id, chapter_id, member_id, week_id, rule_set_id,
    estimated_gpa_used, had_d, had_f, automatic_hours, final_hours, state
  )
  values
    ('82000000-0000-4000-8000-000000000501', v_chapter_id, '82000000-0000-4000-8000-000000000101', v_current_week_id, v_rule_set_id, 3.57, false, false, public.calculate_study_hour_requirement(v_rule_set_id, 3.57, false, false), public.calculate_study_hour_requirement(v_rule_set_id, 3.57, false, false), 'draft'),
    ('82000000-0000-4000-8000-000000000502', v_chapter_id, '82000000-0000-4000-8000-000000000102', v_current_week_id, v_rule_set_id, 4.00, false, false, public.calculate_study_hour_requirement(v_rule_set_id, 4.00, false, false), public.calculate_study_hour_requirement(v_rule_set_id, 4.00, false, false), 'draft'),
    ('82000000-0000-4000-8000-000000000503', v_chapter_id, '82000000-0000-4000-8000-000000000103', v_current_week_id, v_rule_set_id, 0.50, true, true, public.calculate_study_hour_requirement(v_rule_set_id, 0.50, true, true), public.calculate_study_hour_requirement(v_rule_set_id, 0.50, true, true), 'draft'),
    ('82000000-0000-4000-8000-000000000504', v_chapter_id, '82000000-0000-4000-8000-000000000104', v_current_week_id, v_rule_set_id, 3.00, false, false, public.calculate_study_hour_requirement(v_rule_set_id, 3.00, false, false), public.calculate_study_hour_requirement(v_rule_set_id, 3.00, false, false), 'draft'),
    ('82000000-0000-4000-8000-000000000507', v_chapter_id, '82000000-0000-4000-8000-000000000107', v_current_week_id, v_rule_set_id, 2.50, true, false, public.calculate_study_hour_requirement(v_rule_set_id, 2.50, true, false), public.calculate_study_hour_requirement(v_rule_set_id, 2.50, true, false), 'draft')
  on conflict (id) do nothing;

  insert into public.study_sessions(
    id, chapter_id, member_id, proctor_member_id, week_id,
    session_date, duration_minutes, notes
  )
  values
    ('82000000-0000-4000-8000-000000000601', v_chapter_id, '82000000-0000-4000-8000-000000000107', '82000000-0000-4000-8000-000000000107', v_current_week_id, current_date, 60, 'Synthetic session one'),
    ('82000000-0000-4000-8000-000000000602', v_chapter_id, '82000000-0000-4000-8000-000000000107', '82000000-0000-4000-8000-000000000107', v_current_week_id, current_date, 90, 'Synthetic session two')
  on conflict (id) do nothing;

  insert into public.academic_alerts(
    id, chapter_id, member_id, course_id, submission_id, alert_type, details
  )
  values (
    '82000000-0000-4000-8000-000000000701',
    v_chapter_id,
    '82000000-0000-4000-8000-000000000103',
    '82000000-0000-4000-8000-000000000231',
    '82000000-0000-4000-8000-000000000322',
    'percentage_drop',
    '{"previous":85,"current":65,"decrease":20}'
  )
  on conflict (id) do nothing;

  insert into public.audit_log(
    chapter_id, actor_profile_id, action, entity_type, entity_id, after_state, reason
  )
  select v_chapter_id, null, fixture.action, fixture.entity_type, fixture.entity_id, fixture.after_state, 'Synthetic connected-workflow fixture'
  from (values
    ('grade_submission_created', 'grade_submission', '82000000-0000-4000-8000-000000000301', '{"revision":1}'::jsonb),
    ('grade_submission_revised', 'grade_submission', '82000000-0000-4000-8000-000000000302', '{"revision":2,"original_timing":"on_time","revision_timing":"late"}'::jsonb),
    ('study_session_recorded', 'study_session', '82000000-0000-4000-8000-000000000601', '{"duration_minutes":60}'::jsonb),
    ('study_session_recorded', 'study_session', '82000000-0000-4000-8000-000000000602', '{"duration_minutes":90}'::jsonb)
  ) as fixture(action, entity_type, entity_id, after_state)
  where not exists (
    select 1 from public.audit_log existing
    where existing.entity_id = fixture.entity_id
      and existing.action = fixture.action
  );

  raise notice 'Synthetic workflow fixture loaded: 7 members, 11 courses, current on-time 5, late 1, missing 1';
end;
$$;
