begin;
set local role postgres;
set local search_path = public, extensions;
select plan(15);

insert into auth.users(id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('60000000-0000-4000-8000-000000000001', 'chair-account@example.test', '{}', '{"full_name":"Synthetic Chair"}', 'authenticated', 'authenticated'),
  ('60000000-0000-4000-8000-000000000002', 'applicant@example.test', '{}', '{"full_name":"Synthetic Applicant"}', 'authenticated', 'authenticated');

insert into public.chapters(id, fraternity_name, chapter_name, institution_name, initialized_at)
values ('60000000-0000-4000-8000-000000000010', 'Sigma Nu', 'Synthetic Chapter', 'Test University', now());

insert into public.members(id, chapter_id, profile_id, full_name, status)
values
  ('60000000-0000-4000-8000-000000000011', '60000000-0000-4000-8000-000000000010', '60000000-0000-4000-8000-000000000001', 'Synthetic Chair', 'active'),
  ('60000000-0000-4000-8000-000000000012', '60000000-0000-4000-8000-000000000010', null, 'Synthetic Applicant', 'active');

insert into public.member_roles(chapter_id, member_id, role)
values
  ('60000000-0000-4000-8000-000000000010', '60000000-0000-4000-8000-000000000011', 'member'),
  ('60000000-0000-4000-8000-000000000010', '60000000-0000-4000-8000-000000000011', 'scholarship_chair'),
  ('60000000-0000-4000-8000-000000000010', '60000000-0000-4000-8000-000000000012', 'member');

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.chapters), 0, 'unapproved account cannot read a chapter');
select is((select count(*)::integer from public.members), 0, 'unapproved account cannot read the roster');
select lives_ok($$
  insert into public.access_requests(id, profile_id, requested_name, authenticated_name, authenticated_email)
  values ('60000000-0000-4000-8000-000000000020', '60000000-0000-4000-8000-000000000002', 'Synthetic Applicant', 'Synthetic Applicant', 'applicant@example.test')
$$, 'unapproved account can submit its own access request');

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer from public.access_requests where status = 'pending'), 1, 'Chair can view the pending request');
select lives_ok($$select public.approve_access_request('60000000-0000-4000-8000-000000000020', '60000000-0000-4000-8000-000000000012')$$, 'Chair can approve and link an account');
select is((select profile_id from public.members where id = '60000000-0000-4000-8000-000000000012'), '60000000-0000-4000-8000-000000000002'::uuid, 'approval links the authenticated profile');
select is((select count(*)::integer from public.audit_log where action = 'account_link_approved'), 1, 'approval is audited');

select lives_ok($$select public.disconnect_member_account('60000000-0000-4000-8000-000000000012', 'Synthetic correction')$$, 'Chair can disconnect a non-Chair account');
select is((select profile_id from public.members where id = '60000000-0000-4000-8000-000000000012'), null::uuid, 'disconnection removes only the profile link');
select is((select count(*)::integer from public.audit_log where action = 'account_disconnected'), 1, 'disconnection is audited');

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);
select lives_ok($$
  insert into public.access_requests(id, profile_id, requested_name, authenticated_name, authenticated_email)
  values ('60000000-0000-4000-8000-000000000021', '60000000-0000-4000-8000-000000000002', 'Synthetic Applicant', 'Synthetic Applicant', 'applicant@example.test')
$$, 'disconnected account can request reconnection');

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
select lives_ok($$select public.reject_access_request('60000000-0000-4000-8000-000000000021', 'Synthetic mismatch')$$, 'Chair can reject a pending request');
select is((select rejection_reason from public.access_requests where id = '60000000-0000-4000-8000-000000000021'), 'Synthetic mismatch', 'rejection reason is retained');
select is((select count(*)::integer from public.audit_log where action = 'account_link_rejected'), 1, 'rejection is audited');

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);
select lives_ok($$
  insert into public.access_requests(id, profile_id, requested_name, authenticated_name, authenticated_email)
  values ('60000000-0000-4000-8000-000000000022', '60000000-0000-4000-8000-000000000002', 'Synthetic Applicant', 'Synthetic Applicant', 'applicant@example.test')
$$, 'a rejected account can submit a later request');

select * from finish();
rollback;
