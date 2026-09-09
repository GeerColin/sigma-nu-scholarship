begin;
set local role postgres;
set local search_path = public, extensions;
select plan(38);

insert into auth.users(id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('81000000-0000-4000-8000-000000000001', 'workflow-chair@example.test', '{}', '{"full_name":"Synthetic Workflow Chair"}', 'authenticated', 'authenticated'),
  ('81000000-0000-4000-8000-000000000002', 'workflow-member@example.test', '{}', '{"full_name":"Synthetic Workflow Member"}', 'authenticated', 'authenticated'),
  ('81000000-0000-4000-8000-000000000003', 'workflow-proctor@example.test', '{}', '{"full_name":"Synthetic Workflow Proctor"}', 'authenticated', 'authenticated');

insert into public.chapters(id, fraternity_name, chapter_name, institution_name, initialized_at)
values ('81000000-0000-4000-8000-000000000010', 'Synthetic Fraternity', 'Workflow Test Chapter', 'Example Test University', now());

insert into public.members(id, chapter_id, profile_id, full_name, notification_email, status)
values
  ('81000000-0000-4000-8000-000000000011', '81000000-0000-4000-8000-000000000010', '81000000-0000-4000-8000-000000000001', 'Synthetic Workflow Chair', null, 'active'),
  ('81000000-0000-4000-8000-000000000012', '81000000-0000-4000-8000-000000000010', '81000000-0000-4000-8000-000000000002', 'Synthetic Workflow Member', 'workflow-member@example.test', 'active'),
  ('81000000-0000-4000-8000-000000000013', '81000000-0000-4000-8000-000000000010', '81000000-0000-4000-8000-000000000003', 'Synthetic Workflow Proctor', null, 'active'),
  ('81000000-0000-4000-8000-000000000014', '81000000-0000-4000-8000-000000000010', null, 'Synthetic Missing Member', 'workflow-missing@example.test', 'active');

insert into public.member_roles(chapter_id, member_id, role)
values
  ('81000000-0000-4000-8000-000000000010', '81000000-0000-4000-8000-000000000011', 'member'),
  ('81000000-0000-4000-8000-000000000010', '81000000-0000-4000-8000-000000000011', 'scholarship_chair'),
  ('81000000-0000-4000-8000-000000000010', '81000000-0000-4000-8000-000000000012', 'member'),
  ('81000000-0000-4000-8000-000000000010', '81000000-0000-4000-8000-000000000013', 'member'),
  ('81000000-0000-4000-8000-000000000010', '81000000-0000-4000-8000-000000000013', 'proctor'),
  ('81000000-0000-4000-8000-000000000010', '81000000-0000-4000-8000-000000000014', 'member');

insert into public.chapter_settings(chapter_id, percentage_alert_drop)
values ('81000000-0000-4000-8000-000000000010', 10);

insert into public.semesters(id, chapter_id, name, start_date, end_date, default_deadline_weekday, default_deadline_time, active)
values ('81000000-0000-4000-8000-000000000020', '81000000-0000-4000-8000-000000000010', 'Synthetic Workflow Semester', current_date - 14, current_date + 30, 5, '23:59', true);

insert into public.academic_weeks(id, chapter_id, semester_id, sequence_number, label, starts_on, ends_on, deadline_at)
values
  ('81000000-0000-4000-8000-000000000021', '81000000-0000-4000-8000-000000000010', '81000000-0000-4000-8000-000000000020', 1, 'Synthetic Week 1', current_date - 10, current_date - 4, now() - interval '5 days'),
  ('81000000-0000-4000-8000-000000000022', '81000000-0000-4000-8000-000000000010', '81000000-0000-4000-8000-000000000020', 2, 'Synthetic Week 2', current_date - 3, current_date + 3, now() + interval '2 days');

insert into public.courses(id, chapter_id, member_id, semester_id, name, credit_hours, grading_type, custom_grading_description)
values
  ('81000000-0000-4000-8000-000000000031', '81000000-0000-4000-8000-000000000010', '81000000-0000-4000-8000-000000000012', '81000000-0000-4000-8000-000000000020', 'Synthetic Percentage', 3, 'percentage', null),
  ('81000000-0000-4000-8000-000000000032', '81000000-0000-4000-8000-000000000010', '81000000-0000-4000-8000-000000000012', '81000000-0000-4000-8000-000000000020', 'Synthetic Letter', 1, 'letter', null),
  ('81000000-0000-4000-8000-000000000033', '81000000-0000-4000-8000-000000000010', '81000000-0000-4000-8000-000000000012', '81000000-0000-4000-8000-000000000020', 'Synthetic Pass Fail', 2, 'pass_fail', null),
  ('81000000-0000-4000-8000-000000000034', '81000000-0000-4000-8000-000000000010', '81000000-0000-4000-8000-000000000012', '81000000-0000-4000-8000-000000000020', 'Synthetic Satisfactory Standing', 1, 'custom', 'Satisfactory / Unsatisfactory');

insert into public.study_hour_rule_sets(id, chapter_id, version, d_adjustment_hours, f_adjustment_hours, maximum_hours, active, created_by)
values ('81000000-0000-4000-8000-000000000040', '81000000-0000-4000-8000-000000000010', 1, 1, 2, 5, true, '81000000-0000-4000-8000-000000000001');

insert into public.study_hour_bands(rule_set_id, minimum_gpa, maximum_gpa, base_hours, sort_order)
values
  ('81000000-0000-4000-8000-000000000040', 3.50, 4.00, 0, 1),
  ('81000000-0000-4000-8000-000000000040', 3.00, 3.49, 1, 2),
  ('81000000-0000-4000-8000-000000000040', 2.75, 2.99, 2, 3),
  ('81000000-0000-4000-8000-000000000040', 2.50, 2.74, 2, 4),
  ('81000000-0000-4000-8000-000000000040', 2.25, 2.49, 3, 5),
  ('81000000-0000-4000-8000-000000000040', 2.00, 2.24, 4, 6),
  ('81000000-0000-4000-8000-000000000040', null, 1.99, 5, 7);

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000002', true);

select lives_ok(
  $$select public.submit_weekly_checkin('81000000-0000-4000-8000-000000000022', '[{"courseId":"81000000-0000-4000-8000-000000000031","value":88},{"courseId":"81000000-0000-4000-8000-000000000032","value":"D"},{"courseId":"81000000-0000-4000-8000-000000000033","value":"Pass"},{"courseId":"81000000-0000-4000-8000-000000000034","value":"Satisfactory"}]')$$,
  'member submits the connected weekly check-in'
);
select is((select estimated_gpa_snapshot from public.grade_submissions where member_id = '81000000-0000-4000-8000-000000000012'), 2.50::numeric, 'GPA is credit weighted');
select is((select included_course_count from public.grade_submissions where member_id = '81000000-0000-4000-8000-000000000012'), 2, 'Pass/Fail and Custom/Other are excluded');
select is((select final_hours from public.study_hour_assignments where member_id = '81000000-0000-4000-8000-000000000012'), 3, 'study hours include the D adjustment');

select throws_ok(
  $$select public.review_custom_grading('81000000-0000-4000-8000-000000000034', 'exclude', 'Unauthorized review')$$,
  'P0001', 'Not authorized', 'member cannot review Custom/Other grading'
);

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$select public.review_custom_grading('81000000-0000-4000-8000-000000000034', 'pass_fail', 'Satisfactory standing is approved as Pass/Fail')$$,
  'Chair records the Custom/Other decision'
);
select is((select treatment::text from public.custom_grading_reviews where course_id = '81000000-0000-4000-8000-000000000034'), 'pass_fail', 'Custom/Other treatment persists');
select is((select count(*)::integer from public.audit_log where action = 'custom_grading_reviewed'), 1, 'Custom/Other review is audited');

select lives_ok(
  $$select public.override_study_hour_assignment((select id from public.study_hour_assignments where member_id = '81000000-0000-4000-8000-000000000012'), 4, 'Synthetic override test')$$,
  'Chair overrides the calculated requirement'
);
select is((select final_hours from public.study_hour_assignments where member_id = '81000000-0000-4000-8000-000000000012'), 4, 'final requirement uses the override');
select is((select automatic_hours from public.study_hour_assignments where member_id = '81000000-0000-4000-8000-000000000012'), 3, 'automatic requirement is preserved');
select lives_ok(
  $$select public.remove_study_hour_override((select id from public.study_hour_assignments where member_id = '81000000-0000-4000-8000-000000000012'), 'Restore synthetic calculation')$$,
  'Chair removes the override'
);
select is((select final_hours from public.study_hour_assignments where member_id = '81000000-0000-4000-8000-000000000012'), 3, 'removing override restores calculated hours');

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000003', true);
select lives_ok(
  $$select public.record_study_session('81000000-0000-4000-8000-000000000012', '81000000-0000-4000-8000-000000000022', current_date, 60, 'Synthetic session one')$$,
  'Proctor records the first session'
);
select lives_ok(
  $$select public.record_study_session('81000000-0000-4000-8000-000000000012', '81000000-0000-4000-8000-000000000022', current_date, 90, 'Synthetic session two')$$,
  'Proctor records the second session'
);
select is((select sum(duration_minutes)::integer from public.study_sessions where member_id = '81000000-0000-4000-8000-000000000012'), 150, 'completed time is stored as 150 integer minutes');
select is(180 - (select sum(duration_minutes)::integer from public.study_sessions where member_id = '81000000-0000-4000-8000-000000000012'), 30, 'three required hours leave thirty minutes remaining');

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$select public.prepare_email_batch('81000000-0000-4000-8000-000000000022', 'study_hour_assignment')$$,
  'Chair prepares a persistent study-hour batch'
);
select ok(
  position('Completed: 2.5 hours' in (select final_body from public.email_messages where message_type = 'study_hour_assignment')) > 0,
  'study-hour email preserves fractional completed hours'
);
select ok(
  position('Remaining: 0.5 hours' in (select final_body from public.email_messages where message_type = 'study_hour_assignment')) > 0,
  'study-hour email preserves fractional remaining hours'
);
select ok(
  not exists (
    select 1 from public.email_messages
    where message_type = 'study_hour_assignment'
      and final_body ~ E'\\m1 hours\\M'
  ),
  'study-hour emails use singular grammar for one hour'
);

set local role postgres;
insert into public.academic_alerts(id, chapter_id, member_id, course_id, submission_id, alert_type, details)
select '81000000-0000-4000-8000-000000000050', chapter_id, member_id, '81000000-0000-4000-8000-000000000031', id, 'percentage_drop', '{"previous":95,"current":80}'
from public.grade_submissions where member_id = '81000000-0000-4000-8000-000000000012';

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000002', true);
select throws_ok(
  $$select public.acknowledge_academic_alert('81000000-0000-4000-8000-000000000050', 'Unauthorized acknowledgment')$$,
  'P0001', 'Not authorized', 'member cannot acknowledge an alert'
);

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$select public.prepare_email_batch('81000000-0000-4000-8000-000000000022', 'missing_grade_reminder')$$,
  'Chair prepares a persistent missing-grade batch'
);
select is((select count(*)::integer from public.email_messages where message_type = 'missing_grade_reminder'), 1, 'only the eligible missing member is selected');
select ok(position('95' in (select final_body from public.email_messages where message_type = 'missing_grade_reminder')) = 0, 'missing reminder does not expose detailed grades');

select lives_ok(
  $$select public.replace_email_batch_messages((select id from public.email_batches where batch_type = 'missing_grade_reminder'), jsonb_build_array(jsonb_build_object('id', (select id from public.email_messages where message_type = 'missing_grade_reminder'), 'subject', 'Synthetic batch edit', 'body', 'Synthetic body edit')))$$,
  'Chair edits the whole draft batch'
);
select is((select final_subject from public.email_messages where message_type = 'missing_grade_reminder'), 'Synthetic batch edit', 'batch edit persists');
select lives_ok(
  $$select public.update_email_message((select id from public.email_messages where message_type = 'missing_grade_reminder'), 'Synthetic individual edit', 'Synthetic individual body', true)$$,
  'Chair edits one recipient separately'
);
select is((select final_subject from public.email_messages where message_type = 'missing_grade_reminder'), 'Synthetic individual edit', 'individual edit does not revert');
select lives_ok(
  $$select public.approve_email_batch((select id from public.email_batches where batch_type = 'missing_grade_reminder'))$$,
  'Chair explicitly approves the batch'
);
select is((select state::text from public.email_batches where batch_type = 'missing_grade_reminder'), 'approved', 'approval does not send automatically');
select is(public.begin_email_batch_send((select id from public.email_batches where batch_type = 'missing_grade_reminder')), 1, 'approved batch queues one selected message');
select lives_ok(
  $$select public.record_email_send_result((select id from public.email_messages where message_type = 'missing_grade_reminder'), 'mock_synthetic_message', true)$$,
  'mock send result is recorded'
);
select is((select state::text from public.email_batches where batch_type = 'missing_grade_reminder'), 'completed', 'batch completes after its selected message is recorded');

select lives_ok(
  $$select public.prepare_email_batch('81000000-0000-4000-8000-000000000022', 'academic_alert')$$,
  'Chair prepares a secure academic-alert email'
);
select ok(position('95' in (select final_body from public.email_messages where message_type = 'academic_alert')) = 0, 'academic-alert email omits detailed grades');
select lives_ok(
  $$select public.acknowledge_academic_alert('81000000-0000-4000-8000-000000000050', 'Reviewed synthetic alert')$$,
  'Chair acknowledges the alert'
);
select ok((select acknowledged_at is not null from public.academic_alerts where id = '81000000-0000-4000-8000-000000000050'), 'alert acknowledgment persists');

select * from finish();
rollback;
