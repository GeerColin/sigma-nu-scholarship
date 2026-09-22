begin;
set local role postgres;
set local search_path = public, extensions;
select plan(24);

insert into auth.users(id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
values ('70000000-0000-4000-8000-000000000001', 'calendar-chair@example.test', '{}', '{"full_name":"Calendar Chair"}', 'authenticated', 'authenticated');
insert into public.chapters(id, fraternity_name, chapter_name, institution_name, initialized_at)
values ('70000000-0000-4000-8000-000000000010', 'Sigma Nu', 'Calendar Test', 'Test University', now());
insert into public.members(id, chapter_id, profile_id, full_name, status)
values ('70000000-0000-4000-8000-000000000011', '70000000-0000-4000-8000-000000000010', '70000000-0000-4000-8000-000000000001', 'Calendar Chair', 'active');
insert into public.member_roles(chapter_id, member_id, role)
values
  ('70000000-0000-4000-8000-000000000010', '70000000-0000-4000-8000-000000000011', 'member'),
  ('70000000-0000-4000-8000-000000000010', '70000000-0000-4000-8000-000000000011', 'scholarship_chair');

set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', true);
select lives_ok($$select public.create_semester_with_weeks('Fall Synthetic', '2026-08-17', '2026-09-06', 'America/New_York', 5::smallint, '23:59', true)$$, 'Chair can create a semester and deterministic weeks');
select is((select count(*)::integer from public.semesters where active), 1, 'created semester is active');
select is((select count(*)::integer from public.academic_weeks), 3, 'three complete academic weeks are generated');
select is((select starts_on from public.academic_weeks where sequence_number = 1), '2026-08-17'::date, 'first week starts on semester start');
select is((select ends_on from public.academic_weeks where sequence_number = 3), '2026-09-06'::date, 'last week ends on semester end');
select is((select deadline_at at time zone 'America/New_York' from public.academic_weeks where sequence_number = 1), '2026-08-21 23:59'::timestamp, 'deadline uses configured local weekday and time');
select lives_ok($$select public.create_semester_with_weeks('Spring Synthetic', '2027-01-11', '2027-01-17', 'America/New_York', 5::smallint, '17:00', false)$$, 'Chair can create an inactive semester without overwriting the active semester');
select is((select name from public.semesters where active), 'Fall Synthetic', 'inactive creation preserves the prior active semester');
select lives_ok($$select public.activate_semester((select id from public.semesters where name = 'Spring Synthetic'))$$, 'Chair can explicitly activate another semester');
select lives_ok($$select public.override_academic_week_deadline((select id from public.academic_weeks where semester_id = (select id from public.semesters where name = 'Spring Synthetic')), '2027-01-14', '18:30')$$, 'Chair can override a deadline inside its academic week');

select lives_ok($$select public.manage_semester((select id from public.semesters where name = 'Spring Synthetic'), 'rename', 'Corrected Spring')$$, 'Chair can correct semester name');
select lives_ok($$select public.manage_semester((select id from public.semesters where name = 'Corrected Spring'), 'archive')$$, 'Chair can archive active semester');
select is((select count(*)::integer from public.semesters where active), 0, 'archiving deactivates semester');
select throws_ok($$select public.activate_semester((select id from public.semesters where name = 'Corrected Spring'))$$, '23514', null, 'archived semester cannot become active');
select lives_ok($$select public.manage_semester((select id from public.semesters where name = 'Corrected Spring'), 'restore')$$, 'Chair can restore archived semester');
select lives_ok($$select public.manage_semester((select id from public.semesters where name = 'Corrected Spring'), 'delete')$$, 'unused semester and generated weeks can be deleted');
select is((select count(*)::integer from public.academic_weeks), 3, 'deletion preserves other semester weeks');
-- Historical fixture setup is privileged; application mutations use RPCs.
set local role postgres;
insert into public.courses(chapter_id,member_id,semester_id,name,credit_hours,grading_type)
select chapter_id, public.current_member_id(), id, 'Synthetic Protected Course', 3, 'percentage' from public.semesters where name = 'Fall Synthetic';
set local role authenticated;
select throws_ok($$select public.manage_semester((select id from public.semesters where name = 'Fall Synthetic'), 'delete')$$, '23503', null, 'course history blocks deletion');
select is((select count(*)::integer from public.academic_weeks), 3, 'failed deletion rolls back week removal');
select lives_ok($$select public.manage_semester((select id from public.semesters where name = 'Fall Synthetic'), 'archive')$$, 'semester with course history can be archived');
select is((select count(*)::integer from public.courses), 1, 'archive preserves academic records');
select throws_ok($$update public.semesters set name = 'Bypass'$$, '42501', null, 'direct writes cannot bypass audited RPC');
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000099', true);
select throws_ok($$select public.manage_semester((select id from public.semesters limit 1), 'archive')$$, 'P0001', 'Not authorized', 'unlinked account cannot manage semesters');
set local role postgres;
update public.member_roles set active = false where role = 'scholarship_chair' and member_id = '70000000-0000-4000-8000-000000000011';
insert into public.member_roles(chapter_id,member_id,role) values ('70000000-0000-4000-8000-000000000010','70000000-0000-4000-8000-000000000011','admin');
set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', true);
select throws_ok($$select public.manage_semester((select id from public.semesters limit 1), 'restore')$$, 'P0001', 'Not authorized', 'Admin cannot use Chair-only management');

select * from finish();
rollback;
