begin;

create or replace function public.correct_study_session(
  target_session_id uuid,
  new_session_date date,
  new_duration_minutes integer,
  new_notes text,
  reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.study_sessions%rowtype;
begin
  if not public.is_admin_or_chair() then
    raise exception 'Not authorized';
  end if;
  if nullif(trim(reason), '') is null then
    raise exception 'A reason is required';
  end if;
  if new_duration_minutes <= 0 or new_duration_minutes > 1440 then
    raise exception 'Duration must be positive integer minutes';
  end if;

  select * into v_session
  from public.study_sessions
  where id = target_session_id
    and chapter_id = public.current_chapter_id()
    and voided_at is null
  for update;
  if v_session.id is null then
    raise exception 'Session was not found';
  end if;
  if not exists (
    select 1 from public.academic_weeks
    where id = v_session.week_id
      and new_session_date between starts_on and ends_on
  ) then
    raise exception 'Session date must remain within its academic week';
  end if;

  update public.study_sessions
  set session_date = new_session_date,
      duration_minutes = new_duration_minutes,
      notes = nullif(trim(new_notes), ''),
      updated_at = now()
  where id = v_session.id;

  insert into public.audit_log(
    chapter_id, actor_profile_id, action, entity_type, entity_id,
    before_state, after_state, reason
  )
  values (
    v_session.chapter_id,
    auth.uid(),
    'study_session_corrected',
    'study_session',
    v_session.id::text,
    jsonb_build_object(
      'session_date', v_session.session_date,
      'duration_minutes', v_session.duration_minutes,
      'notes', v_session.notes
    ),
    jsonb_build_object(
      'session_date', new_session_date,
      'duration_minutes', new_duration_minutes,
      'notes', nullif(trim(new_notes), '')
    ),
    trim(reason)
  );
end;
$$;

revoke all on function public.correct_study_session(uuid, date, integer, text, text) from public;
grant execute on function public.correct_study_session(uuid, date, integer, text, text) to authenticated;

commit;

