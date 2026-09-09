begin;
set local role postgres;
set local search_path = public, extensions;
select plan(12);

insert into auth.users(id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
values ('93000000-0000-4000-8000-000000000001', 'setup-chair@example.test', '{}', '{"full_name":"Setup Chair"}', 'authenticated', 'authenticated');
insert into public.bootstrap_tokens(id, token_hash, expires_at)
values (
  '93000000-0000-4000-8000-000000000002',
  encode(extensions.digest('synthetic-one-time-bootstrap-token', 'sha256'), 'hex'),
  now() + interval '1 hour'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$select public.bootstrap_chapter('synthetic-one-time-bootstrap-token', 'Sigma Nu', 'Setup Chapter', 'Test University', 'Setup Chair')$$,
  'valid hash-backed token bootstraps a chapter'
);
select is((select count(*)::integer from public.chapters), 1, 'bootstrap creates one chapter');
select is((select count(*)::integer from public.member_roles where active), 2, 'initial Chair receives Member and Chair roles');

set local role postgres;
select ok((select used_at is not null from public.bootstrap_tokens where id = '93000000-0000-4000-8000-000000000002'), 'bootstrap token is consumed');
set local role authenticated;
select throws_ok(
  $$select public.bootstrap_chapter('synthetic-one-time-bootstrap-token', 'Sigma Nu', 'Second Chapter', 'Test University', 'Setup Chair')$$,
  'Bootstrap token is invalid or expired',
  'consumed token cannot be reused'
);

select lives_ok($$select public.update_chapter_configuration(12.5, 2, 'Scholarship <scholarship@example.test>', 'reply@example.test')$$, 'Chair saves chapter alert and email identity settings');
select is((select percentage_alert_drop::text from public.chapter_settings), '12.50', 'percentage alert is persisted');
select is((select email_reply_to from public.chapter_settings), 'reply@example.test', 'reply-to address is persisted');
select lives_ok($$select public.save_email_template('missing_grade_reminder', 'Reminder v1', 'Reminder {{weekLabel}}', 'Hello {{memberName}}')$$, 'Chair saves a persistent template version');
select lives_ok($$select public.save_email_template('missing_grade_reminder', 'Reminder v2', 'Updated {{weekLabel}}', 'Hello {{memberName}}')$$, 'Chair creates a later template version');
select is((select version from public.email_templates where active), 2, 'only the latest template version is active');
select is((select count(*)::integer from public.audit_log where action in ('chapter_bootstrapped', 'chapter_configuration_updated', 'email_template_version_created')), 4, 'setup and configuration mutations are audited');

select * from finish();
rollback;
