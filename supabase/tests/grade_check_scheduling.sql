begin;
set local role postgres;
set local search_path = public, extensions;
select plan(16);

insert into auth.users(id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('82000000-0000-4000-8000-000000000001', 'grade-chair@example.test', '{}', '{}', 'authenticated', 'authenticated'),
  ('82000000-0000-4000-8000-000000000002', 'grade-admin@example.test', '{}', '{}', 'authenticated', 'authenticated'),
  ('82000000-0000-4000-8000-000000000003', 'grade-member@example.test', '{}', '{}', 'authenticated', 'authenticated');

insert into public.chapters(id, fraternity_name, chapter_name, institution_name, initialized_at)
values
  ('82000000-0000-4000-8000-000000000010', 'Synthetic Fraternity', 'Grade Check Test', 'Synthetic University', now()),
  ('82000000-0000-4000-8000-000000000020', 'Other Fraternity', 'Other Chapter', 'Other University', now());

insert into public.members(id, chapter_id, profile_id, full_name, status)
values
  ('82000000-0000-4000-8000-000000000011', '82000000-0000-4000-8000-000000000010', '82000000-0000-4000-8000-000000000001', 'Synthetic Grade Chair', 'active'),
  ('82000000-0000-4000-8000-000000000012', '82000000-0000-4000-8000-000000000010', '82000000-0000-4000-8000-000000000002', 'Synthetic Grade Admin', 'active'),
  ('82000000-0000-4000-8000-000000000013', '82000000-0000-4000-8000-000000000010', '82000000-0000-4000-8000-000000000003', 'Synthetic Grade Member', 'active'),
  ('82000000-0000-4000-8000-000000000014', '82000000-0000-4000-8000-000000000010', null, 'Synthetic Unlinked Member', 'active');

insert into public.member_roles(chapter_id, member_id, role)
values
  ('82000000-0000-4000-8000-000000000010', '82000000-0000-4000-8000-000000000011', 'member'),
  ('82000000-0000-4000-8000-000000000010', '82000000-0000-4000-8000-000000000011', 'scholarship_chair'),
  ('82000000-0000-4000-8000-000000000010', '82000000-0000-4000-8000-000000000012', 'member'),
  ('82000000-0000-4000-8000-000000000010', '82000000-0000-4000-8000-000000000012', 'admin'),
  ('82000000-0000-4000-8000-000000000010', '82000000-0000-4000-8000-000000000013', 'member'),
  ('82000000-0000-4000-8000-000000000010', '82000000-0000-4000-8000-000000000014', 'member');

insert into public.semesters(id, chapter_id, name, start_date, end_date, default_deadline_weekday, default_deadline_time, timezone, active)
values ('82000000-0000-4000-8000-000000000030', '82000000-0000-4000-8000-000000000010', 'Synthetic Grade Checks', current_date - 28, current_date + 10, 5, '23:59', 'America/New_York', true);

insert into public.academic_weeks(id, chapter_id, semester_id, sequence_number, label, starts_on, ends_on, deadline_at)
values
  ('82000000-0000-4000-8000-000000000031', '82000000-0000-4000-8000-000000000010', '82000000-0000-4000-8000-000000000030', 1, 'Synthetic Week 1', current_date - 28, current_date - 22, now() - interval '21 days'),
  ('82000000-0000-4000-8000-000000000032', '82000000-0000-4000-8000-000000000010', '82000000-0000-4000-8000-000000000030', 2, 'Synthetic Week 2', current_date - 21, current_date - 15, now() - interval '14 days'),
  ('82000000-0000-4000-8000-000000000033', '82000000-0000-4000-8000-000000000010', '82000000-0000-4000-8000-000000000030', 3, 'Synthetic Week 3', current_date - 3, current_date + 3, now() + interval '1 day'),
  ('82000000-0000-4000-8000-000000000034', '82000000-0000-4000-8000-000000000010', '82000000-0000-4000-8000-000000000030', 4, 'Synthetic Week 4', current_date + 4, current_date + 10, now() + interval '8 days');

insert into public.semesters(id, chapter_id, name, start_date, end_date, default_deadline_weekday, default_deadline_time, timezone, active)
values ('82000000-0000-4000-8000-000000000040', '82000000-0000-4000-8000-000000000020', 'Other Chapter Semester', current_date - 7, current_date + 7, 5, '23:59', 'America/New_York', true);
insert into public.academic_weeks(id, chapter_id, semester_id, sequence_number, label, starts_on, ends_on, deadline_at)
values ('82000000-0000-4000-8000-000000000041', '82000000-0000-4000-8000-000000000020', '82000000-0000-4000-8000-000000000040', 1, 'Other Week', current_date - 3, current_date + 3, now() + interval '1 day');

set local role authenticated;
select set_config('request.jwt.claim.sub', '82000000-0000-4000-8000-000000000001', true);
select is((select first_grade_check_week_id from public.semesters where id = '82000000-0000-4000-8000-000000000030'), '82000000-0000-4000-8000-000000000031'::uuid, 'first generated week is the default start');
select lives_ok($$select public.set_semester_grade_check_start('82000000-0000-4000-8000-000000000030', '82000000-0000-4000-8000-000000000032')$$, 'Chair can move the first grade-check week');
select is(public.is_grade_check_required('82000000-0000-4000-8000-000000000031'), false, 'pre-start week is excluded');
select is(public.is_grade_check_required('82000000-0000-4000-8000-000000000032'), true, 'start week is required');
select lives_ok($$select public.set_academic_week_grade_check_required('82000000-0000-4000-8000-000000000033', false)$$, 'Chair can skip a grade-check week');
select is(public.is_grade_check_required('82000000-0000-4000-8000-000000000033'), false, 'skipped week is excluded');
select throws_ok($$select public.prepare_email_batch('82000000-0000-4000-8000-000000000033', 'missing_grade_reminder')$$, 'P0001', 'Missing-grade reminders are not eligible for this week', 'skipped weeks cannot create missing-grade reminders');
select is(public.is_grade_check_required('82000000-0000-4000-8000-000000000034'), true, 'later week remains required');
select throws_ok($$insert into public.grade_submissions(chapter_id, member_id, week_id, revision_number, original_submitted_at, deadline_at_snapshot, original_timing, revision_timing) values ('82000000-0000-4000-8000-000000000010', '82000000-0000-4000-8000-000000000013', '82000000-0000-4000-8000-000000000031', 1, now(), now(), 'on_time', 'on_time')$$, 'P0001', 'No grade check is required for this week', 'pre-start submissions are rejected');

set local role postgres;
insert into public.grade_submissions(chapter_id, member_id, week_id, revision_number, original_submitted_at, deadline_at_snapshot, original_timing, revision_timing)
values ('82000000-0000-4000-8000-000000000010', '82000000-0000-4000-8000-000000000013', '82000000-0000-4000-8000-000000000032', 1, now() - interval '13 days', now() - interval '14 days', 'late', 'late');
select lives_ok($$select public.set_semester_grade_check_start('82000000-0000-4000-8000-000000000030', '82000000-0000-4000-8000-000000000033')$$, 'Chair can change the start without rewriting submissions');
select is((select count(*)::integer from public.grade_submissions where week_id = '82000000-0000-4000-8000-000000000032'), 1, 'existing submission history remains after start change');

set local role authenticated;
select set_config('request.jwt.claim.sub', '82000000-0000-4000-8000-000000000002', true);
select lives_ok($$select public.set_academic_week_grade_check_required('82000000-0000-4000-8000-000000000034', false)$$, 'Admin can change a week requirement');
select set_config('request.jwt.claim.sub', '82000000-0000-4000-8000-000000000003', true);
select throws_ok($$select public.set_semester_grade_check_start('82000000-0000-4000-8000-000000000030', '82000000-0000-4000-8000-000000000034')$$, 'P0001', 'Not authorized', 'ordinary member cannot change grade-check start');
select set_config('request.jwt.claim.sub', '82000000-0000-4000-8000-000000000001', true);
select throws_ok($$select public.set_semester_grade_check_start('82000000-0000-4000-8000-000000000040', '82000000-0000-4000-8000-000000000041')$$, 'P0001', 'Semester was not found', 'chapter-scoped chair cannot change another chapter');
select throws_ok($$update public.academic_weeks set grade_check_required = false where id = '82000000-0000-4000-8000-000000000034'$$, '42501', null, 'direct week writes cannot bypass audited RPC');
select is((select count(*)::integer from public.audit_log where action in ('semester_grade_check_start_updated', 'academic_week_grade_check_requirement_updated')), 4, 'grade-check schedule changes are audited');

select * from finish();
rollback;
