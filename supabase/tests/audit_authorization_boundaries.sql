begin;
set local role postgres;
set local search_path = public, extensions;
select plan(15);

insert into auth.users(id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
select ('a1000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  'audit-' || n || '@example.test', '{}', '{"full_name":"Synthetic Audit Identity"}', 'authenticated', 'authenticated'
from generate_series(1, 6) n;
insert into public.chapters(id, fraternity_name, chapter_name, institution_name, initialized_at)
values ('a1000000-0000-4000-8000-000000000010', 'Synthetic', 'Audit Chapter', 'Test University', now());
insert into public.members(id, chapter_id, profile_id, full_name, status)
select ('a1000000-0000-4000-8000-' || lpad((n + 10)::text, 12, '0'))::uuid,
  'a1000000-0000-4000-8000-000000000010',
  ('a1000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  'Synthetic Audit Member ' || n, 'active'
from generate_series(1, 4) n;
insert into public.members(id, chapter_id, full_name, status)
values ('a1000000-0000-4000-8000-000000000015', 'a1000000-0000-4000-8000-000000000010', 'Synthetic Unlinked Admin', 'active');
insert into public.member_roles(chapter_id, member_id, role)
select chapter_id, id, 'member' from public.members;
insert into public.member_roles(chapter_id, member_id, role)
values
  ('a1000000-0000-4000-8000-000000000010', 'a1000000-0000-4000-8000-000000000011', 'scholarship_chair'),
  ('a1000000-0000-4000-8000-000000000010', 'a1000000-0000-4000-8000-000000000012', 'admin'),
  ('a1000000-0000-4000-8000-000000000010', 'a1000000-0000-4000-8000-000000000014', 'admin'),
  ('a1000000-0000-4000-8000-000000000010', 'a1000000-0000-4000-8000-000000000015', 'admin');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000006', true);
select lives_ok($$select public.submit_access_request('Synthetic applicant', 'Forged identity', 'forged@example.test')$$,
  'pending identity may submit a request');
select is((select authenticated_email from public.access_requests where profile_id = auth.uid()), 'audit-6@example.test',
  'approval evidence uses authenticated email, not caller-supplied identity');
select is((select authenticated_name from public.access_requests where profile_id = auth.uid()), 'Synthetic Audit Identity',
  'approval display name comes from auth metadata');

select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000003', true);
select throws_ok($$update public.members set status = 'inactive' where profile_id = auth.uid()$$,
  '42501', 'permission denied for table members', 'member cannot bypass the roster workflow with direct writes');
select throws_ok($$update public.profiles set email = 'forged@example.test' where id = auth.uid()$$,
  '42501', 'permission denied for table profiles', 'profile identity mirror is not self-editable');

select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000002', true);
select throws_ok($$update public.members set status = 'inactive' where id = 'a1000000-0000-4000-8000-000000000011'$$,
  '42501', 'permission denied for table members', 'Admin cannot deactivate the Chair directly');
select throws_ok($$update public.members set profile_id = null where id = 'a1000000-0000-4000-8000-000000000011'$$,
  '42501', 'permission denied for table members', 'Admin cannot unlink the Chair directly');
select throws_ok($$select public.disconnect_member_account('a1000000-0000-4000-8000-000000000014', 'Synthetic boundary test')$$,
  'P0001', 'Only the Scholarship Chair manages Admin account links', 'Admin cannot disconnect another Admin');
select throws_ok($$select public.approve_access_request((select id from public.access_requests where profile_id = 'a1000000-0000-4000-8000-000000000006'), 'a1000000-0000-4000-8000-000000000015')$$,
  'P0001', 'Only the Scholarship Chair manages Admin account links', 'Admin cannot confer an existing Admin identity by linking');

select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
select lives_ok($$select public.disconnect_member_account('a1000000-0000-4000-8000-000000000014', 'Synthetic boundary test')$$,
  'Chair can still disconnect an Admin through audited RPC');
select lives_ok($$select public.approve_access_request((select id from public.access_requests where profile_id = 'a1000000-0000-4000-8000-000000000006' and status = 'pending'), 'a1000000-0000-4000-8000-000000000015')$$,
  'Chair can still approve an Admin account link');

set local role postgres;
select is((select count(*)::integer from public.members m join public.member_roles r on r.member_id = m.id
  where r.role = 'scholarship_chair' and r.active and m.status = 'active' and m.profile_id is not null), 1,
  'all blocked mutations leave one active connected Chair');
select is((select count(*)::integer from public.audit_log where action = 'account_link_approved'), 1,
  'only the authorized approval writes an audit event');
select ok(not exists (
  select 1 from information_schema.table_privileges
  where table_schema = 'public' and grantee in ('anon', 'authenticated')
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'TRIGGER', 'REFERENCES')
), 'ordinary API roles cannot bypass audited RPCs with direct table writes');
select ok(has_table_privilege('service_role', 'public.email_delivery_events', 'INSERT'),
  'narrowly scoped privileged webhook access remains available');
select * from finish();
rollback;
