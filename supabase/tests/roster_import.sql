begin;
set local role postgres;
set local search_path = public, extensions;
select plan(15);

insert into auth.users(id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('90000000-0000-4000-8000-000000000001', 'import-chair@example.test', '{}', '{"full_name":"Import Chair"}', 'authenticated', 'authenticated'),
  ('90000000-0000-4000-8000-000000000002', 'import-admin@example.test', '{}', '{"full_name":"Import Admin"}', 'authenticated', 'authenticated'),
  ('90000000-0000-4000-8000-000000000003', 'import-member@example.test', '{}', '{"full_name":"Import Member"}', 'authenticated', 'authenticated'),
  ('90000000-0000-4000-8000-000000000004', 'import-proctor@example.test', '{}', '{"full_name":"Import Proctor"}', 'authenticated', 'authenticated');

insert into public.chapters(id, fraternity_name, chapter_name, institution_name, initialized_at)
values
  ('90000000-0000-4000-8000-000000000010', 'Sigma Nu', 'Import Chapter', 'Test University', now()),
  ('90000000-0000-4000-8000-000000000020', 'Sigma Nu', 'Other Chapter', 'Test University', now());

insert into public.members(id, chapter_id, profile_id, full_name, status)
values
  ('90000000-0000-4000-8000-000000000011', '90000000-0000-4000-8000-000000000010', '90000000-0000-4000-8000-000000000001', 'Import Chair', 'active'),
  ('90000000-0000-4000-8000-000000000012', '90000000-0000-4000-8000-000000000010', '90000000-0000-4000-8000-000000000002', 'Import Admin', 'active'),
  ('90000000-0000-4000-8000-000000000013', '90000000-0000-4000-8000-000000000010', '90000000-0000-4000-8000-000000000003', 'Import Member', 'active'),
  ('90000000-0000-4000-8000-000000000014', '90000000-0000-4000-8000-000000000010', '90000000-0000-4000-8000-000000000004', 'Import Proctor', 'active'),
  ('90000000-0000-4000-8000-000000000021', '90000000-0000-4000-8000-000000000020', null, 'Other Chapter Name', 'active');

insert into public.member_roles(chapter_id, member_id, role)
values
  ('90000000-0000-4000-8000-000000000010', '90000000-0000-4000-8000-000000000011', 'member'),
  ('90000000-0000-4000-8000-000000000010', '90000000-0000-4000-8000-000000000011', 'scholarship_chair'),
  ('90000000-0000-4000-8000-000000000010', '90000000-0000-4000-8000-000000000012', 'member'),
  ('90000000-0000-4000-8000-000000000010', '90000000-0000-4000-8000-000000000012', 'admin'),
  ('90000000-0000-4000-8000-000000000010', '90000000-0000-4000-8000-000000000013', 'member'),
  ('90000000-0000-4000-8000-000000000010', '90000000-0000-4000-8000-000000000014', 'member'),
  ('90000000-0000-4000-8000-000000000010', '90000000-0000-4000-8000-000000000014', 'proctor');

set local role authenticated;
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
select results_eq(
  $$select * from public.import_roster_members('[{"firstName":"  Ada  ","lastName":" Lovelace ","status":"active"},{"firstName":"Grace","lastName":"Hopper","status":"inactive"}]'::jsonb)$$,
  $$values (2, 0)$$,
  'Chair imports validated roster rows'
);
select is((select count(*)::integer from public.members where chapter_id = '90000000-0000-4000-8000-000000000010'), 6, 'two members were added to the current chapter');
select is((select full_name from public.members where full_name = 'Ada Lovelace'), 'Ada Lovelace', 'names are trimmed and normalized');
select is((select status::text from public.members where full_name = 'Grace Hopper'), 'inactive', 'explicit status is retained');
select is((select count(*)::integer from public.member_roles r join public.members m on m.id = r.member_id where m.full_name in ('Ada Lovelace', 'Grace Hopper') and r.role = 'member' and r.active), 2, 'each imported member receives the base Member role');
select is((select count(*)::integer from public.audit_log where action = 'roster_imported'), 1, 'the confirmed import is audited');

select results_eq(
  $$select * from public.import_roster_members('[{"firstName":"ada","lastName":"LOVELACE","status":"alumni"},{"firstName":"Grace","lastName":"Hopper","status":"active"}]'::jsonb)$$,
  $$values (0, 2)$$,
  'accidental re-import skips normalized duplicates'
);
select is((select count(*)::integer from public.members where chapter_id = '90000000-0000-4000-8000-000000000010'), 6, 're-import creates no duplicate records');
select is((select count(*)::integer from public.audit_log where action = 'roster_imported'), 2, 'a duplicate-only confirmed attempt is audited');

select throws_ok(
  $$select public.import_roster_members('[{"firstName":"","lastName":"Blank","status":"active"}]'::jsonb)$$,
  'Roster row contains an invalid name',
  'blank names are rejected atomically'
);
select throws_ok(
  $$select public.import_roster_members('[{"firstName":"Bad","lastName":"Status","status":"pending"}]'::jsonb)$$,
  'Roster row contains an invalid status',
  'unknown statuses are rejected atomically'
);

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000003', true);
select throws_ok(
  $$select public.import_roster_members('[{"firstName":"Blocked","lastName":"Member","status":"active"}]'::jsonb)$$,
  'Not authorized',
  'ordinary Members cannot import a roster'
);
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000004', true);
select throws_ok(
  $$select public.import_roster_members('[{"firstName":"Blocked","lastName":"Proctor","status":"active"}]'::jsonb)$$,
  'Not authorized',
  'Proctors cannot import a roster'
);

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000002', true);
select results_eq(
  $$select * from public.import_roster_members('[{"firstName":"Other Chapter","lastName":"Name","status":"alumni"}]'::jsonb)$$,
  $$values (1, 0)$$,
  'Admins may import and same-name records in another chapter do not collide'
);
set local role postgres;
select is((select count(*)::integer from public.members where chapter_id = '90000000-0000-4000-8000-000000000020'), 1, 'the import function did not insert into another chapter');

select * from finish();
rollback;
