-- Diagnostic observations, NOT passing acceptance tests. All fixtures roll back.
begin;
set local role postgres;
set local search_path = public, extensions;
do $$ begin
  if current_database() not in ('sigma_nu_audit_20260921', 'sigma_nu_audit_replay_20260921') then raise exception 'Isolated audit database required'; end if;
end $$;

insert into auth.users(id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
values ('a5000000-0000-4000-8000-000000000001', 'academic-member@example.test', '{}', '{"full_name":"Academic Member"}', 'authenticated', 'authenticated');
insert into public.chapters(id, fraternity_name, chapter_name, institution_name, initialized_at)
values ('a5000000-0000-4000-8000-000000000010', 'Sigma Nu', 'Academic Test', 'Test University', now());
insert into public.members(id, chapter_id, profile_id, full_name, status)
values ('a5000000-0000-4000-8000-000000000011', 'a5000000-0000-4000-8000-000000000010', 'a5000000-0000-4000-8000-000000000001', 'Academic Member', 'active');
insert into public.member_roles(chapter_id, member_id, role)
values ('a5000000-0000-4000-8000-000000000010', 'a5000000-0000-4000-8000-000000000011', 'member');
insert into public.chapter_settings(chapter_id) values ('a5000000-0000-4000-8000-000000000010');
insert into public.semesters(id, chapter_id, name, start_date, end_date, default_deadline_weekday, default_deadline_time, active)
values ('a5000000-0000-4000-8000-000000000020', 'a5000000-0000-4000-8000-000000000010', 'Academic Test Semester', current_date - 14, current_date + 60, 5, '23:59', true);
insert into public.academic_weeks(id, chapter_id, semester_id, sequence_number, label, starts_on, ends_on, deadline_at)
values ('a5000000-0000-4000-8000-000000000021', 'a5000000-0000-4000-8000-000000000010', 'a5000000-0000-4000-8000-000000000020', 1, 'Academic Week', current_date - 3, current_date + 3, now() + interval '3 days');
insert into public.courses(id, chapter_id, member_id, semester_id, name, credit_hours, grading_type)
values
  ('a5000000-0000-4000-8000-000000000031', 'a5000000-0000-4000-8000-000000000010', 'a5000000-0000-4000-8000-000000000011', 'a5000000-0000-4000-8000-000000000020', 'Calculus', 3, 'percentage'),
  ('a5000000-0000-4000-8000-000000000032', 'a5000000-0000-4000-8000-000000000010', 'a5000000-0000-4000-8000-000000000011', 'a5000000-0000-4000-8000-000000000020', 'History', 1, 'letter'),
  ('a5000000-0000-4000-8000-000000000033', 'a5000000-0000-4000-8000-000000000010', 'a5000000-0000-4000-8000-000000000011', 'a5000000-0000-4000-8000-000000000020', 'Seminar', 2, 'pass_fail');


insert into public.study_hour_rule_sets(id,chapter_id,version,active)
values ('a5000000-0000-4000-8000-000000000040','a5000000-0000-4000-8000-000000000010',1,true);
insert into public.study_hour_bands(rule_set_id,minimum_gpa,maximum_gpa,base_hours,sort_order)
values ('a5000000-0000-4000-8000-000000000040',3.50,4,1,1),
  ('a5000000-0000-4000-8000-000000000040',null,3.49,3,2);
insert into public.member_roles(chapter_id,member_id,role) values
 ('a5000000-0000-4000-8000-000000000010','a5000000-0000-4000-8000-000000000011','scholarship_chair'),
 ('a5000000-0000-4000-8000-000000000010','a5000000-0000-4000-8000-000000000011','proctor');
insert into public.academic_weeks(id,chapter_id,semester_id,sequence_number,label,starts_on,ends_on,deadline_at)
values ('a5000000-0000-4000-8000-000000000022','a5000000-0000-4000-8000-000000000010','a5000000-0000-4000-8000-000000000020',2,'Synthetic Future',current_date+4,current_date+10,now()+interval '9 days'),
 ('a5000000-0000-4000-8000-000000000023','a5000000-0000-4000-8000-000000000010','a5000000-0000-4000-8000-000000000020',3,'Synthetic Historical',current_date-10,current_date-4,now()-interval '5 days');
set local role authenticated;
select set_config('request.jwt.claim.sub','a5000000-0000-4000-8000-000000000001',true);
do $$ begin
 perform public.submit_weekly_checkin('a5000000-0000-4000-8000-000000000021','[{"courseId":"a5000000-0000-4000-8000-000000000031","value":95},{"courseId":"a5000000-0000-4000-8000-000000000032","value":"B"},{"courseId":"a5000000-0000-4000-8000-000000000033","value":"Pass"}]');
 perform public.freeze_study_hour_assignment((select id from public.study_hour_assignments where week_id='a5000000-0000-4000-8000-000000000021'));
 perform public.submit_weekly_checkin('a5000000-0000-4000-8000-000000000021','[{"courseId":"a5000000-0000-4000-8000-000000000031","value":80},{"courseId":"a5000000-0000-4000-8000-000000000032","value":"C"},{"courseId":"a5000000-0000-4000-8000-000000000033","value":"Pass"}]');
 perform public.submit_weekly_checkin('a5000000-0000-4000-8000-000000000021','[{"courseId":"a5000000-0000-4000-8000-000000000031","value":95},{"courseId":"a5000000-0000-4000-8000-000000000032","value":"B"},{"courseId":"a5000000-0000-4000-8000-000000000033","value":"Pass"}]');
end $$;
select 'stale_frozen_proposal' as probe, final_hours, proposed_hours, state from public.study_hour_assignments;
do $$ begin
 perform public.submit_weekly_checkin('a5000000-0000-4000-8000-000000000022','[{"courseId":"a5000000-0000-4000-8000-000000000031","value":60},{"courseId":"a5000000-0000-4000-8000-000000000032","value":"D"},{"courseId":"a5000000-0000-4000-8000-000000000033","value":"Pass"}]');
end $$;
select 'future_week_accepted' as probe, count(*) as submissions from public.grade_submissions where week_id='a5000000-0000-4000-8000-000000000022';
select 'cross_week_percentage_alerts' as probe, count(*) as alerts from public.academic_alerts a join public.grade_submissions s on s.id=a.submission_id where s.week_id='a5000000-0000-4000-8000-000000000022';
set local role postgres;
update public.courses set archived_at=now() where grading_type<>'pass_fail';
set local role authenticated;
do $$ begin perform public.submit_weekly_checkin('a5000000-0000-4000-8000-000000000021','[{"courseId":"a5000000-0000-4000-8000-000000000033","value":"Pass"}]'); end $$;
select 'null_gpa_keeps_old_assignment' as probe, s.estimated_gpa_snapshot, a.estimated_gpa_used, a.final_hours
from public.grade_submissions s join public.study_hour_assignments a using(member_id,week_id)
where s.is_current and s.week_id='a5000000-0000-4000-8000-000000000021';
set local role postgres;
update public.member_roles set active=false where role='scholarship_chair';
set local role authenticated;
do $$ begin perform public.record_study_session('a5000000-0000-4000-8000-000000000011','a5000000-0000-4000-8000-000000000023',current_date-7,60,'Synthetic old-date probe'); end $$;
select 'proctor_old_week_insert_accepted' as probe, count(*) as sessions from public.study_sessions;
rollback;
