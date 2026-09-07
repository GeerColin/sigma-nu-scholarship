begin;
set local role postgres;
set local search_path = public, extensions;
select plan(10);

insert into auth.users(id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('10000000-0000-4000-8000-000000000001', 'chair@example.test', '{}', '{"full_name":"Demo Chair"}', 'authenticated', 'authenticated'),
  ('10000000-0000-4000-8000-000000000002', 'member-a@example.test', '{}', '{"full_name":"Member A"}', 'authenticated', 'authenticated'),
  ('10000000-0000-4000-8000-000000000003', 'member-b@example.test', '{}', '{"full_name":"Member B"}', 'authenticated', 'authenticated'),
  ('10000000-0000-4000-8000-000000000004', 'proctor@example.test', '{}', '{"full_name":"Demo Proctor"}', 'authenticated', 'authenticated'),
  ('10000000-0000-4000-8000-000000000005', 'admin@example.test', '{}', '{"full_name":"Demo Admin"}', 'authenticated', 'authenticated');

insert into public.chapters(id, fraternity_name, chapter_name, institution_name, initialized_at)
values ('10000000-0000-4000-8000-000000000010', 'Sigma Nu', 'Test Chapter', 'Test University', now());

insert into public.members(id, chapter_id, profile_id, full_name, status)
values
  ('10000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001', 'Demo Chair', 'active'),
  ('10000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000002', 'Member A', 'active'),
  ('10000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000003', 'Member B', 'active'),
  ('10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000004', 'Demo Proctor', 'active'),
  ('10000000-0000-4000-8000-000000000015', '10000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000005', 'Demo Admin', 'active');

insert into public.member_roles(chapter_id, member_id, role)
values
  ('10000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000011', 'member'),
  ('10000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000011', 'scholarship_chair'),
  ('10000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000012', 'member'),
  ('10000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000013', 'member'),
  ('10000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000014', 'member'),
  ('10000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000014', 'proctor'),
  ('10000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000015', 'member'),
  ('10000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000015', 'admin');

insert into public.semesters(id, chapter_id, name, start_date, end_date, default_deadline_weekday, default_deadline_time, active)
values ('10000000-0000-4000-8000-000000000020', '10000000-0000-4000-8000-000000000010', 'Permission Test', current_date - 7, current_date + 30, 5, '23:59', true);
insert into public.academic_weeks(id, chapter_id, semester_id, sequence_number, label, starts_on, ends_on, deadline_at)
values ('10000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000020', 1, 'Test Week', current_date - 3, current_date + 3, now() + interval '3 days');
insert into public.study_hour_rule_sets(id, chapter_id, version, active)
values ('10000000-0000-4000-8000-000000000022', '10000000-0000-4000-8000-000000000010', 1, true);
insert into public.study_hour_assignments(id, chapter_id, member_id, week_id, rule_set_id, estimated_gpa_used, automatic_hours, final_hours)
values ('10000000-0000-4000-8000-000000000023', '10000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000022', 3.0, 1, 1);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.members), 1, 'member can read only their own member row');
select is((select count(*)::integer from public.grade_entries), 0, 'member cannot retrieve another member grade entry');
update public.study_hour_assignments set override_hours = 0;
select is((select override_hours from public.study_hour_assignments where id = '10000000-0000-4000-8000-000000000023'), null::integer, 'member cannot override study hours');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select is((select count(*)::integer from public.members), 1, 'proctor direct member-table access remains self-only');
select is((select count(*)::integer from public.list_active_members_for_proctor()), 5, 'proctor can retrieve active names through restricted function');
select is((select count(*)::integer from public.grade_entries), 0, 'proctor cannot retrieve chapter grade entries');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select throws_ok($$select public.manage_member_role('10000000-0000-4000-8000-000000000012', 'admin', true)$$, 'P0001', 'Only the Scholarship Chair manages Admins', 'Admin cannot assign an Admin');
select throws_ok($$select public.transfer_scholarship_chair('10000000-0000-4000-8000-000000000012')$$, 'P0001', 'Only the Scholarship Chair may transfer this role', 'Admin cannot replace Chair');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select lives_ok($$select public.transfer_scholarship_chair('10000000-0000-4000-8000-000000000012')$$, 'Chair can complete an atomic handoff');
set local role postgres;
select is((select count(*)::integer from public.member_roles where role = 'scholarship_chair' and active), 1, 'exactly one active Chair remains');

select * from finish();
rollback;
