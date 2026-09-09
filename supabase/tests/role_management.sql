begin;
set local role postgres;
set local search_path = public, extensions;
select plan(9);

insert into auth.users(id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('91000000-0000-4000-8000-000000000001', 'role-chair@example.test', '{}', '{"full_name":"Role Chair"}', 'authenticated', 'authenticated'),
  ('91000000-0000-4000-8000-000000000002', 'role-admin@example.test', '{}', '{"full_name":"Role Admin"}', 'authenticated', 'authenticated'),
  ('91000000-0000-4000-8000-000000000003', 'role-target@example.test', '{}', '{"full_name":"Role Target"}', 'authenticated', 'authenticated');
insert into public.chapters(id, fraternity_name, chapter_name, institution_name, initialized_at)
values ('91000000-0000-4000-8000-000000000010', 'Sigma Nu', 'Role Chapter', 'Test University', now());
insert into public.members(id, chapter_id, profile_id, full_name, status)
values
  ('91000000-0000-4000-8000-000000000011', '91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000001', 'Role Chair', 'active'),
  ('91000000-0000-4000-8000-000000000012', '91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000002', 'Role Admin', 'active'),
  ('91000000-0000-4000-8000-000000000013', '91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000003', 'Role Target', 'active'),
  ('91000000-0000-4000-8000-000000000014', '91000000-0000-4000-8000-000000000010', null, 'Unlinked Target', 'active'),
  ('91000000-0000-4000-8000-000000000015', '91000000-0000-4000-8000-000000000010', null, 'Inactive Target', 'inactive');
insert into public.member_roles(chapter_id, member_id, role)
values
  ('91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000011', 'member'),
  ('91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000011', 'scholarship_chair'),
  ('91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000012', 'member'),
  ('91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000012', 'admin'),
  ('91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000013', 'member'),
  ('91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000014', 'member'),
  ('91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000015', 'member');

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
select lives_ok($$select public.manage_member_role('91000000-0000-4000-8000-000000000013', 'admin', true)$$, 'Chair can grant Admin to an eligible member');
select ok(public.has_chapter_role('scholarship_chair'), 'granting Admin does not replace or demote the Chair');
select lives_ok($$select public.manage_member_role('91000000-0000-4000-8000-000000000013', 'admin', false)$$, 'Chair can remove Admin');
select throws_ok($$select public.manage_member_role('91000000-0000-4000-8000-000000000014', 'proctor', true)$$, 'Operational roles require an active member with a connected account', 'unlinked member cannot receive Proctor');
select throws_ok($$select public.manage_member_role('91000000-0000-4000-8000-000000000015', 'admin', true)$$, 'Operational roles require an active member with a connected account', 'inactive member cannot receive Admin');

select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000002', true);
select lives_ok($$select public.manage_member_role('91000000-0000-4000-8000-000000000013', 'proctor', true)$$, 'Admin can grant Proctor to an eligible member');
select throws_ok($$select public.manage_member_role('91000000-0000-4000-8000-000000000013', 'admin', true)$$, 'Only the Scholarship Chair manages Admins', 'Admin cannot grant Admin');
select throws_ok($$select public.manage_member_role('91000000-0000-4000-8000-000000000011', 'scholarship_chair', false)$$, 'This role cannot be changed here', 'Admin cannot demote the Chair');
select is((select count(*)::integer from public.audit_log where action in ('role_assigned', 'role_removed')), 3, 'successful role changes are audited');

select * from finish();
rollback;
