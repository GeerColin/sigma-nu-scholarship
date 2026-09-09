begin;

alter table public.email_messages
  add column send_attempt_count integer not null default 0 check (send_attempt_count >= 0),
  add column last_send_error text;

create or replace function public.record_email_send_result_v2(
  target_message_id uuid,
  provider_id text,
  succeeded boolean,
  failure_code text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chapter_id uuid := public.current_chapter_id();
  v_message public.email_messages%rowtype;
  v_pending integer;
  v_failed integer;
begin
  if v_chapter_id is null or not public.is_admin_or_chair() then
    raise exception 'Not authorized';
  end if;
  select * into v_message
  from public.email_messages
  where id = target_message_id and chapter_id = v_chapter_id and selected and state = 'queued'
  for update;
  if v_message.id is null then raise exception 'Queued email was not found'; end if;

  update public.email_messages
  set
    state = case when succeeded then 'sent'::public.email_message_state else 'failed'::public.email_message_state end,
    provider_message_id = case when succeeded then nullif(trim(provider_id), '') else provider_message_id end,
    sent_at = case when succeeded then now() else sent_at end,
    send_attempt_count = send_attempt_count + 1,
    last_send_error = case when succeeded then null else left(coalesce(nullif(trim(failure_code), ''), 'transport_error'), 100) end,
    updated_at = now()
  where id = target_message_id;

  select
    count(*) filter (where selected and state = 'queued'),
    count(*) filter (where selected and state in ('failed', 'bounced'))
  into v_pending, v_failed
  from public.email_messages
  where batch_id = v_message.batch_id;
  if v_pending = 0 then
    update public.email_batches
    set state = case when v_failed > 0 then 'partial_failure'::public.email_batch_state else 'completed'::public.email_batch_state end,
      updated_at = now()
    where id = v_message.batch_id;
  end if;

  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, after_state)
  values (v_chapter_id, auth.uid(), case when succeeded then 'email_message_sent' else 'email_message_failed' end,
    'email_message', target_message_id::text,
    jsonb_build_object('batch_id', v_message.batch_id, 'state', case when succeeded then 'sent' else 'failed' end,
      'attempt', v_message.send_attempt_count + 1));
end;
$$;

create or replace function public.begin_email_batch_retry(target_batch_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chapter_id uuid := public.current_chapter_id();
  v_count integer;
begin
  if v_chapter_id is null or not public.is_admin_or_chair() then raise exception 'Not authorized'; end if;
  update public.email_batches set state = 'sending', updated_at = now()
  where id = target_batch_id and chapter_id = v_chapter_id and state = 'partial_failure';
  if not found then raise exception 'Partially failed email batch was not found'; end if;

  update public.email_messages
  set state = 'queued', last_send_error = null, updated_at = now()
  where batch_id = target_batch_id and selected and state in ('failed', 'bounced');
  get diagnostics v_count = row_count;
  if v_count = 0 then raise exception 'No failed email messages are available to retry'; end if;

  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, after_state)
  values (v_chapter_id, auth.uid(), 'email_batch_retry_started', 'email_batch', target_batch_id::text,
    jsonb_build_object('retry_count', v_count));
  return v_count;
end;
$$;

create or replace function public.record_email_delivery_event(
  provider_event_id text,
  event_type text,
  provider_message_id text,
  event_payload jsonb,
  event_occurred_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_message public.email_messages%rowtype;
  v_inserted integer;
  v_failed integer;
begin
  if nullif(trim(provider_event_id), '') is null or nullif(trim(provider_message_id), '') is null then
    raise exception 'Provider identifiers are required';
  end if;
  select * into v_message from public.email_messages
  where email_messages.provider_message_id = record_email_delivery_event.provider_message_id
  for update;
  if v_message.id is null then return 'not_found'; end if;

  insert into public.email_delivery_events(message_id, provider_event_id, event_type, payload, occurred_at)
  values (v_message.id, trim(provider_event_id), left(trim(event_type), 100), event_payload, event_occurred_at)
  on conflict on constraint email_delivery_events_provider_event_id_key do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then return 'duplicate'; end if;

  update public.email_messages
  set
    state = case
      when event_type = 'email.delivered' then 'delivered'::public.email_message_state
      when event_type in ('email.bounced', 'email.complained', 'email.suppressed') then 'bounced'::public.email_message_state
      when event_type = 'email.failed' then 'failed'::public.email_message_state
      else state
    end,
    last_send_error = case
      when event_type in ('email.bounced', 'email.complained', 'email.suppressed', 'email.failed') then left(event_type, 100)
      when event_type = 'email.delivered' then null
      else last_send_error
    end,
    updated_at = now()
  where id = v_message.id;

  select count(*) filter (where selected and state in ('failed', 'bounced')) into v_failed
  from public.email_messages where batch_id = v_message.batch_id;
  update public.email_batches
  set state = case when v_failed > 0 then 'partial_failure'::public.email_batch_state else 'completed'::public.email_batch_state end,
    updated_at = now()
  where id = v_message.batch_id and state in ('completed', 'partial_failure');

  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, after_state)
  values (v_message.chapter_id, null, 'email_delivery_event_recorded', 'email_message', v_message.id::text,
    jsonb_build_object('provider_event_id', provider_event_id, 'event_type', event_type));
  return 'recorded';
end;
$$;

revoke all on function public.record_email_send_result_v2(uuid, text, boolean, text) from public;
revoke all on function public.begin_email_batch_retry(uuid) from public;
revoke all on function public.record_email_delivery_event(text, text, text, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.record_email_send_result_v2(uuid, text, boolean, text) to authenticated;
grant execute on function public.begin_email_batch_retry(uuid) to authenticated;
grant execute on function public.record_email_delivery_event(text, text, text, jsonb, timestamptz) to service_role;

commit;
