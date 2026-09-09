begin;
set local role postgres;
set local search_path = public, extensions;
select plan(16);

insert into auth.users(id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
values ('92000000-0000-4000-8000-000000000001', 'delivery-chair@example.test', '{}', '{"full_name":"Delivery Chair"}', 'authenticated', 'authenticated');
insert into public.chapters(id, fraternity_name, chapter_name, institution_name, initialized_at)
values ('92000000-0000-4000-8000-000000000010', 'Sigma Nu', 'Delivery Chapter', 'Test University', now());
insert into public.members(id, chapter_id, profile_id, full_name, status)
values ('92000000-0000-4000-8000-000000000011', '92000000-0000-4000-8000-000000000010', '92000000-0000-4000-8000-000000000001', 'Delivery Chair', 'active');
insert into public.member_roles(chapter_id, member_id, role)
values
  ('92000000-0000-4000-8000-000000000010', '92000000-0000-4000-8000-000000000011', 'member'),
  ('92000000-0000-4000-8000-000000000010', '92000000-0000-4000-8000-000000000011', 'scholarship_chair');
insert into public.email_batches(id, chapter_id, batch_type, state, created_by)
values ('92000000-0000-4000-8000-000000000020', '92000000-0000-4000-8000-000000000010', 'synthetic_delivery', 'sending', '92000000-0000-4000-8000-000000000001');
insert into public.email_messages(id, chapter_id, batch_id, recipient_email, recipient_name, message_type, final_subject, final_body, state, idempotency_key)
values ('92000000-0000-4000-8000-000000000021', '92000000-0000-4000-8000-000000000010', '92000000-0000-4000-8000-000000000020', 'recipient@example.test', 'Synthetic Recipient', 'synthetic_delivery', 'Exact subject', 'Exact body', 'queued', '92000000-0000-4000-8000-000000000022');

select ok(not has_function_privilege('authenticated', 'public.record_email_delivery_event(text,text,text,jsonb,timestamptz)', 'EXECUTE'), 'authenticated users cannot call the privileged webhook recorder');
select ok(has_function_privilege('service_role', 'public.record_email_delivery_event(text,text,text,jsonb,timestamptz)', 'EXECUTE'), 'service role may call the narrowly scoped webhook recorder');

set local role authenticated;
select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000001', true);
select lives_ok($$select public.record_email_send_result_v2('92000000-0000-4000-8000-000000000021', '', false, 'transport_error')$$, 'a transport failure is recorded');
select is((select state::text from public.email_messages where id = '92000000-0000-4000-8000-000000000021'), 'failed', 'failed send enters failed state');
select is((select send_attempt_count from public.email_messages where id = '92000000-0000-4000-8000-000000000021'), 1, 'failed attempt is counted');
select is((select state::text from public.email_batches where id = '92000000-0000-4000-8000-000000000020'), 'partial_failure', 'batch records partial failure');
select lives_ok($$select public.begin_email_batch_retry('92000000-0000-4000-8000-000000000020')$$, 'failed messages can be queued for retry');
select is((select final_subject || '|' || final_body from public.email_messages where id = '92000000-0000-4000-8000-000000000021'), 'Exact subject|Exact body', 'retry preserves the approved exact message body');
select is((select idempotency_key from public.email_messages where id = '92000000-0000-4000-8000-000000000021'), '92000000-0000-4000-8000-000000000022'::uuid, 'retry preserves the provider idempotency key');
select lives_ok($$select public.record_email_send_result_v2('92000000-0000-4000-8000-000000000021', 'provider-synthetic-1', true, '')$$, 'successful retry is recorded');
select is((select send_attempt_count from public.email_messages where id = '92000000-0000-4000-8000-000000000021'), 2, 'successful retry increments the attempt count');

set local role service_role;
select is(public.record_email_delivery_event('event-synthetic-1', 'email.delivered', 'provider-synthetic-1', '{"synthetic":true}'::jsonb, now()), 'recorded', 'verified provider delivery is recorded');
select is((select state::text from public.email_messages where id = '92000000-0000-4000-8000-000000000021'), 'delivered', 'delivery event advances message state');
select is(public.record_email_delivery_event('event-synthetic-1', 'email.delivered', 'provider-synthetic-1', '{"synthetic":true}'::jsonb, now()), 'duplicate', 'replayed provider event is idempotent');
select is((select count(*)::integer from public.email_delivery_events where provider_event_id = 'event-synthetic-1'), 1, 'duplicate webhook creates only one delivery record');
select is(public.record_email_delivery_event('event-synthetic-2', 'email.bounced', 'provider-synthetic-1', '{"synthetic":true}'::jsonb, now()), 'recorded', 'later bounce event is recorded');

select * from finish();
rollback;
