begin;

create or replace function public.create_semester_with_weeks(
  semester_name text,
  semester_start_date date,
  semester_end_date date,
  semester_timezone text,
  deadline_weekday smallint,
  deadline_time time,
  make_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chapter_id uuid := public.current_chapter_id();
  v_semester_id uuid;
  v_week_start date;
  v_week_end date;
  v_deadline_date date;
  v_sequence integer := 1;
begin
  if not public.is_admin_or_chair() then
    raise exception 'Not authorized';
  end if;
  if nullif(trim(semester_name), '') is null or char_length(trim(semester_name)) > 100 then
    raise exception 'Semester name is invalid';
  end if;
  if semester_end_date < semester_start_date then
    raise exception 'Semester end date must not precede its start date';
  end if;
  if deadline_weekday < 0 or deadline_weekday > 6 then
    raise exception 'Deadline weekday is invalid';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_timezone_names
    where name = semester_timezone
  ) then
    raise exception 'Timezone is invalid';
  end if;

  if make_active then
    update public.semesters
    set active = false, updated_at = now()
    where chapter_id = v_chapter_id and active;
  end if;

  insert into public.semesters(
    chapter_id,
    name,
    start_date,
    end_date,
    default_deadline_weekday,
    default_deadline_time,
    timezone,
    active
  )
  values (
    v_chapter_id,
    trim(semester_name),
    semester_start_date,
    semester_end_date,
    deadline_weekday,
    deadline_time,
    semester_timezone,
    make_active
  )
  returning id into v_semester_id;

  v_week_start := semester_start_date;
  while v_week_start <= semester_end_date loop
    v_week_end := least(v_week_start + 6, semester_end_date);
    v_deadline_date := least(
      v_week_start + ((deadline_weekday - extract(dow from v_week_start)::integer + 7) % 7),
      v_week_end
    );

    insert into public.academic_weeks(
      chapter_id,
      semester_id,
      sequence_number,
      label,
      starts_on,
      ends_on,
      deadline_at
    )
    values (
      v_chapter_id,
      v_semester_id,
      v_sequence,
      'Week ' || v_sequence,
      v_week_start,
      v_week_end,
      (v_deadline_date + deadline_time) at time zone semester_timezone
    );

    v_week_start := v_week_start + 7;
    v_sequence := v_sequence + 1;
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
    'semester_created',
    'semester',
    v_semester_id::text,
    jsonb_build_object(
      'name', trim(semester_name),
      'start_date', semester_start_date,
      'end_date', semester_end_date,
      'timezone', semester_timezone,
      'deadline_weekday', deadline_weekday,
      'deadline_time', deadline_time,
      'active', make_active,
      'academic_week_count', v_sequence - 1
    )
  );

  return v_semester_id;
end;
$$;

create or replace function public.activate_semester(target_semester_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_semester public.semesters%rowtype;
begin
  if not public.is_admin_or_chair() then
    raise exception 'Not authorized';
  end if;

  select * into v_semester
  from public.semesters
  where id = target_semester_id and chapter_id = public.current_chapter_id()
  for update;
  if v_semester.id is null then
    raise exception 'Semester was not found';
  end if;

  update public.semesters
  set active = false, updated_at = now()
  where chapter_id = v_semester.chapter_id and active;
  update public.semesters
  set active = true, updated_at = now()
  where id = v_semester.id;

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
    v_semester.chapter_id,
    auth.uid(),
    'semester_activated',
    'semester',
    v_semester.id::text,
    jsonb_build_object('active', v_semester.active),
    jsonb_build_object('active', true)
  );
end;
$$;

create or replace function public.override_academic_week_deadline(
  target_week_id uuid,
  deadline_date date,
  deadline_time time
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_week public.academic_weeks%rowtype;
  v_timezone text;
  v_before timestamptz;
  v_after timestamptz;
begin
  if not public.is_admin_or_chair() then
    raise exception 'Not authorized';
  end if;

  select w.*
  into v_week
  from public.academic_weeks w
  where w.id = target_week_id and w.chapter_id = public.current_chapter_id()
  for update of w;
  if v_week.id is null then
    raise exception 'Academic week was not found';
  end if;
  select s.timezone into v_timezone
  from public.semesters s
  where s.id = v_week.semester_id;
  if deadline_date < v_week.starts_on or deadline_date > v_week.ends_on then
    raise exception 'Deadline must fall within the academic week';
  end if;

  v_before := v_week.deadline_at;
  v_after := (deadline_date + deadline_time) at time zone v_timezone;
  update public.academic_weeks
  set deadline_at = v_after,
      deadline_overridden = true,
      updated_at = now()
  where id = v_week.id;

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
    v_week.chapter_id,
    auth.uid(),
    'academic_week_deadline_overridden',
    'academic_week',
    v_week.id::text,
    jsonb_build_object('deadline_at', v_before),
    jsonb_build_object('deadline_at', v_after)
  );
end;
$$;

revoke all on function public.create_semester_with_weeks(text, date, date, text, smallint, time, boolean) from public;
revoke all on function public.activate_semester(uuid) from public;
revoke all on function public.override_academic_week_deadline(uuid, date, time) from public;
grant execute on function public.create_semester_with_weeks(text, date, date, text, smallint, time, boolean) to authenticated;
grant execute on function public.activate_semester(uuid) to authenticated;
grant execute on function public.override_academic_week_deadline(uuid, date, time) to authenticated;

commit;
