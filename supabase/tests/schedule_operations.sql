begin;
set local role postgres;
set local search_path = public, extensions;
select plan(23);

insert into auth.users(id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('96000000-0000-4000-8000-000000000001', 'schedule-chair@example.test', '{}', '{"full_name":"Schedule Chair"}', 'authenticated', 'authenticated'),
  ('96000000-0000-4000-8000-000000000002', 'schedule-proctor@example.test', '{}', '{"full_name":"Schedule Proctor"}', 'authenticated', 'authenticated'),
  ('96000000-0000-4000-8000-000000000003', 'schedule-member@example.test', '{}', '{"full_name":"Schedule Member"}', 'authenticated', 'authenticated'),
  ('96000000-0000-4000-8000-000000000004', 'unassigned-proctor@example.test', '{}', '{"full_name":"Unassigned Proctor"}', 'authenticated', 'authenticated'),
  ('96000000-0000-4000-8000-000000000005', 'pending-schedule@example.test', '{}', '{"full_name":"Pending Schedule"}', 'authenticated', 'authenticated'),
  ('96000000-0000-4000-8000-000000000006', 'other-chapter-schedule@example.test', '{}', '{"full_name":"Other Chapter Schedule"}', 'authenticated', 'authenticated');
insert into public.chapters(id, fraternity_name, chapter_name, institution_name, initialized_at)
values
  ('96000000-0000-4000-8000-000000000010', 'Sigma Nu', 'Schedule Test', 'Test University', now()),
  ('96000000-0000-4000-8000-000000000011', 'Sigma Nu', 'Other Schedule Test', 'Other University', now());
insert into public.members(id, chapter_id, profile_id, full_name, status)
values
  ('96000000-0000-4000-8000-000000000020', '96000000-0000-4000-8000-000000000010', '96000000-0000-4000-8000-000000000001', 'Schedule Chair', 'active'),
  ('96000000-0000-4000-8000-000000000021', '96000000-0000-4000-8000-000000000010', '96000000-0000-4000-8000-000000000002', 'Schedule Proctor', 'active'),
  ('96000000-0000-4000-8000-000000000022', '96000000-0000-4000-8000-000000000010', '96000000-0000-4000-8000-000000000003', 'Schedule Member', 'active'),
  ('96000000-0000-4000-8000-000000000023', '96000000-0000-4000-8000-000000000010', '96000000-0000-4000-8000-000000000004', 'Unassigned Proctor', 'active'),
  ('96000000-0000-4000-8000-000000000024', '96000000-0000-4000-8000-000000000011', '96000000-0000-4000-8000-000000000006', 'Other Chapter Schedule', 'active');
insert into public.member_roles(chapter_id, member_id, role)
values
  ('96000000-0000-4000-8000-000000000010', '96000000-0000-4000-8000-000000000020', 'member'),
  ('96000000-0000-4000-8000-000000000010', '96000000-0000-4000-8000-000000000020', 'scholarship_chair'),
  ('96000000-0000-4000-8000-000000000010', '96000000-0000-4000-8000-000000000021', 'member'),
  ('96000000-0000-4000-8000-000000000010', '96000000-0000-4000-8000-000000000021', 'proctor'),
  ('96000000-0000-4000-8000-000000000010', '96000000-0000-4000-8000-000000000022', 'member'),
  ('96000000-0000-4000-8000-000000000010', '96000000-0000-4000-8000-000000000023', 'member'),
  ('96000000-0000-4000-8000-000000000010', '96000000-0000-4000-8000-000000000023', 'proctor'),
  ('96000000-0000-4000-8000-000000000011', '96000000-0000-4000-8000-000000000024', 'member');
insert into public.semesters(id, chapter_id, name, start_date, end_date, default_deadline_weekday, default_deadline_time, timezone, active)
values
  ('96000000-0000-4000-8000-000000000030', '96000000-0000-4000-8000-000000000010', 'Schedule Semester', current_date - 14, current_date + 28, 5, '23:59', 'America/New_York', true),
  ('96000000-0000-4000-8000-000000000031', '96000000-0000-4000-8000-000000000011', 'Other Semester', current_date - 14, current_date + 28, 5, '23:59', 'America/New_York', true);

set local role authenticated;
select set_config('request.jwt.claim.sub', '96000000-0000-4000-8000-000000000001', true);
select lives_ok($$select public.create_study_schedule_series(
  '96000000-0000-4000-8000-000000000030', extract(dow from current_date)::smallint,
  '18:00', '19:30', 'Chapter Room', 'Bring your weekly study plan',
  array['96000000-0000-4000-8000-000000000021']::uuid[]
)$$, 'Chair can create a recurring schedule series');
select ok((select count(*) >= 5 from public.study_schedule_occurrences where series_id = (select id from public.study_schedule_series limit 1)), 'recurring series creates dated occurrences');
select ok((select count(*) >= 5 from public.study_schedule_occurrence_proctors where proctor_member_id = '96000000-0000-4000-8000-000000000021'), 'recurring assignments are copied to occurrences');

select set_config('request.jwt.claim.sub', '96000000-0000-4000-8000-000000000003', true);
select ok((select count(*) >= 5 from public.list_study_schedule_occurrences('96000000-0000-4000-8000-000000000030', current_date - 14, current_date + 28)), 'approved member can read complete schedule');
select throws_ok($$select count(*) from public.list_study_schedule_occurrences('96000000-0000-4000-8000-000000000031', current_date - 14, current_date + 28)$$, 'P0001', 'Active semester was not found', 'member cannot read another chapter schedule');

select set_config('request.jwt.claim.sub', '96000000-0000-4000-8000-000000000005', true);
select throws_ok($$select count(*) from public.list_study_schedule_occurrences('96000000-0000-4000-8000-000000000030', current_date - 14, current_date + 28)$$, 'P0001', 'Not authorized', 'pending account cannot read schedule');

select set_config('request.jwt.claim.sub', '96000000-0000-4000-8000-000000000002', true);
select lives_ok($$select public.update_study_schedule_occurrence_by_proctor(
  (select id from public.study_schedule_occurrences where session_date = current_date limit 1),
  '18:30', '20:00', 'Library Room'
)$$, 'assigned Proctor can edit one occurrence');
select is((select count(*) from public.study_schedule_exceptions where source = 'proctor'), 1::bigint, 'Proctor edit creates one dated exception');
select set_config('request.jwt.claim.sub', '96000000-0000-4000-8000-000000000001', true);
select is((select count(*) from public.study_schedule_notifications), 1::bigint, 'Proctor edit creates one Chair notification');
select set_config('request.jwt.claim.sub', '96000000-0000-4000-8000-000000000002', true);
select is(public.update_study_schedule_occurrence_by_proctor(
  (select id from public.study_schedule_occurrences where session_date = current_date limit 1),
  '18:30', '20:00', 'Library Room'
), false, 'unchanged Proctor save creates no duplicate change');
select set_config('request.jwt.claim.sub', '96000000-0000-4000-8000-000000000001', true);
select is((select count(*) from public.study_schedule_notifications), 1::bigint, 'unchanged Proctor save creates no notification');

select set_config('request.jwt.claim.sub', '96000000-0000-4000-8000-000000000004', true);
select throws_ok($$select public.update_study_schedule_occurrence_by_proctor(
  (select id from public.study_schedule_occurrences where session_date = current_date limit 1),
  '18:45', '20:15', 'Other Room'
)$$, 'P0001', 'You are not assigned to this scheduled session', 'unassigned Proctor cannot edit occurrence');

select set_config('request.jwt.claim.sub', '96000000-0000-4000-8000-000000000001', true);
select lives_ok($$select public.update_study_schedule_series(
  (select id from public.study_schedule_series limit 1), extract(dow from current_date)::smallint,
  '17:00', '18:30', 'Updated Chapter Room', 'Updated instructions',
  array['96000000-0000-4000-8000-000000000021']::uuid[]
)$$, 'Chair can update recurring pattern and assignments');
select is((select location from public.study_schedule_exceptions where occurrence_id = (select id from public.study_schedule_occurrences where session_date = current_date limit 1)), 'Library Room', 'dated Proctor exception survives recurring edit');
select is((select location from public.study_schedule_occurrences where session_date = current_date + 7 limit 1), 'Updated Chapter Room', 'future occurrence follows recurring edit');
select is((select start_time from public.study_schedule_occurrences where session_date = current_date - 7 limit 1), '18:00'::time, 'past occurrence preserves historical pattern');

select lives_ok($$select public.manage_study_schedule_occurrence(
  (select id from public.study_schedule_occurrences where session_date = current_date + 7 limit 1),
  'cancel', null, null, null, null, 'Synthetic chapter event'
)$$, 'Chair can cancel a dated occurrence');
select ok((select cancelled from public.list_study_schedule_occurrences('96000000-0000-4000-8000-000000000030', current_date + 7, current_date + 7) limit 1), 'cancelled occurrence is visible as cancelled');
select lives_ok($$select public.manage_study_schedule_occurrence(
  (select id from public.study_schedule_occurrences where session_date = current_date + 7 limit 1),
  'restore'
)$$, 'Chair can restore a future exception');

select lives_ok($$select public.mark_study_schedule_notification_read((select id from public.study_schedule_notifications limit 1))$$, 'Chair can mark schedule notification read');
select ok((select read_at is not null from public.study_schedule_notifications limit 1), 'schedule notification records read state');
select lives_ok($$select public.remove_study_schedule_series((select id from public.study_schedule_series limit 1), 'Synthetic schedule replacement')$$, 'Chair can remove a recurring series');
select ok((select count(*) > 0 from public.study_schedule_exceptions where kind = 'cancel' and reason = 'Synthetic schedule replacement'), 'series removal preserves future dates as explicit cancellations');

select * from finish();
rollback;
