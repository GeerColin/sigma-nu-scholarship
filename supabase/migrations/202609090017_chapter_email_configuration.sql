begin;

create or replace function public.update_chapter_configuration(
  percentage_drop numeric,
  letter_steps integer,
  sender_identity text,
  reply_address text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_chapter_id uuid := public.current_chapter_id();
  v_before public.chapter_settings%rowtype;
begin
  if v_chapter_id is null or not public.is_admin_or_chair() then raise exception 'Not authorized'; end if;
  if percentage_drop < 0 or percentage_drop > 100 or letter_steps < 1 or letter_steps > 12 then
    raise exception 'Alert settings are invalid';
  end if;
  if nullif(trim(sender_identity), '') is not null and sender_identity !~ '@' then raise exception 'Sender identity is invalid'; end if;
  if nullif(trim(reply_address), '') is not null and reply_address !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Reply address is invalid'; end if;
  select * into v_before from public.chapter_settings where chapter_id = v_chapter_id for update;
  insert into public.chapter_settings(chapter_id, percentage_alert_drop, letter_alert_steps, email_from, email_reply_to, updated_by, updated_at)
  values (v_chapter_id, percentage_drop, letter_steps, nullif(trim(sender_identity), ''), nullif(trim(reply_address), ''), auth.uid(), now())
  on conflict (chapter_id) do update set
    percentage_alert_drop = excluded.percentage_alert_drop,
    letter_alert_steps = excluded.letter_alert_steps,
    email_from = excluded.email_from,
    email_reply_to = excluded.email_reply_to,
    updated_by = auth.uid(),
    updated_at = now();
  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, before_state, after_state)
  values (v_chapter_id, auth.uid(), 'chapter_configuration_updated', 'chapter_settings', v_chapter_id::text,
    jsonb_build_object('percentage_alert_drop', v_before.percentage_alert_drop, 'letter_alert_steps', v_before.letter_alert_steps, 'email_from', v_before.email_from, 'email_reply_to', v_before.email_reply_to),
    jsonb_build_object('percentage_alert_drop', percentage_drop, 'letter_alert_steps', letter_steps, 'email_from', nullif(trim(sender_identity), ''), 'email_reply_to', nullif(trim(reply_address), '')));
end;
$$;

create or replace function public.save_email_template(
  requested_template_type text,
  template_name text,
  subject_template text,
  body_template text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_chapter_id uuid := public.current_chapter_id();
  v_version integer;
  v_template_id uuid;
begin
  if v_chapter_id is null or not public.is_admin_or_chair() then raise exception 'Not authorized'; end if;
  if requested_template_type not in ('missing_grade_reminder', 'study_hour_assignment', 'academic_alert') then raise exception 'Template type is invalid'; end if;
  if nullif(trim(template_name), '') is null or nullif(trim(subject_template), '') is null or nullif(trim(body_template), '') is null
    or char_length(template_name) > 120 or char_length(subject_template) > 200 or char_length(body_template) > 20000 then
    raise exception 'Template content is invalid';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_chapter_id::text || requested_template_type, 0));
  select coalesce(max(version), 0) + 1 into v_version from public.email_templates
  where chapter_id = v_chapter_id and email_templates.template_type = requested_template_type;
  update public.email_templates set active = false
  where chapter_id = v_chapter_id and email_templates.template_type = requested_template_type and active;
  insert into public.email_templates(chapter_id, template_type, name, subject_template, body_template, version, active, created_by)
  values (v_chapter_id, requested_template_type, trim(template_name), trim(subject_template), trim(body_template), v_version, true, auth.uid())
  returning id into v_template_id;
  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, after_state)
  values (v_chapter_id, auth.uid(), 'email_template_version_created', 'email_template', v_template_id::text,
    jsonb_build_object('template_type', requested_template_type, 'version', v_version));
  return v_template_id;
end;
$$;

revoke all on function public.update_chapter_configuration(numeric, integer, text, text) from public;
revoke all on function public.save_email_template(text, text, text, text) from public;
grant execute on function public.update_chapter_configuration(numeric, integer, text, text) to authenticated;
grant execute on function public.save_email_template(text, text, text, text) to authenticated;

commit;
