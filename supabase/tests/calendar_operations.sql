begin;
set local role postgres;
set local search_path = public, extensions;
select plan(10);

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

select * from finish();
rollback;

