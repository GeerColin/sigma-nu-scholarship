begin;

alter table public.members
  add column notification_email text;

alter table public.members
  add constraint members_notification_email_format
  check (
    notification_email is null
    or notification_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  );

create unique index members_chapter_notification_email_unique
  on public.members(chapter_id, lower(notification_email))
  where notification_email is not null;

alter table public.email_messages
  add column template_context jsonb not null default '{}'::jsonb;

create or replace function public.review_custom_grading(
  target_course_id uuid,
  selected_treatment public.custom_grading_treatment,
  review_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chapter_id uuid := public.current_chapter_id();
  v_course public.courses%rowtype;
  v_review_id uuid;
begin
  if v_chapter_id is null or not public.is_admin_or_chair() then
    raise exception 'Not authorized';
  end if;
  if nullif(trim(review_reason), '') is null then
    raise exception 'A review reason is required';
  end if;
  if selected_treatment not in ('exclude', 'pass_fail') then
    raise exception 'This workflow supports exclusion or Pass/Fail treatment';
  end if;

  select * into v_course
  from public.courses
  where id = target_course_id
    and chapter_id = v_chapter_id
    and grading_type = 'custom'
    and archived_at is null;

  if v_course.id is null then
    raise exception 'Active Custom/Other course was not found';
  end if;

  insert into public.custom_grading_reviews(
    chapter_id,
    course_id,
    treatment,
    reason,
    reviewed_by
  )
  values (
    v_chapter_id,
    target_course_id,
    selected_treatment,
    trim(review_reason),
    auth.uid()
  )
  returning id into v_review_id;

  insert into public.audit_log(
    chapter_id,
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    after_state,
    reason
  )
  values (
    v_chapter_id,
    auth.uid(),
    'custom_grading_reviewed',
    'custom_grading_review',
    v_review_id::text,
    jsonb_build_object(
      'course_id', target_course_id,
      'treatment', selected_treatment
    ),
    trim(review_reason)
  );

  return v_review_id;
end;
$$;

create or replace function public.acknowledge_academic_alert(
  target_alert_id uuid,
  acknowledgement_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chapter_id uuid := public.current_chapter_id();
  v_alert public.academic_alerts%rowtype;
begin
  if v_chapter_id is null or not public.is_admin_or_chair() then
    raise exception 'Not authorized';
  end if;
  if nullif(trim(acknowledgement_reason), '') is null then
    raise exception 'An acknowledgment note is required';
  end if;

  select * into v_alert
  from public.academic_alerts
  where id = target_alert_id and chapter_id = v_chapter_id
  for update;

  if v_alert.id is null then
    raise exception 'Academic alert was not found';
  end if;
  if v_alert.acknowledged_at is not null then
    raise exception 'Academic alert was already acknowledged';
  end if;

  update public.academic_alerts
  set acknowledged_at = now(), acknowledged_by = auth.uid()
  where id = target_alert_id;

  insert into public.audit_log(
    chapter_id,
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    before_state,
    after_state,
    reason
  )
  values (
    v_chapter_id,
    auth.uid(),
    'academic_alert_acknowledged',
    'academic_alert',
    target_alert_id::text,
    jsonb_build_object('acknowledged_at', null),
    jsonb_build_object('acknowledged_at', now()),
    trim(acknowledgement_reason)
  );
end;
$$;

create or replace function public.prepare_email_batch(
  target_week_id uuid,
  requested_batch_type text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chapter_id uuid := public.current_chapter_id();
  v_week public.academic_weeks%rowtype;
  v_semester public.semesters%rowtype;
  v_batch_id uuid;
  v_recipient_count integer := 0;
  v_chair record;
  v_alert record;
begin
  if v_chapter_id is null or not public.is_admin_or_chair() then
    raise exception 'Not authorized';
  end if;
  if requested_batch_type not in (
    'missing_grade_reminder',
    'study_hour_assignment',
    'academic_alert'
  ) then
    raise exception 'Unsupported email batch type';
  end if;

  select * into v_week
  from public.academic_weeks
  where id = target_week_id and chapter_id = v_chapter_id;
  if v_week.id is null then
    raise exception 'Academic week was not found';
  end if;

  select * into v_semester
  from public.semesters
  where id = v_week.semester_id and chapter_id = v_chapter_id;

  insert into public.email_batches(
    chapter_id,
    week_id,
    batch_type,
    created_by
  )
  values (
    v_chapter_id,
    target_week_id,
    requested_batch_type,
    auth.uid()
  )
  returning id into v_batch_id;

  if requested_batch_type = 'missing_grade_reminder' then
    insert into public.email_messages(
      chapter_id,
      batch_id,
      member_id,
      recipient_email,
      recipient_name,
      message_type,
      final_subject,
      final_body,
      template_context
    )
    select
      v_chapter_id,
      v_batch_id,
      members.id,
      members.notification_email,
      members.full_name,
      requested_batch_type,
      v_semester.name || ' ' || v_week.label || ' grade reminder',
      'Hello ' || members.full_name || E',\n\nYour weekly scholarship check-in for ' || v_week.label ||
        ' is missing. Please submit it even if the deadline has passed. Detailed grades are not included in this reminder.',
      jsonb_build_object(
        'memberName', members.full_name,
        'semesterName', v_semester.name,
        'weekLabel', v_week.label,
        'deadline', to_char(v_week.deadline_at at time zone v_semester.timezone, 'FMMonth DD, YYYY at HH12:MI AM')
      )
    from public.members members
    where members.chapter_id = v_chapter_id
      and members.status = 'active'
      and members.notification_email is not null
      and not exists (
        select 1
        from public.grade_submissions submissions
        where submissions.member_id = members.id
          and submissions.week_id = target_week_id
          and submissions.is_current
      );
  elsif requested_batch_type = 'study_hour_assignment' then
    insert into public.email_messages(
      chapter_id,
      batch_id,
      member_id,
      recipient_email,
      recipient_name,
      message_type,
      final_subject,
      final_body,
      template_context
    )
    select
      v_chapter_id,
      v_batch_id,
      members.id,
      members.notification_email,
      members.full_name,
      requested_batch_type,
      v_week.label || ' study-hour assignment',
      'Hello ' || members.full_name || E',\n\nYour ' || v_week.label || ' study-hour requirement is ' ||
        assignments.final_hours || ' hours. Completed: ' ||
        rtrim(to_char(coalesce(sum(sessions.duration_minutes), 0) / 60.0, 'FM999990.99'), '.') ||
        ' hours. Remaining: ' ||
        rtrim(to_char(greatest(assignments.final_hours - coalesce(sum(sessions.duration_minutes), 0) / 60.0, 0), 'FM999990.99'), '.') ||
        ' hours.',
      jsonb_build_object(
        'memberName', members.full_name,
        'semesterName', v_semester.name,
        'weekLabel', v_week.label,
        'requiredHours', assignments.final_hours,
        'completedHours', rtrim(to_char(coalesce(sum(sessions.duration_minutes), 0) / 60.0, 'FM999990.99'), '.'),
        'remainingHours', rtrim(to_char(greatest(assignments.final_hours - coalesce(sum(sessions.duration_minutes), 0) / 60.0, 0), 'FM999990.99'), '.'),
        'deadline', to_char(v_week.deadline_at at time zone v_semester.timezone, 'FMMonth DD, YYYY at HH12:MI AM')
      )
    from public.study_hour_assignments assignments
    join public.members members on members.id = assignments.member_id
    left join public.study_sessions sessions
      on sessions.member_id = assignments.member_id
      and sessions.week_id = assignments.week_id
      and sessions.voided_at is null
    where assignments.chapter_id = v_chapter_id
      and assignments.week_id = target_week_id
      and members.status = 'active'
      and members.notification_email is not null
    group by members.id, assignments.id;
  else
    select
      profiles.email,
      coalesce(profiles.display_name, members.full_name) as display_name
    into v_chair
    from public.member_roles roles
    join public.members members on members.id = roles.member_id
    join public.profiles profiles on profiles.id = members.profile_id
    where roles.chapter_id = v_chapter_id
      and roles.role = 'scholarship_chair'
      and roles.active
    limit 1;

    if v_chair.email is not null then
      for v_alert in
        select alerts.id, members.full_name
        from public.academic_alerts alerts
        join public.grade_submissions submissions on submissions.id = alerts.submission_id
        join public.members members on members.id = alerts.member_id
        where alerts.chapter_id = v_chapter_id
          and submissions.week_id = target_week_id
          and alerts.acknowledged_at is null
      loop
        insert into public.email_messages(
          chapter_id,
          batch_id,
          member_id,
          recipient_email,
          recipient_name,
          message_type,
          final_subject,
          final_body,
          template_context
        )
        values (
          v_chapter_id,
          v_batch_id,
          null,
          v_chair.email,
          v_chair.display_name,
          requested_batch_type,
          'Academic alert requires review',
          'An academic alert for ' || v_alert.full_name || ' in ' || v_week.label ||
            ' requires review in the secure scholarship dashboard. Detailed grades are intentionally omitted from this email.',
          jsonb_build_object(
            'memberName', v_alert.full_name,
            'semesterName', v_semester.name,
            'weekLabel', v_week.label
          )
        );
      end loop;
    end if;
  end if;

  select count(*) into v_recipient_count
  from public.email_messages
  where batch_id = v_batch_id;

  if v_recipient_count = 0 then
    delete from public.email_batches where id = v_batch_id;
    raise exception 'No eligible email recipients were found';
  end if;

  insert into public.audit_log(
    chapter_id,
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    after_state
  )
  values (
    v_chapter_id,
    auth.uid(),
    'email_batch_prepared',
    'email_batch',
    v_batch_id::text,
    jsonb_build_object(
      'batch_type', requested_batch_type,
      'week_id', target_week_id,
      'recipient_count', v_recipient_count
    )
  );

  return v_batch_id;
end;
$$;

create or replace function public.replace_email_batch_messages(
  target_batch_id uuid,
  message_updates jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chapter_id uuid := public.current_chapter_id();
  v_batch public.email_batches%rowtype;
  v_item jsonb;
  v_updated integer := 0;
begin
  if v_chapter_id is null or not public.is_admin_or_chair() then
    raise exception 'Not authorized';
  end if;
  if jsonb_typeof(message_updates) <> 'array' or jsonb_array_length(message_updates) = 0 then
    raise exception 'At least one message update is required';
  end if;

  select * into v_batch
  from public.email_batches
  where id = target_batch_id and chapter_id = v_chapter_id
  for update;
  if v_batch.id is null or v_batch.state <> 'draft' then
    raise exception 'Only a draft email batch can be edited';
  end if;

  for v_item in select value from jsonb_array_elements(message_updates)
  loop
    if nullif(trim(v_item ->> 'subject'), '') is null
      or nullif(trim(v_item ->> 'body'), '') is null
      or char_length(v_item ->> 'subject') > 200
      or char_length(v_item ->> 'body') > 20000 then
      raise exception 'Email content is invalid';
    end if;

    update public.email_messages
    set
      final_subject = trim(v_item ->> 'subject'),
      final_body = trim(v_item ->> 'body'),
      updated_at = now()
    where id = (v_item ->> 'id')::uuid
      and batch_id = target_batch_id
      and chapter_id = v_chapter_id
      and state = 'draft';

    if not found then
      raise exception 'Prepared email was not found';
    end if;
    v_updated := v_updated + 1;
  end loop;

  insert into public.audit_log(
    chapter_id,
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    after_state
  )
  values (
    v_chapter_id,
    auth.uid(),
    'email_batch_edited',
    'email_batch',
    target_batch_id::text,
    jsonb_build_object('message_count', v_updated)
  );

  return v_updated;
end;
$$;

create or replace function public.update_email_message(
  target_message_id uuid,
  new_subject text,
  new_body text,
  is_selected boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chapter_id uuid := public.current_chapter_id();
  v_message public.email_messages%rowtype;
  v_batch public.email_batches%rowtype;
begin
  if v_chapter_id is null or not public.is_admin_or_chair() then
    raise exception 'Not authorized';
  end if;
  if nullif(trim(new_subject), '') is null
    or nullif(trim(new_body), '') is null
    or char_length(new_subject) > 200
    or char_length(new_body) > 20000 then
    raise exception 'Email content is invalid';
  end if;

  select messages.* into v_message
  from public.email_messages messages
  where messages.id = target_message_id and messages.chapter_id = v_chapter_id
  for update;
  if v_message.id is null then
    raise exception 'Prepared email was not found';
  end if;

  select * into v_batch
  from public.email_batches
  where id = v_message.batch_id and chapter_id = v_chapter_id
  for update;
  if v_batch.id is null or v_batch.state <> 'draft' or v_message.state <> 'draft' then
    raise exception 'Only a draft email can be edited';
  end if;

  update public.email_messages
  set
    final_subject = trim(new_subject),
    final_body = trim(new_body),
    selected = is_selected,
    updated_at = now()
  where id = target_message_id;

  insert into public.audit_log(
    chapter_id,
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    before_state,
    after_state
  )
  values (
    v_chapter_id,
    auth.uid(),
    'email_message_edited',
    'email_message',
    target_message_id::text,
    jsonb_build_object('selected', v_message.selected),
    jsonb_build_object('selected', is_selected)
  );
end;
$$;

create or replace function public.approve_email_batch(target_batch_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chapter_id uuid := public.current_chapter_id();
  v_batch public.email_batches%rowtype;
begin
  if v_chapter_id is null or not public.is_admin_or_chair() then
    raise exception 'Not authorized';
  end if;
  select * into v_batch
  from public.email_batches
  where id = target_batch_id and chapter_id = v_chapter_id
  for update;
  if v_batch.id is null or v_batch.state <> 'draft' then
    raise exception 'Only a draft email batch can be approved';
  end if;
  if not exists (
    select 1 from public.email_messages
    where batch_id = target_batch_id and selected and state = 'draft'
  ) then
    raise exception 'Select at least one email before approval';
  end if;

  update public.email_batches
  set state = 'approved', approved_by = auth.uid(), approved_at = now(), updated_at = now()
  where id = target_batch_id;

  insert into public.audit_log(
    chapter_id,
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    after_state
  )
  values (
    v_chapter_id,
    auth.uid(),
    'email_batch_approved',
    'email_batch',
    target_batch_id::text,
    jsonb_build_object('state', 'approved')
  );
end;
$$;

create or replace function public.begin_email_batch_send(target_batch_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chapter_id uuid := public.current_chapter_id();
  v_count integer;
begin
  if v_chapter_id is null or not public.is_admin_or_chair() then
    raise exception 'Not authorized';
  end if;

  update public.email_batches
  set state = 'sending', updated_at = now()
  where id = target_batch_id
    and chapter_id = v_chapter_id
    and state = 'approved';
  if not found then
    raise exception 'Approved email batch was not found';
  end if;

  update public.email_messages
  set state = 'queued', updated_at = now()
  where batch_id = target_batch_id and selected and state = 'draft';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.record_email_send_result(
  target_message_id uuid,
  provider_id text,
  succeeded boolean
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
  where id = target_message_id
    and chapter_id = v_chapter_id
    and selected
    and state = 'queued'
  for update;
  if v_message.id is null then
    raise exception 'Queued email was not found';
  end if;

  update public.email_messages
  set
    state = case when succeeded then 'sent'::public.email_message_state else 'failed'::public.email_message_state end,
    provider_message_id = case when succeeded then nullif(trim(provider_id), '') else null end,
    sent_at = case when succeeded then now() else null end,
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
    set
      state = case when v_failed > 0 then 'partial_failure'::public.email_batch_state else 'completed'::public.email_batch_state end,
      updated_at = now()
    where id = v_message.batch_id;
  end if;

  insert into public.audit_log(
    chapter_id,
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    after_state
  )
  values (
    v_chapter_id,
    auth.uid(),
    case when succeeded then 'email_message_sent' else 'email_message_failed' end,
    'email_message',
    target_message_id::text,
    jsonb_build_object('batch_id', v_message.batch_id, 'state', case when succeeded then 'sent' else 'failed' end)
  );
end;
$$;

revoke all on function public.review_custom_grading(uuid, public.custom_grading_treatment, text) from public;
revoke all on function public.acknowledge_academic_alert(uuid, text) from public;
revoke all on function public.prepare_email_batch(uuid, text) from public;
revoke all on function public.replace_email_batch_messages(uuid, jsonb) from public;
revoke all on function public.update_email_message(uuid, text, text, boolean) from public;
revoke all on function public.approve_email_batch(uuid) from public;
revoke all on function public.begin_email_batch_send(uuid) from public;
revoke all on function public.record_email_send_result(uuid, text, boolean) from public;

grant execute on function public.review_custom_grading(uuid, public.custom_grading_treatment, text) to authenticated;
grant execute on function public.acknowledge_academic_alert(uuid, text) to authenticated;
grant execute on function public.prepare_email_batch(uuid, text) to authenticated;
grant execute on function public.replace_email_batch_messages(uuid, jsonb) to authenticated;
grant execute on function public.update_email_message(uuid, text, text, boolean) to authenticated;
grant execute on function public.approve_email_batch(uuid) to authenticated;
grant execute on function public.begin_email_batch_send(uuid) to authenticated;
grant execute on function public.record_email_send_result(uuid, text, boolean) to authenticated;

commit;
