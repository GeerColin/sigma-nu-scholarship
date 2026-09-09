begin;
set local role postgres;
set local search_path = public, extensions;
select plan(13);

insert into auth.users(id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
values ('20000000-0000-4000-8000-000000000001', 'academic-member@example.test', '{}', '{"full_name":"Academic Member"}', 'authenticated', 'authenticated');
insert into public.chapters(id, fraternity_name, chapter_name, institution_name, initialized_at)
values ('20000000-0000-4000-8000-000000000010', 'Sigma Nu', 'Academic Test', 'Test University', now());
insert into public.members(id, chapter_id, profile_id, full_name, status)
values ('20000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000001', 'Academic Member', 'active');
insert into public.member_roles(chapter_id, member_id, role)
values ('20000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000011', 'member');
insert into public.chapter_settings(chapter_id) values ('20000000-0000-4000-8000-000000000010');
insert into public.semesters(id, chapter_id, name, start_date, end_date, default_deadline_weekday, default_deadline_time, active)
values ('20000000-0000-4000-8000-000000000020', '20000000-0000-4000-8000-000000000010', 'Academic Test Semester', current_date - 14, current_date + 60, 5, '23:59', true);
insert into public.academic_weeks(id, chapter_id, semester_id, sequence_number, label, starts_on, ends_on, deadline_at)
values ('20000000-0000-4000-8000-000000000021', '20000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000020', 1, 'Academic Week', current_date - 3, current_date + 3, now() + interval '3 days');
insert into public.courses(id, chapter_id, member_id, semester_id, name, credit_hours, grading_type)
values
  ('20000000-0000-4000-8000-000000000031', '20000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000020', 'Calculus', 3, 'percentage'),
  ('20000000-0000-4000-8000-000000000032', '20000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000020', 'History', 1, 'letter'),
  ('20000000-0000-4000-8000-000000000033', '20000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000020', 'Seminar', 2, 'pass_fail');

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);

select throws_ok(
  $$insert into public.courses(chapter_id, member_id, semester_id, name, credit_hours, grading_type) values ('20000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000020', 'Bypass', 3, 'letter')$$,
  '42501', null, 'member cannot bypass trusted course creation'
);
select lives_ok(
  $$select public.create_member_course('Custom Lab', 1, 'custom', 'Satisfactory or incomplete')$$,
  'member can create a validated course through the trusted function'
);
select is((select count(*)::integer from public.courses where name = 'Custom Lab' and archived_at is null), 1, 'created course is visible to its owner');
select lives_ok(
  $$select public.archive_member_course((select id from public.courses where name = 'Custom Lab'))$$,
  'member can archive their active course'
);
select is((select count(*)::integer from public.courses where name = 'Custom Lab' and archived_at is not null), 1, 'archived course is retained');

select lives_ok(
  $$select public.submit_weekly_checkin('20000000-0000-4000-8000-000000000021', '[{"courseId":"20000000-0000-4000-8000-000000000031","value":95},{"courseId":"20000000-0000-4000-8000-000000000032","value":"B"},{"courseId":"20000000-0000-4000-8000-000000000033","value":"Pass"}]')$$,
  'member can create the first immutable weekly submission'
);
select is((select estimated_gpa_snapshot from public.grade_submissions where revision_number = 1), 3.75::numeric, 'server calculates credit-weighted GPA and excludes Pass/Fail');
select is((select original_timing::text from public.grade_submissions where revision_number = 1), 'on_time', 'server snapshots original on-time status');

select lives_ok(
  $$select public.submit_weekly_checkin('20000000-0000-4000-8000-000000000021', '[{"courseId":"20000000-0000-4000-8000-000000000031","value":80},{"courseId":"20000000-0000-4000-8000-000000000032","value":"C"},{"courseId":"20000000-0000-4000-8000-000000000033","value":"Pass"}]')$$,
  'member can append a weekly revision'
);
select is((select count(*)::integer from public.grade_submissions), 2, 'both submission revisions are retained');
select is((select count(*)::integer from public.grade_submissions where is_current), 1, 'only the latest revision is current');
set local role postgres;
select is((select count(*)::integer from public.academic_alerts where chapter_id = '20000000-0000-4000-8000-000000000010'), 1, 'significant percentage decrease creates an academic alert');

update public.courses set credit_hours = 4 where id = '20000000-0000-4000-8000-000000000031';
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
select is((select e.credit_hours_snapshot from public.grade_entries e join public.grade_submissions s on s.id = e.submission_id where s.revision_number = 1 and e.course_id = '20000000-0000-4000-8000-000000000031'), 3.00::numeric, 'historical credit-hour snapshot survives later course correction');

select * from finish();
rollback;
