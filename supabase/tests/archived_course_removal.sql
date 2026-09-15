begin;
set local role postgres;
set local search_path = public, extensions;
select plan(9);

insert into auth.users(id, email, raw_app_meta_data, raw_user_meta_data, aud, role) values
  ('81000000-0000-4000-8000-000000000001', 'course-chair@example.test', '{}', '{"full_name":"Course Chair"}', 'authenticated', 'authenticated'),
  ('81000000-0000-4000-8000-000000000002', 'course-owner@example.test', '{}', '{"full_name":"Course Owner"}', 'authenticated', 'authenticated');
insert into public.chapters(id, fraternity_name, chapter_name, institution_name, initialized_at)
values ('81000000-0000-4000-8000-000000000010', 'Sigma Nu', 'Removal Test', 'Test University', now());
insert into public.members(id, chapter_id, profile_id, full_name, status) values
  ('81000000-0000-4000-8000-000000000011', '81000000-0000-4000-8000-000000000010', '81000000-0000-4000-8000-000000000001', 'Course Chair', 'active'),
  ('81000000-0000-4000-8000-000000000012', '81000000-0000-4000-8000-000000000010', '81000000-0000-4000-8000-000000000002', 'Course Owner', 'active');
insert into public.member_roles(chapter_id, member_id, role) values
  ('81000000-0000-4000-8000-000000000010', '81000000-0000-4000-8000-000000000011', 'scholarship_chair'),
  ('81000000-0000-4000-8000-000000000010', '81000000-0000-4000-8000-000000000012', 'member');
insert into public.semesters(id, chapter_id, name, start_date, end_date, default_deadline_weekday, default_deadline_time, active)
values ('81000000-0000-4000-8000-000000000020', '81000000-0000-4000-8000-000000000010', 'Removal Semester', current_date, current_date + 100, 5, '23:59', true);
insert into public.courses(id, chapter_id, member_id, semester_id, name, credit_hours, grading_type, archived_at) values
  ('81000000-0000-4000-8000-000000000030', '81000000-0000-4000-8000-000000000010', '81000000-0000-4000-8000-000000000012', '81000000-0000-4000-8000-000000000020', 'Unused Archived', 3, 'letter', now()),
  ('81000000-0000-4000-8000-000000000031', '81000000-0000-4000-8000-000000000010', '81000000-0000-4000-8000-000000000012', '81000000-0000-4000-8000-000000000020', 'Reviewed Archived', 3, 'custom', now()),
  ('81000000-0000-4000-8000-000000000032', '81000000-0000-4000-8000-000000000010', '81000000-0000-4000-8000-000000000012', '81000000-0000-4000-8000-000000000020', 'Still Active', 3, 'letter', null);
insert into public.custom_grading_reviews(chapter_id, course_id, treatment, reason, reviewed_by)
values ('81000000-0000-4000-8000-000000000010', '81000000-0000-4000-8000-000000000031', 'exclude', 'Synthetic review', '81000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000002', true);
select throws_ok($$select public.remove_archived_course('81000000-0000-4000-8000-000000000030')$$, 'Only the Scholarship Chair may remove an archived course', 'ordinary member cannot remove an archived course');
select throws_ok($$delete from public.courses where id = '81000000-0000-4000-8000-000000000030'$$, '42501', null, 'authenticated users cannot bypass the audited removal RPC');

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
select is(public.remove_archived_course('81000000-0000-4000-8000-000000000031'), 'has_history', 'Chair cannot remove a course with academic review history');
select ok(exists(select 1 from public.courses where id = '81000000-0000-4000-8000-000000000031'), 'historical course remains archived');
select throws_ok($$select public.remove_archived_course('81000000-0000-4000-8000-000000000032')$$, 'Archived course was not found', 'active course cannot be permanently removed');
select is(public.remove_archived_course('81000000-0000-4000-8000-000000000030'), 'deleted', 'Chair can remove an unused archived course');
select is((select count(*) from public.courses where id = '81000000-0000-4000-8000-000000000030'), 0::bigint, 'unused course is deleted');
select is((select count(*) from public.audit_log where action = 'archived_course_removed' and entity_id = '81000000-0000-4000-8000-000000000030'), 1::bigint, 'course removal is audited');
select ok(exists(select 1 from public.courses where id = '81000000-0000-4000-8000-000000000032'), 'active course remains unchanged');

select * from finish();
rollback;
