begin;
set local role postgres;
set local search_path = public, extensions;
select plan(7);

insert into auth.users(id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('91000000-0000-4000-8000-000000000001', 'session-chair@example.test', '{}', '{"full_name":"Session Chair"}', 'authenticated', 'authenticated'),
  ('91000000-0000-4000-8000-000000000002', 'proctor-one@example.test', '{}', '{"full_name":"Proctor One"}', 'authenticated', 'authenticated'),
  ('91000000-0000-4000-8000-000000000003', 'proctor-two@example.test', '{}', '{"full_name":"Proctor Two"}', 'authenticated', 'authenticated'),
  ('91000000-0000-4000-8000-000000000004', 'session-member@example.test', '{}', '{"full_name":"Session Member"}', 'authenticated', 'authenticated');
insert into public.chapters(id, fraternity_name, chapter_name, institution_name, initialized_at)
values ('91000000-0000-4000-8000-000000000010', 'Sigma Nu', 'Session Test', 'Test University', now());
insert into public.members(id, chapter_id, profile_id, full_name, status)
values
  ('91000000-0000-4000-8000-000000000011', '91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000001', 'Session Chair', 'active'),
  ('91000000-0000-4000-8000-000000000012', '91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000002', 'Proctor One', 'active'),
  ('91000000-0000-4000-8000-000000000013', '91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000003', 'Proctor Two', 'active'),
  ('91000000-0000-4000-8000-000000000014', '91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000004', 'Session Member', 'active');
insert into public.member_roles(chapter_id, member_id, role)
values
  ('91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000011', 'member'),
  ('91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000011', 'scholarship_chair'),
  ('91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000012', 'member'),
  ('91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000012', 'proctor'),
  ('91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000013', 'member'),
  ('91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000013', 'proctor'),
  ('91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000014', 'member');
insert into public.semesters(id, chapter_id, name, start_date, end_date, default_deadline_weekday, default_deadline_time, active)
values ('91000000-0000-4000-8000-000000000020', '91000000-0000-4000-8000-000000000010', 'Session Semester', current_date - 30, current_date + 30, 5, '23:59', true);
insert into public.academic_weeks(id, chapter_id, semester_id, sequence_number, label, starts_on, ends_on, deadline_at)
values
  ('91000000-0000-4000-8000-000000000021', '91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000020', 1, 'Old Week', current_date - 14, current_date - 8, now() - interval '8 days'),
  ('91000000-0000-4000-8000-000000000022', '91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000020', 2, 'Current Week', current_date - 3, current_date + 3, now() + interval '3 days');
insert into public.study_sessions(id, chapter_id, member_id, proctor_member_id, week_id, session_date, duration_minutes)
values
  ('91000000-0000-4000-8000-000000000030', '91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000014', '91000000-0000-4000-8000-000000000012', '91000000-0000-4000-8000-000000000021', current_date - 10, 60),
  ('91000000-0000-4000-8000-000000000031', '91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000014', '91000000-0000-4000-8000-000000000012', '91000000-0000-4000-8000-000000000022', current_date - 1, 60),
  ('91000000-0000-4000-8000-000000000032', '91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000014', '91000000-0000-4000-8000-000000000013', '91000000-0000-4000-8000-000000000022', current_date - 1, 60);

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000002', true);
select lives_ok($$select public.record_study_session('91000000-0000-4000-8000-000000000014', '91000000-0000-4000-8000-000000000022', current_date, 45, 'Synthetic session')$$, 'Proctor can record a session for an active member');
select lives_ok($$select public.edit_own_current_week_session('91000000-0000-4000-8000-000000000031', current_date, 75, 'Current correction')$$, 'Proctor can edit their own current-week session');
select throws_ok($$select public.edit_own_current_week_session('91000000-0000-4000-8000-000000000030', current_date - 10, 75, 'Old correction')$$, 'P0001', 'The session is locked because its week has ended', 'Proctor cannot edit their own old-week session');
select throws_ok($$select public.edit_own_current_week_session('91000000-0000-4000-8000-000000000032', current_date, 75, 'Other correction')$$, 'P0001', 'Session was not found', 'Proctor cannot edit another Proctor session');
select throws_ok($$select public.correct_study_session('91000000-0000-4000-8000-000000000030', current_date - 10, 90, null, 'Correction')$$, 'P0001', 'Not authorized', 'Proctor cannot use administrative correction');

select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
select lives_ok($$select public.correct_study_session('91000000-0000-4000-8000-000000000030', current_date - 10, 90, 'Chair correction', 'Verified synthetic correction')$$, 'Chair can correct an older session');
select is((select count(*)::integer from public.audit_log where action = 'study_session_corrected'), 1, 'administrative correction is audited');

select * from finish();
rollback;

