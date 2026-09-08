begin;
set local role postgres;
set local search_path = public, extensions;
select plan(7);

insert into auth.users(id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
values ('80000000-0000-4000-8000-000000000001', 'course-member@example.test', '{}', '{"full_name":"Course Member"}', 'authenticated', 'authenticated');
insert into public.chapters(id, fraternity_name, chapter_name, institution_name, initialized_at)
values ('80000000-0000-4000-8000-000000000010', 'Sigma Nu', 'Course Test', 'Test University', now());
insert into public.members(id, chapter_id, profile_id, full_name, status)
values ('80000000-0000-4000-8000-000000000011', '80000000-0000-4000-8000-000000000010', '80000000-0000-4000-8000-000000000001', 'Course Member', 'active');
insert into public.member_roles(chapter_id, member_id, role)
values ('80000000-0000-4000-8000-000000000010', '80000000-0000-4000-8000-000000000011', 'member');
insert into public.semesters(id, chapter_id, name, start_date, end_date, default_deadline_weekday, default_deadline_time, timezone, active)
values ('80000000-0000-4000-8000-000000000020', '80000000-0000-4000-8000-000000000010', 'Course Semester', current_date - 7, current_date + 7, 5, '23:59', 'America/New_York', true);
insert into public.academic_weeks(id, chapter_id, semester_id, sequence_number, label, starts_on, ends_on, deadline_at)
values ('80000000-0000-4000-8000-000000000021', '80000000-0000-4000-8000-000000000010', '80000000-0000-4000-8000-000000000020', 1, 'Current Week', current_date - 3, current_date + 3, now() + interval '2 days');

set local role authenticated;
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000001', true);
select lives_ok($$select public.create_member_course_configured('Synthetic Calculus', 4, 'percentage', null, 93, 85, 77, 70)$$, 'member can create a percentage course with a course-specific scale');
select isnt((select grading_scale_id from public.courses where name = 'Synthetic Calculus'), null::uuid, 'course-specific scale is linked');
select lives_ok($$select public.submit_weekly_checkin('80000000-0000-4000-8000-000000000021', jsonb_build_array(jsonb_build_object('courseId', (select id from public.courses where name = 'Synthetic Calculus'), 'value', 91)))$$, 'member can submit using the custom scale');
select is((select letter_equivalent from public.grade_entries limit 1), 'B', 'custom scale determines the snapshot letter');
select lives_ok($$select public.update_member_course((select id from public.courses where name = 'Synthetic Calculus'), 'Synthetic Calculus II', 3, 'percentage', null, null, null, null, null)$$, 'member can edit current course configuration');
select is((select name || ':' || credit_hours::text from public.courses limit 1), 'Synthetic Calculus II:3.00', 'current course reflects the edit');
select is((select course_name_snapshot || ':' || credit_hours_snapshot::text from public.grade_entries limit 1), 'Synthetic Calculus:4.00', 'historical grade snapshot remains unchanged');

select * from finish();
rollback;

