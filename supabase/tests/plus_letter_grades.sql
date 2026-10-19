-- Synthetic-only authenticated RPC regressions; all fixtures roll back.
begin;
set local role postgres;
set local search_path = public, extensions;
select no_plan();

insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data,aud,role) values
 ('b6000000-0000-4000-8000-000000000001','synthetic-plus-member@example.invalid','{}','{"full_name":"Synthetic Plus Member"}','authenticated','authenticated'),
 ('b6000000-0000-4000-8000-000000000002','synthetic-plus-chair@example.invalid','{}','{"full_name":"Synthetic Plus Chair"}','authenticated','authenticated');
insert into public.chapters(id,fraternity_name,chapter_name,institution_name,initialized_at)
values ('b6000000-0000-4000-8000-000000000010','Synthetic Sigma Nu','Synthetic Plus Chapter','Synthetic University',now());
insert into public.members(id,chapter_id,profile_id,full_name,status) values
 ('b6000000-0000-4000-8000-000000000011','b6000000-0000-4000-8000-000000000010','b6000000-0000-4000-8000-000000000001','Synthetic Plus Member','active'),
 ('b6000000-0000-4000-8000-000000000012','b6000000-0000-4000-8000-000000000010','b6000000-0000-4000-8000-000000000002','Synthetic Plus Chair','active');
insert into public.member_roles(chapter_id,member_id,role) values
 ('b6000000-0000-4000-8000-000000000010','b6000000-0000-4000-8000-000000000011','member'),
 ('b6000000-0000-4000-8000-000000000010','b6000000-0000-4000-8000-000000000012','member'),
 ('b6000000-0000-4000-8000-000000000010','b6000000-0000-4000-8000-000000000012','scholarship_chair');
insert into public.chapter_settings(chapter_id,letter_alert_steps) values ('b6000000-0000-4000-8000-000000000010',1);
insert into public.semesters(id,chapter_id,name,start_date,end_date,default_deadline_weekday,default_deadline_time,active)
values ('b6000000-0000-4000-8000-000000000020','b6000000-0000-4000-8000-000000000010','Synthetic Plus Semester',current_date-7,current_date+30,0,'19:00',true);
insert into public.academic_weeks(id,chapter_id,semester_id,sequence_number,label,starts_on,ends_on,deadline_at)
values ('b6000000-0000-4000-8000-000000000021','b6000000-0000-4000-8000-000000000010','b6000000-0000-4000-8000-000000000020',1,'Synthetic Plus Week',current_date-3,current_date+3,now()+interval '1 day');
insert into public.courses(id,chapter_id,member_id,semester_id,name,credit_hours,grading_type) values
 ('b6000000-0000-4000-8000-000000000031','b6000000-0000-4000-8000-000000000010','b6000000-0000-4000-8000-000000000011','b6000000-0000-4000-8000-000000000020','Synthetic Three Credits',3,'letter'),
 ('b6000000-0000-4000-8000-000000000032','b6000000-0000-4000-8000-000000000010','b6000000-0000-4000-8000-000000000011','b6000000-0000-4000-8000-000000000020','Synthetic One Credit',1,'letter');
insert into public.study_hour_rule_sets(id,chapter_id,version,d_adjustment_hours,f_adjustment_hours,maximum_hours,active)
values ('b6000000-0000-4000-8000-000000000040','b6000000-0000-4000-8000-000000000010',1,1,2,5,true);
insert into public.study_hour_bands(rule_set_id,minimum_gpa,maximum_gpa,base_hours,sort_order)
values ('b6000000-0000-4000-8000-000000000040',null,4,1,1);

create function pg_temp.plus_entries(first_grade text,second_grade text) returns jsonb language sql as $$
 select jsonb_build_array(jsonb_build_object('courseId','b6000000-0000-4000-8000-000000000031','value',first_grade),jsonb_build_object('courseId','b6000000-0000-4000-8000-000000000032','value',second_grade));
$$;
create function pg_temp.plus_submit(first_grade text,second_grade text) returns uuid language sql as $$
 select public.submit_weekly_checkin('b6000000-0000-4000-8000-000000000021',pg_temp.plus_entries(first_grade,second_grade));
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub','b6000000-0000-4000-8000-000000000001',true);
select lives_ok($$select pg_temp.plus_submit('B','A')$$,'plain legacy grades still submit through authenticated RPC');
select lives_ok($$select public.submit_weekly_checkin('b6000000-0000-4000-8000-000000000021',pg_temp.plus_entries(' b+ ','A'),'Synthetic plus revision')$$,'comment RPC accepts and canonicalizes a plus-grade revision');
select is((select estimated_gpa_snapshot from public.grade_submissions where is_current),3.63::numeric,'weighted 3.625 rounds once to 3.63');
select is((select reported_value from public.grade_entries where submission_id=(select id from public.grade_submissions where is_current) and course_id='b6000000-0000-4000-8000-000000000031'),'"B+"'::jsonb,'new reported letter is stored canonically for prepopulation');
select is((select gpa_points from public.grade_entries where submission_id=(select id from public.grade_submissions where is_current) and course_id='b6000000-0000-4000-8000-000000000031'),3.5::numeric,'plus-grade point snapshot is exact');
select is((select submission_comment from public.grade_submissions where is_current),'Synthetic plus revision','comment wrapper remains intact');
select is((select estimated_gpa_snapshot from public.grade_submissions where revision_number=1),3.25::numeric,'old plain-letter GPA snapshot is not reinterpreted');
select is((select letter_equivalent from public.grade_entries where submission_id=(select id from public.grade_submissions where revision_number=1) and course_id='b6000000-0000-4000-8000-000000000031'),'B','old B stays B, never B+');
select is((select original_submitted_at from public.grade_submissions where is_current),(select original_submitted_at from public.grade_submissions where revision_number=1),'revision preserves original submission instant');

create function pg_temp.assert_plus_grade(grade text,points numeric) returns setof text language plpgsql as $$
begin
 return next lives_ok(format('select pg_temp.plus_submit(%L,%L)',grade,grade),'RPC accepts '||grade);
 return next is((select estimated_gpa_snapshot from public.grade_submissions where is_current),points,grade||' has exact GPA points');
 return next is((select letter_equivalent from public.grade_entries where submission_id=(select id from public.grade_submissions where is_current) and course_id='b6000000-0000-4000-8000-000000000031'),grade,grade||' letter-equivalent snapshot is preserved');
end;
$$;
select pg_temp.assert_plus_grade(grade,points) from (values ('A',4.0),('B+',3.5),('B',3.0),('C+',2.5),('C',2.0),('D+',1.5),('D',1.0),('F',0.0)) expected(grade,points);
select throws_ok(format('select pg_temp.plus_submit(%L,''A'')',grade),'P0001','Letter grade must be A, B+, B, C+, C, D+, D, or F','RPC rejects unsupported '||grade)
from (values ('A+'),('F+'),('A-'),('B-'),('C-'),('D-'),('F-'),('E'),('B++')) unsupported(grade);
select throws_ok($$select public.submit_weekly_checkin('b6000000-0000-4000-8000-000000000021','[{"courseId":"b6000000-0000-4000-8000-000000000031","value":3.5},{"courseId":"b6000000-0000-4000-8000-000000000032","value":"A"}]')$$,'P0001','Letter grade must be A, B+, B, C+, C, D+, D, or F','numeric grade cannot masquerade as a letter');
select is((select count(*)::integer from public.grade_submissions where is_current),1,'failed validation leaves the current revision intact');

set local role postgres;
update public.semesters set gpa_weighting='equal' where id='b6000000-0000-4000-8000-000000000020';
set local role authenticated;
select lives_ok($$select pg_temp.plus_submit('B+','A')$$,'plus grades support administrative equal-course weighting');
select is((select estimated_gpa_snapshot from public.grade_submissions where is_current),3.75::numeric,'equal-course weighting does not use credit weights');
set local role postgres;
update public.semesters set gpa_weighting='credit_hours' where id='b6000000-0000-4000-8000-000000000020';
update public.courses set credit_hours=case when id='b6000000-0000-4000-8000-000000000031' then 1.25 else 2.30 end where member_id='b6000000-0000-4000-8000-000000000011';
set local role authenticated;
select lives_ok($$select pg_temp.plus_submit('B+','A')$$,'fractional-credit contributions are accepted');
select is((select estimated_gpa_snapshot from public.grade_submissions where is_current),3.82::numeric,'individual weighted contributions are not prematurely rounded');

select lives_ok($$select pg_temp.plus_submit('D+','A')$$,'D+ submission creates a D-range adjustment');
select ok((select had_d and not had_f from public.study_hour_assignments),'D+ sets the D flag without setting F');
select is((select final_hours from public.study_hour_assignments),2,'D+ adds one hour to the synthetic one-hour base');
select throws_ok($$select public.refresh_study_hour_assignments('b6000000-0000-4000-8000-000000000021')$$,'P0001','Not authorized','ordinary member gains no Chair refresh permission');
select set_config('request.jwt.claim.sub','b6000000-0000-4000-8000-000000000002',true);
select lives_ok($$select public.refresh_study_hour_assignments('b6000000-0000-4000-8000-000000000021')$$,'Chair bulk refresh recognizes D+ as well');
select is((select final_hours from public.study_hour_assignments),2,'manual refresh retains D+ adjustment');
select set_config('request.jwt.claim.sub','b6000000-0000-4000-8000-000000000001',true);
select lives_ok($$select pg_temp.plus_submit('D+','F')$$,'D+ and F can coexist');
select ok((select had_d and had_f from public.study_hour_assignments),'D+ and F flags are both retained');
select is((select final_hours from public.study_hour_assignments),3,'strongest F adjustment wins instead of stacking D and F');

select lives_ok($$select pg_temp.plus_submit('B+','A')$$,'return to a one-hour final assignment before freezing');
select set_config('request.jwt.claim.sub','b6000000-0000-4000-8000-000000000002',true);
select lives_ok($$select public.freeze_study_hour_assignment((select id from public.study_hour_assignments))$$,'existing Chair workflow freezes the assignment');
select set_config('request.jwt.claim.sub','b6000000-0000-4000-8000-000000000001',true);
select lives_ok($$select pg_temp.plus_submit('D+','A')$$,'plus-grade revision follows frozen review workflow');
select is((select final_hours from public.study_hour_assignments),1,'frozen final requirement is never silently replaced');
select is((select proposed_hours from public.study_hour_assignments),2,'D+ proposes the changed requirement');
select is((select state::text from public.study_hour_assignments),'review_required','frozen change requires review');
set local role postgres;
update public.study_hour_rule_sets set maximum_hours=2 where id='b6000000-0000-4000-8000-000000000040';
set local role authenticated;
select lives_ok($$select pg_temp.plus_submit('D+','F')$$,'configured maximum remains authoritative for plus-grade revisions');
select is((select proposed_hours from public.study_hour_assignments),2,'configured two-hour maximum caps the otherwise three-hour proposal');
select lives_ok($$select pg_temp.plus_submit('B+','A')$$,'returning grades to the frozen final clears an obsolete proposal');
select is((select proposed_hours from public.study_hour_assignments),null::integer,'obsolete frozen proposal is cleared');
select is((select state::text from public.study_hour_assignments),'frozen','unchanged frozen requirement returns to frozen state');

select lives_ok($$select pg_temp.plus_submit('B','A')$$,'half-step revision remains valid');
set local role postgres;
select is((select count(*)::integer from public.academic_alerts where submission_id=(select id from public.grade_submissions where is_current) and alert_type='letter_drop'),0,'B+ to B does not meet a full-letter alert threshold');
set local role authenticated;
select lives_ok($$select pg_temp.plus_submit('B+','A')$$,'improving a letter grade remains valid');
select lives_ok($$select pg_temp.plus_submit('C+','A')$$,'full-step plus-grade decline remains valid');
set local role postgres;
select is((select count(*)::integer from public.academic_alerts where submission_id=(select id from public.grade_submissions where is_current) and alert_type='letter_drop'),1,'B+ to C+ triggers the existing one-step alert rule');
select is((select details->>'previous' from public.academic_alerts where submission_id=(select id from public.grade_submissions where is_current) and alert_type='letter_drop'),'B+','alert details preserve the previous plus letter');
update public.chapter_settings set letter_alert_steps=2 where chapter_id='b6000000-0000-4000-8000-000000000010';
set local role authenticated;
select lives_ok($$select pg_temp.plus_submit('D+','A')$$,'configured two-step threshold accepts a smaller decline');
set local role postgres;
select is((select count(*)::integer from public.academic_alerts where submission_id=(select id from public.grade_submissions where is_current) and alert_type='letter_drop'),0,'C+ to D+ does not meet configured two-step threshold');
set local role authenticated;

set local role postgres;
update public.courses set credit_hours=case when id='b6000000-0000-4000-8000-000000000031' then 3 else 1 end where member_id='b6000000-0000-4000-8000-000000000011';
update public.courses set grading_type='percentage' where id='b6000000-0000-4000-8000-000000000031';
set local role authenticated;
select lives_ok($$select public.submit_weekly_checkin('b6000000-0000-4000-8000-000000000021','[{"courseId":"b6000000-0000-4000-8000-000000000031","value":89.9},{"courseId":"b6000000-0000-4000-8000-000000000032","value":"A"}]')$$,'percentage path still accepts numeric values');
select is((select letter_equivalent from public.grade_entries where submission_id=(select id from public.grade_submissions where is_current) and course_id='b6000000-0000-4000-8000-000000000031'),'B','89.9 percent still converts to plain B');
select is((select gpa_points from public.grade_entries where submission_id=(select id from public.grade_submissions where is_current) and course_id='b6000000-0000-4000-8000-000000000031'),3::numeric,'percentage course still contributes 3.0 not 3.5');
set local role postgres;
insert into public.grading_scales(id,chapter_id,name,version,scale) values
 ('b6000000-0000-4000-8000-000000000050','b6000000-0000-4000-8000-000000000010','Synthetic custom percentage',1,'[{"letter":"A","minimum":93,"gradePoints":4},{"letter":"B","minimum":85,"gradePoints":3},{"letter":"C","minimum":70,"gradePoints":2},{"letter":"D","minimum":60,"gradePoints":1},{"letter":"F","minimum":0,"gradePoints":0}]');
update public.courses set grading_scale_id='b6000000-0000-4000-8000-000000000050' where id='b6000000-0000-4000-8000-000000000031';
update public.courses set grading_type='pass_fail' where id='b6000000-0000-4000-8000-000000000032';
set local role authenticated;
select lives_ok($$select public.submit_weekly_checkin('b6000000-0000-4000-8000-000000000021','[{"courseId":"b6000000-0000-4000-8000-000000000031","value":91},{"courseId":"b6000000-0000-4000-8000-000000000032","value":"Pass"}]')$$,'course-specific percentage conversion and Pass/Fail remain available');
select is((select estimated_gpa_snapshot from public.grade_submissions where is_current),3::numeric,'course-specific percentage cutoff remains B and Pass/Fail stays excluded');
set local role postgres;
update public.courses set grading_type='custom',custom_grading_description='Synthetic custom scale' where id='b6000000-0000-4000-8000-000000000032';
set local role authenticated;
select lives_ok($$select public.submit_weekly_checkin('b6000000-0000-4000-8000-000000000021','[{"courseId":"b6000000-0000-4000-8000-000000000031","value":91},{"courseId":"b6000000-0000-4000-8000-000000000032","value":"D+"}]')$$,'Custom text D+ is not treated as a Letter Grade');
select ok((select not included_in_gpa and gpa_points is null and letter_equivalent is null from public.grade_entries where submission_id=(select id from public.grade_submissions where is_current) and course_id='b6000000-0000-4000-8000-000000000032'),'Custom/Other remains excluded and does not fabricate D flags');
select is((select gpa_points from public.grade_entries where submission_id=(select id from public.grade_submissions where revision_number=2) and course_id='b6000000-0000-4000-8000-000000000031'),3.5::numeric,'later course type/weight corrections do not rewrite saved plus points');

set local role postgres;
update public.academic_weeks set deadline_at=now()-interval '1 day' where id='b6000000-0000-4000-8000-000000000021';
set local role authenticated;
select lives_ok($$select public.submit_weekly_checkin('b6000000-0000-4000-8000-000000000021','[{"courseId":"b6000000-0000-4000-8000-000000000031","value":91},{"courseId":"b6000000-0000-4000-8000-000000000032","value":"Synthetic standing"}]')$$,'revision still works after the deadline');
select is((select original_timing::text from public.grade_submissions where is_current),'on_time','original timing remains on time');
select is((select revision_timing::text from public.grade_submissions where is_current),'late','revision timing is late without changing the original');
select set_config('request.jwt.claim.sub','b6000000-0000-4000-8000-000000000099',true);
select throws_ok($$select pg_temp.plus_submit('B+','A')$$,'P0001','An approved member account is required','unlinked authenticated identity cannot submit plus grades');
set local role anon;
select throws_ok($$select public.submit_weekly_checkin('b6000000-0000-4000-8000-000000000021','[]')$$,'P0001','An approved member account is required','anonymous callers gain no submission access');

select * from finish();
rollback;
