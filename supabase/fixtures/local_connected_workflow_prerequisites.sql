-- Local-only prerequisites for validating connected_workflow.sql.
do $$
declare
  v_chapter_id uuid := '83000000-0000-4000-8000-000000000010';
  v_semester_id uuid := '83000000-0000-4000-8000-000000000020';
  v_rule_set_id uuid := '83000000-0000-4000-8000-000000000030';
begin
  insert into auth.users(id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
  values (
    '83000000-0000-4000-8000-000000000001',
    'local-workflow-chair@example.test',
    '{}',
    '{"full_name":"Local Synthetic Workflow Chair"}',
    'authenticated',
    'authenticated'
  )
  on conflict (id) do nothing;

  insert into public.chapters(id, fraternity_name, chapter_name, institution_name, initialized_at)
  values (
    v_chapter_id,
    'Synthetic Fraternity',
    'Local Workflow Test Chapter',
    'Example Test University',
    now()
  )
  on conflict (id) do nothing;

  insert into public.members(id, chapter_id, profile_id, full_name, status)
  values (
    '83000000-0000-4000-8000-000000000011',
    v_chapter_id,
    '83000000-0000-4000-8000-000000000001',
    'Local Synthetic Workflow Chair',
    'active'
  )
  on conflict (id) do nothing;

  insert into public.member_roles(chapter_id, member_id, role, active)
  values
    (v_chapter_id, '83000000-0000-4000-8000-000000000011', 'member', true),
    (v_chapter_id, '83000000-0000-4000-8000-000000000011', 'scholarship_chair', true)
  on conflict (member_id, role) do nothing;

  insert into public.chapter_settings(chapter_id)
  values (v_chapter_id)
  on conflict (chapter_id) do nothing;

  insert into public.semesters(
    id, chapter_id, name, start_date, end_date,
    default_deadline_weekday, default_deadline_time, timezone, active
  )
  values (
    v_semester_id,
    v_chapter_id,
    'Local Synthetic Workflow Semester',
    current_date - 14,
    current_date + 30,
    5,
    '23:59',
    'America/New_York',
    true
  )
  on conflict (id) do nothing;

  insert into public.academic_weeks(
    id, chapter_id, semester_id, sequence_number, label,
    starts_on, ends_on, deadline_at
  )
  values
    ('83000000-0000-4000-8000-000000000021', v_chapter_id, v_semester_id, 1, 'Local Synthetic Week 1', current_date - 10, current_date - 4, now() - interval '5 days'),
    ('83000000-0000-4000-8000-000000000022', v_chapter_id, v_semester_id, 2, 'Local Synthetic Week 2', current_date - 3, current_date + 3, now() + interval '2 days')
  on conflict (id) do nothing;

  insert into public.study_hour_rule_sets(
    id, chapter_id, version, d_adjustment_hours, f_adjustment_hours,
    maximum_hours, active, created_by
  )
  values (
    v_rule_set_id,
    v_chapter_id,
    1,
    1,
    2,
    5,
    true,
    '83000000-0000-4000-8000-000000000001'
  )
  on conflict (id) do nothing;

  insert into public.study_hour_bands(
    rule_set_id, minimum_gpa, maximum_gpa, base_hours, sort_order
  )
  values
    (v_rule_set_id, 3.50, 4.00, 0, 1),
    (v_rule_set_id, 3.00, 3.49, 1, 2),
    (v_rule_set_id, 2.75, 2.99, 2, 3),
    (v_rule_set_id, 2.50, 2.74, 2, 4),
    (v_rule_set_id, 2.25, 2.49, 3, 5),
    (v_rule_set_id, 2.00, 2.24, 4, 6),
    (v_rule_set_id, null, 1.99, 5, 7)
  on conflict (rule_set_id, sort_order) do nothing;
end;
$$;
