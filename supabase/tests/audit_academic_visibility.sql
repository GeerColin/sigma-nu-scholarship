begin;
set local role postgres;
set local search_path = public, extensions;
select plan(12);

insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data,aud,role)
select ('a4000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  'synthetic-visibility-'||n||'@example.test','{}','{}','authenticated','authenticated'
from generate_series(1,5) n;
insert into public.chapters(id,fraternity_name,chapter_name,institution_name)
values ('a4000000-0000-4000-8000-000000000010','Synthetic','Visibility Test','Synthetic'),
  ('a4000000-0000-4000-8000-000000000020','Synthetic','Other Chapter','Synthetic');
insert into public.members(id,chapter_id,profile_id,full_name,status)
select ('a4000000-0000-4000-8000-'||lpad((n+10)::text,12,'0'))::uuid,
  case when n=4 then 'a4000000-0000-4000-8000-000000000020' else 'a4000000-0000-4000-8000-000000000010' end::uuid,
  ('a4000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'Synthetic Visibility '||n,'active'
from generate_series(1,4) n;
insert into public.member_roles(chapter_id,member_id,role) select chapter_id,id,'member' from public.members;
insert into public.member_roles(chapter_id,member_id,role)
values ('a4000000-0000-4000-8000-000000000010','a4000000-0000-4000-8000-000000000012','proctor'),
  ('a4000000-0000-4000-8000-000000000010','a4000000-0000-4000-8000-000000000013','scholarship_chair'),
  ('a4000000-0000-4000-8000-000000000020','a4000000-0000-4000-8000-000000000014','admin');
insert into public.semesters(id,chapter_id,name,start_date,end_date,default_deadline_weekday,default_deadline_time,active)
values ('a4000000-0000-4000-8000-000000000030','a4000000-0000-4000-8000-000000000010','Synthetic',current_date-1,current_date+7,0,'19:00',true);
insert into public.academic_weeks(id,chapter_id,semester_id,sequence_number,label,starts_on,ends_on,deadline_at)
values ('a4000000-0000-4000-8000-000000000031','a4000000-0000-4000-8000-000000000010','a4000000-0000-4000-8000-000000000030',1,'Synthetic',current_date-1,current_date+5,now()+interval '1 day');
insert into public.courses(id,chapter_id,member_id,semester_id,name,credit_hours,grading_type)
values ('a4000000-0000-4000-8000-000000000032','a4000000-0000-4000-8000-000000000010','a4000000-0000-4000-8000-000000000011','a4000000-0000-4000-8000-000000000030','Synthetic Course',3,'percentage');
insert into public.grade_submissions(id,chapter_id,member_id,week_id,revision_number,original_submitted_at,deadline_at_snapshot,original_timing,revision_timing,estimated_gpa_snapshot)
values ('a4000000-0000-4000-8000-000000000033','a4000000-0000-4000-8000-000000000010','a4000000-0000-4000-8000-000000000011','a4000000-0000-4000-8000-000000000031',1,now(),now()+interval '1 day','on_time','on_time',3);
insert into public.grade_entries(chapter_id,submission_id,course_id,course_name_snapshot,credit_hours_snapshot,grading_type_snapshot,reported_value,included_in_gpa,gpa_points,letter_equivalent)
values ('a4000000-0000-4000-8000-000000000010','a4000000-0000-4000-8000-000000000033','a4000000-0000-4000-8000-000000000032','Synthetic Course',3,'percentage','88',true,3,'B');

set local role authenticated;
select set_config('request.jwt.claim.sub','a4000000-0000-4000-8000-000000000001',true);
select is((select count(*)::integer from public.grade_entries),1,'owner can see the seeded academic row');
select is((select estimated_gpa_snapshot from public.grade_submissions),3::numeric,'owner can see their own GPA');
select set_config('request.jwt.claim.sub','a4000000-0000-4000-8000-000000000002',true);
select is((select count(*)::integer from public.grade_entries),0,'Proctor cannot see another member grade');
select is((select count(*)::integer from public.grade_submissions),0,'Proctor cannot see another member GPA');
select is((select count(*)::integer from public.courses),0,'Proctor cannot see another member course');
set local role postgres;
update public.member_roles set active=false where member_id='a4000000-0000-4000-8000-000000000012' and role='proctor';
set local role authenticated;
select is((select count(*)::integer from public.grade_entries),0,'Member cannot see another member grade');
select set_config('request.jwt.claim.sub','a4000000-0000-4000-8000-000000000003',true);
select is((select count(*)::integer from public.grade_entries),1,'same-chapter Chair can see seeded grade');
select set_config('request.jwt.claim.sub','a4000000-0000-4000-8000-000000000004',true);
select is((select count(*)::integer from public.grade_entries),0,'other-chapter Admin cannot see seeded grade');
select set_config('request.jwt.claim.sub','a4000000-0000-4000-8000-000000000005',true);
select is((select count(*)::integer from public.grade_entries),0,'pending account cannot see seeded grade');
select is((select count(*)::integer from public.grade_submissions),0,'pending account cannot see seeded GPA');
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select is((select count(*)::integer from public.grade_entries),0,'unauthenticated request cannot see seeded grade');
select is((select count(*)::integer from public.grade_submissions),0,'unauthenticated request cannot see seeded GPA');
select * from finish();
rollback;
