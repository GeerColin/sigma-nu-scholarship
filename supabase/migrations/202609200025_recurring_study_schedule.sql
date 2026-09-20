begin;

create type public.study_schedule_exception_kind as enum ('override', 'cancel');

create table public.study_schedule_series (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete restrict,
  semester_id uuid not null references public.semesters(id) on delete restrict,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  location text not null check (char_length(trim(location)) between 1 and 200),
  instructions text check (instructions is null or char_length(instructions) <= 1000),
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table public.study_schedule_series_proctors (
  chapter_id uuid not null references public.chapters(id) on delete restrict,
  series_id uuid not null references public.study_schedule_series(id) on delete restrict,
  proctor_member_id uuid not null references public.members(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (series_id, proctor_member_id)
);

create table public.study_schedule_occurrences (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete restrict,
  semester_id uuid not null references public.semesters(id) on delete restrict,
  series_id uuid not null references public.study_schedule_series(id) on delete restrict,
  session_date date not null,
  start_time time not null,
  end_time time not null,
  location text not null,
  instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (series_id, session_date),
  check (end_time > start_time)
);

create table public.study_schedule_occurrence_proctors (
  chapter_id uuid not null references public.chapters(id) on delete restrict,
  occurrence_id uuid not null references public.study_schedule_occurrences(id) on delete restrict,
  proctor_member_id uuid not null references public.members(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (occurrence_id, proctor_member_id)
);

create table public.study_schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete restrict,
  occurrence_id uuid not null unique references public.study_schedule_occurrences(id) on delete restrict,
  kind public.study_schedule_exception_kind not null,
  start_time time,
  end_time time,
  location text,
  instructions text,
  reason text,
  source text not null check (source in ('chair', 'proctor')),
  changed_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (kind = 'cancel' and start_time is null and end_time is null and location is null and instructions is null)
    or
    (kind = 'override' and start_time is not null and end_time is not null and location is not null and end_time > start_time)
  ),
  check (location is null or char_length(trim(location)) between 1 and 200),
  check (instructions is null or char_length(instructions) <= 1000),
  check (reason is null or char_length(reason) <= 500)
);

create table public.study_schedule_notifications (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete restrict,
  occurrence_id uuid not null references public.study_schedule_occurrences(id) on delete restrict,
  actor_profile_id uuid not null references public.profiles(id) on delete restrict,
  before_state jsonb not null,
  after_state jsonb not null,
  read_at timestamptz,
  read_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index study_schedule_series_chapter_semester_idx
  on public.study_schedule_series(chapter_id, semester_id, active);
create index study_schedule_occurrences_semester_date_idx
  on public.study_schedule_occurrences(chapter_id, semester_id, session_date);
create index study_schedule_occurrence_proctors_member_idx
  on public.study_schedule_occurrence_proctors(chapter_id, proctor_member_id);
create index study_schedule_notifications_chapter_read_idx
  on public.study_schedule_notifications(chapter_id, read_at, created_at desc);

alter table public.study_schedule_series enable row level security;
alter table public.study_schedule_series_proctors enable row level security;
alter table public.study_schedule_occurrences enable row level security;
alter table public.study_schedule_occurrence_proctors enable row level security;
alter table public.study_schedule_exceptions enable row level security;
alter table public.study_schedule_notifications enable row level security;

create policy schedule_series_member_select on public.study_schedule_series
  for select to authenticated using (
    chapter_id = public.current_chapter_id()
    and (public.has_chapter_role('member') or public.has_chapter_role('proctor') or public.is_admin_or_chair())
  );
create policy schedule_series_proctors_member_select on public.study_schedule_series_proctors
  for select to authenticated using (
    chapter_id = public.current_chapter_id()
    and (public.has_chapter_role('member') or public.has_chapter_role('proctor') or public.is_admin_or_chair())
  );
create policy schedule_occurrences_member_select on public.study_schedule_occurrences
  for select to authenticated using (
    chapter_id = public.current_chapter_id()
    and (public.has_chapter_role('member') or public.has_chapter_role('proctor') or public.is_admin_or_chair())
  );
create policy schedule_occurrence_proctors_member_select on public.study_schedule_occurrence_proctors
  for select to authenticated using (
    chapter_id = public.current_chapter_id()
    and (public.has_chapter_role('member') or public.has_chapter_role('proctor') or public.is_admin_or_chair())
  );
create policy schedule_exceptions_member_select on public.study_schedule_exceptions
  for select to authenticated using (
    chapter_id = public.current_chapter_id()
    and (public.has_chapter_role('member') or public.has_chapter_role('proctor') or public.is_admin_or_chair())
  );
create policy schedule_notifications_chair_select on public.study_schedule_notifications
  for select to authenticated using (
    chapter_id = public.current_chapter_id() and public.has_chapter_role('scholarship_chair')
  );
create policy schedule_notifications_chair_update on public.study_schedule_notifications
  for update to authenticated using (
    chapter_id = public.current_chapter_id() and public.has_chapter_role('scholarship_chair')
  ) with check (
    chapter_id = public.current_chapter_id() and public.has_chapter_role('scholarship_chair')
  );

revoke insert, update, delete on public.study_schedule_series from authenticated;
revoke insert, update, delete on public.study_schedule_series_proctors from authenticated;
revoke insert, update, delete on public.study_schedule_occurrences from authenticated;
revoke insert, update, delete on public.study_schedule_occurrence_proctors from authenticated;
revoke insert, update, delete on public.study_schedule_exceptions from authenticated;
revoke insert, delete on public.study_schedule_notifications from authenticated;

create or replace function public.validate_schedule_proctors(target_chapter_id uuid, target_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(array_length(target_ids, 1), 0) < 1 then
    raise exception 'Assign at least one active Proctor';
  end if;
  if (select count(distinct requested.id) from unnest(target_ids) as requested(id)) <> coalesce(array_length(target_ids, 1), 0) then
    raise exception 'Each Proctor may be assigned only once';
  end if;
  if exists (
    select 1
    from unnest(target_ids) as requested(id)
    where not exists (
      select 1
      from public.members m
      join public.member_roles r on r.member_id = m.id
      where m.id = requested.id
        and m.chapter_id = target_chapter_id
        and m.status = 'active'
        and m.profile_id is not null
        and r.role = 'proctor'
        and r.active
    )
  ) then
    raise exception 'Every assigned Proctor must be active, linked, and chapter-scoped';
  end if;
end;
$$;

create or replace function public.create_study_schedule_series(
  target_semester_id uuid,
  schedule_day_of_week smallint,
  schedule_start_time time,
  schedule_end_time time,
  schedule_location text,
  schedule_instructions text,
  proctor_member_ids uuid[]
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_chapter_id uuid := public.current_chapter_id();
  v_semester public.semesters%rowtype;
  v_series_id uuid;
begin
  if not public.is_admin_or_chair() then raise exception 'Not authorized'; end if;
  select * into v_semester
  from public.semesters
  where id = target_semester_id and chapter_id = v_chapter_id and active
  for update;
  if v_semester.id is null then raise exception 'Active semester was not found'; end if;
  if schedule_day_of_week < 0 or schedule_day_of_week > 6 then raise exception 'Day of week is invalid'; end if;
  if schedule_start_time is null or schedule_end_time is null or schedule_end_time <= schedule_start_time then
    raise exception 'End time must be after start time';
  end if;
  if nullif(trim(schedule_location), '') is null or char_length(trim(schedule_location)) > 200 then
    raise exception 'Location is invalid';
  end if;
  if schedule_instructions is not null and char_length(schedule_instructions) > 1000 then
    raise exception 'Instructions are too long';
  end if;
  perform public.validate_schedule_proctors(v_chapter_id, proctor_member_ids);

  insert into public.study_schedule_series(
    chapter_id, semester_id, day_of_week, start_time, end_time, location, instructions, created_by
  )
  values (
    v_chapter_id, v_semester.id, schedule_day_of_week, schedule_start_time, schedule_end_time,
    trim(schedule_location), nullif(trim(schedule_instructions), ''), auth.uid()
  )
  returning id into v_series_id;

  insert into public.study_schedule_series_proctors(chapter_id, series_id, proctor_member_id)
  select v_chapter_id, v_series_id, requested.id
  from unnest(proctor_member_ids) as requested(id);

  insert into public.study_schedule_occurrences(
    chapter_id, semester_id, series_id, session_date, start_time, end_time, location, instructions
  )
  select
    v_chapter_id, v_semester.id, v_series_id, generated.session_date::date,
    schedule_start_time, schedule_end_time, trim(schedule_location), nullif(trim(schedule_instructions), '')
  from generate_series(v_semester.start_date::timestamp, v_semester.end_date::timestamp, interval '1 day') generated(session_date)
  where extract(dow from generated.session_date)::smallint = schedule_day_of_week;

  insert into public.study_schedule_occurrence_proctors(chapter_id, occurrence_id, proctor_member_id)
  select v_chapter_id, o.id, requested.id
  from public.study_schedule_occurrences o
  cross join unnest(proctor_member_ids) as requested(id)
  where o.series_id = v_series_id;

  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, after_state)
  values (
    v_chapter_id, auth.uid(), 'study_schedule_series_created', 'study_schedule_series', v_series_id::text,
    jsonb_build_object(
      'semester_id', v_semester.id,
      'day_of_week', schedule_day_of_week,
      'start_time', schedule_start_time,
      'end_time', schedule_end_time,
      'location', trim(schedule_location),
      'instructions', nullif(trim(schedule_instructions), ''),
      'proctor_member_ids', to_jsonb(proctor_member_ids)
    )
  );
  return v_series_id;
end;
$$;

create or replace function public.update_study_schedule_series(
  target_series_id uuid,
  schedule_day_of_week smallint,
  schedule_start_time time,
  schedule_end_time time,
  schedule_location text,
  schedule_instructions text,
  proctor_member_ids uuid[]
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_chapter_id uuid := public.current_chapter_id();
  v_series public.study_schedule_series%rowtype;
  v_semester public.semesters%rowtype;
  v_today date;
  v_before jsonb;
begin
  if not public.is_admin_or_chair() then raise exception 'Not authorized'; end if;
  select * into v_series
  from public.study_schedule_series
  where id = target_series_id and chapter_id = v_chapter_id
  for update;
  if v_series.id is null or not v_series.active then raise exception 'Schedule series was not found'; end if;
  select * into v_semester from public.semesters where id = v_series.semester_id and chapter_id = v_chapter_id for share;
  if v_semester.id is null or not v_semester.active then raise exception 'Active semester was not found'; end if;
  if schedule_day_of_week < 0 or schedule_day_of_week > 6 then raise exception 'Day of week is invalid'; end if;
  if schedule_start_time is null or schedule_end_time is null or schedule_end_time <= schedule_start_time then
    raise exception 'End time must be after start time';
  end if;
  if nullif(trim(schedule_location), '') is null or char_length(trim(schedule_location)) > 200 then
    raise exception 'Location is invalid';
  end if;
  if schedule_instructions is not null and char_length(schedule_instructions) > 1000 then
    raise exception 'Instructions are too long';
  end if;
  perform public.validate_schedule_proctors(v_chapter_id, proctor_member_ids);
  v_today := timezone(v_semester.timezone, now())::date;
  v_before := jsonb_build_object(
    'day_of_week', v_series.day_of_week,
    'start_time', v_series.start_time,
    'end_time', v_series.end_time,
    'location', v_series.location,
    'instructions', v_series.instructions
  );

  update public.study_schedule_series
  set day_of_week = schedule_day_of_week,
      start_time = schedule_start_time,
      end_time = schedule_end_time,
      location = trim(schedule_location),
      instructions = nullif(trim(schedule_instructions), ''),
      updated_at = now()
  where id = v_series.id;

  delete from public.study_schedule_series_proctors where series_id = v_series.id;
  insert into public.study_schedule_series_proctors(chapter_id, series_id, proctor_member_id)
  select v_chapter_id, v_series.id, requested.id
  from unnest(proctor_member_ids) as requested(id);

  delete from public.study_schedule_occurrence_proctors op
  using public.study_schedule_occurrences o
  where op.occurrence_id = o.id
    and o.series_id = v_series.id
    and o.session_date > v_today
    and extract(dow from o.session_date)::smallint <> schedule_day_of_week
    and not exists (select 1 from public.study_schedule_exceptions e where e.occurrence_id = o.id);
  delete from public.study_schedule_occurrences o
  where o.series_id = v_series.id
    and o.session_date > v_today
    and not exists (select 1 from public.study_schedule_exceptions e where e.occurrence_id = o.id)
    and extract(dow from o.session_date)::smallint <> schedule_day_of_week;

  insert into public.study_schedule_occurrences(
    chapter_id, semester_id, series_id, session_date, start_time, end_time, location, instructions
  )
  select
    v_chapter_id, v_semester.id, v_series.id, generated.session_date::date,
    schedule_start_time, schedule_end_time, trim(schedule_location), nullif(trim(schedule_instructions), '')
  from generate_series(greatest(v_today + 1, v_semester.start_date)::timestamp, v_semester.end_date::timestamp, interval '1 day') generated(session_date)
  where extract(dow from generated.session_date)::smallint = schedule_day_of_week
    and not exists (
      select 1 from public.study_schedule_occurrences existing
      where existing.series_id = v_series.id and existing.session_date = generated.session_date::date
    );

  update public.study_schedule_occurrences o
  set start_time = schedule_start_time,
      end_time = schedule_end_time,
      location = trim(schedule_location),
      instructions = nullif(trim(schedule_instructions), ''),
      updated_at = now()
  where o.series_id = v_series.id
    and o.session_date >= v_today
    and not exists (select 1 from public.study_schedule_exceptions e where e.occurrence_id = o.id);

  delete from public.study_schedule_occurrence_proctors op
  using public.study_schedule_occurrences o
  where op.occurrence_id = o.id
    and o.series_id = v_series.id
    and o.session_date >= v_today
    and not exists (select 1 from public.study_schedule_exceptions e where e.occurrence_id = o.id);
  insert into public.study_schedule_occurrence_proctors(chapter_id, occurrence_id, proctor_member_id)
  select v_chapter_id, o.id, requested.id
  from public.study_schedule_occurrences o
  cross join unnest(proctor_member_ids) as requested(id)
  where o.series_id = v_series.id
    and o.session_date >= v_today
    and not exists (select 1 from public.study_schedule_exceptions e where e.occurrence_id = o.id);

  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, before_state, after_state)
  values (
    v_chapter_id, auth.uid(), 'study_schedule_series_updated', 'study_schedule_series', v_series.id::text,
    v_before,
    jsonb_build_object(
      'day_of_week', schedule_day_of_week,
      'start_time', schedule_start_time,
      'end_time', schedule_end_time,
      'location', trim(schedule_location),
      'instructions', nullif(trim(schedule_instructions), ''),
      'proctor_member_ids', to_jsonb(proctor_member_ids)
    )
  );
end;
$$;

create or replace function public.remove_study_schedule_series(target_series_id uuid, removal_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_chapter_id uuid := public.current_chapter_id();
  v_series public.study_schedule_series%rowtype;
  v_semester public.semesters%rowtype;
  v_today date;
begin
  if not public.is_admin_or_chair() then raise exception 'Not authorized'; end if;
  if nullif(trim(removal_reason), '') is null or char_length(removal_reason) > 500 then
    raise exception 'A removal reason is required';
  end if;
  select * into v_series
  from public.study_schedule_series
  where id = target_series_id and chapter_id = v_chapter_id
  for update;
  if v_series.id is null or not v_series.active then raise exception 'Schedule series was not found'; end if;
  select * into v_semester from public.semesters where id = v_series.semester_id and chapter_id = v_chapter_id for share;
  if v_semester.id is null or not v_semester.active then raise exception 'Active semester was not found'; end if;
  v_today := timezone(v_semester.timezone, now())::date;

  update public.study_schedule_series set active = false, updated_at = now() where id = v_series.id;
  update public.study_schedule_exceptions e
  set kind = 'cancel', start_time = null, end_time = null, location = null, instructions = null,
      reason = trim(removal_reason), source = 'chair', changed_by = auth.uid(), updated_at = now()
  from public.study_schedule_occurrences o
  where e.occurrence_id = o.id and o.series_id = v_series.id and o.session_date >= v_today;
  insert into public.study_schedule_exceptions(
    chapter_id, occurrence_id, kind, reason, source, changed_by
  )
  select v_chapter_id, o.id, 'cancel', trim(removal_reason), 'chair', auth.uid()
  from public.study_schedule_occurrences o
  where o.series_id = v_series.id
    and o.session_date >= v_today
    and not exists (select 1 from public.study_schedule_exceptions e where e.occurrence_id = o.id);

  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, before_state, after_state, reason)
  values (
    v_chapter_id, auth.uid(), 'study_schedule_series_removed', 'study_schedule_series', v_series.id::text,
    jsonb_build_object('active', true), jsonb_build_object('active', false), trim(removal_reason)
  );
end;
$$;

create or replace function public.manage_study_schedule_occurrence(
  target_occurrence_id uuid,
  requested_operation text,
  exception_start_time time default null,
  exception_end_time time default null,
  exception_location text default null,
  exception_instructions text default null,
  change_reason text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_chapter_id uuid := public.current_chapter_id();
  v_occurrence public.study_schedule_occurrences%rowtype;
  v_series public.study_schedule_series%rowtype;
  v_semester public.semesters%rowtype;
  v_exception public.study_schedule_exceptions%rowtype;
  v_today date;
  v_before jsonb;
  v_after jsonb;
begin
  if not public.is_admin_or_chair() then raise exception 'Not authorized'; end if;
  select * into v_occurrence from public.study_schedule_occurrences where id = target_occurrence_id and chapter_id = v_chapter_id for update;
  if v_occurrence.id is null then raise exception 'Scheduled occurrence was not found'; end if;
  select * into v_series from public.study_schedule_series where id = v_occurrence.series_id and chapter_id = v_chapter_id;
  select * into v_semester from public.semesters where id = v_occurrence.semester_id and chapter_id = v_chapter_id;
  if v_semester.id is null or not v_semester.active then raise exception 'Active semester was not found'; end if;
  v_today := timezone(v_semester.timezone, now())::date;
  if v_occurrence.session_date < v_today then raise exception 'Past schedule occurrences are locked'; end if;
  select * into v_exception from public.study_schedule_exceptions where occurrence_id = v_occurrence.id for update;
  v_before := jsonb_build_object(
    'session_date', v_occurrence.session_date,
    'start_time', coalesce(v_exception.start_time, v_occurrence.start_time),
    'end_time', coalesce(v_exception.end_time, v_occurrence.end_time),
    'location', coalesce(v_exception.location, v_occurrence.location),
    'instructions', coalesce(v_exception.instructions, v_occurrence.instructions),
    'cancelled', coalesce(v_exception.kind = 'cancel', false)
  );

  if requested_operation = 'override' then
    if not v_series.active then raise exception 'The recurring schedule is no longer active'; end if;
    if exception_start_time is null or exception_end_time is null or exception_end_time <= exception_start_time then
      raise exception 'End time must be after start time';
    end if;
    if nullif(trim(exception_location), '') is null or char_length(trim(exception_location)) > 200 then
      raise exception 'Location is invalid';
    end if;
    if exception_instructions is not null and char_length(exception_instructions) > 1000 then
      raise exception 'Instructions are too long';
    end if;
    insert into public.study_schedule_exceptions(
      chapter_id, occurrence_id, kind, start_time, end_time, location, instructions, reason, source, changed_by
    ) values (
      v_chapter_id, v_occurrence.id, 'override', exception_start_time, exception_end_time,
      trim(exception_location), nullif(trim(exception_instructions), ''), nullif(trim(change_reason), ''), 'chair', auth.uid()
    )
    on conflict (occurrence_id) do update set
      kind = 'override', start_time = excluded.start_time, end_time = excluded.end_time,
      location = excluded.location, instructions = excluded.instructions, reason = excluded.reason,
      source = 'chair', changed_by = auth.uid(), updated_at = now();
    v_after := jsonb_build_object('session_date', v_occurrence.session_date, 'start_time', exception_start_time, 'end_time', exception_end_time, 'location', trim(exception_location), 'instructions', nullif(trim(exception_instructions), ''), 'cancelled', false);
  elsif requested_operation = 'cancel' then
    if nullif(trim(change_reason), '') is null or char_length(change_reason) > 500 then raise exception 'A cancellation reason is required'; end if;
    insert into public.study_schedule_exceptions(chapter_id, occurrence_id, kind, reason, source, changed_by)
    values (v_chapter_id, v_occurrence.id, 'cancel', trim(change_reason), 'chair', auth.uid())
    on conflict (occurrence_id) do update set
      kind = 'cancel', start_time = null, end_time = null, location = null, instructions = null,
      reason = excluded.reason, source = 'chair', changed_by = auth.uid(), updated_at = now();
    v_after := jsonb_build_object('session_date', v_occurrence.session_date, 'cancelled', true, 'reason', trim(change_reason));
  elsif requested_operation = 'restore' then
    if not v_series.active then raise exception 'The recurring schedule is no longer active'; end if;
    delete from public.study_schedule_exceptions where occurrence_id = v_occurrence.id;
    v_after := jsonb_build_object('session_date', v_occurrence.session_date, 'start_time', v_occurrence.start_time, 'end_time', v_occurrence.end_time, 'location', v_occurrence.location, 'instructions', v_occurrence.instructions, 'cancelled', false);
  else
    raise exception 'Schedule operation is invalid';
  end if;

  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, before_state, after_state, reason)
  values (v_chapter_id, auth.uid(), 'study_schedule_occurrence_managed', 'study_schedule_occurrence', v_occurrence.id::text, v_before, v_after, nullif(trim(change_reason), ''));
end;
$$;

create or replace function public.update_study_schedule_occurrence_by_proctor(
  target_occurrence_id uuid,
  new_start_time time,
  new_end_time time,
  new_location text
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_chapter_id uuid := public.current_chapter_id();
  v_occurrence public.study_schedule_occurrences%rowtype;
  v_semester public.semesters%rowtype;
  v_exception public.study_schedule_exceptions%rowtype;
  v_today date;
  v_before_start time;
  v_before_end time;
  v_before_location text;
begin
  if not public.has_chapter_role('proctor') then raise exception 'Not authorized'; end if;
  select * into v_occurrence from public.study_schedule_occurrences where id = target_occurrence_id and chapter_id = v_chapter_id for update;
  if v_occurrence.id is null then raise exception 'Scheduled occurrence was not found'; end if;
  if not exists (
    select 1 from public.study_schedule_occurrence_proctors op
    where op.occurrence_id = v_occurrence.id and op.proctor_member_id = public.current_member_id()
  ) then
    raise exception 'You are not assigned to this scheduled session';
  end if;
  select * into v_semester from public.semesters where id = v_occurrence.semester_id and chapter_id = v_chapter_id;
  if v_semester.id is null or not v_semester.active then raise exception 'Active semester was not found'; end if;
  v_today := timezone(v_semester.timezone, now())::date;
  if v_occurrence.session_date < v_today then raise exception 'Past schedule occurrences are locked'; end if;
  select * into v_exception from public.study_schedule_exceptions where occurrence_id = v_occurrence.id for update;
  if v_exception.kind = 'cancel' then raise exception 'Cancelled schedule occurrences cannot be edited'; end if;
  if new_start_time is null or new_end_time is null or new_end_time <= new_start_time then raise exception 'End time must be after start time'; end if;
  if nullif(trim(new_location), '') is null or char_length(trim(new_location)) > 200 then raise exception 'Location is invalid'; end if;

  v_before_start := coalesce(v_exception.start_time, v_occurrence.start_time);
  v_before_end := coalesce(v_exception.end_time, v_occurrence.end_time);
  v_before_location := coalesce(v_exception.location, v_occurrence.location);
  if v_before_start = new_start_time and v_before_end = new_end_time and v_before_location = trim(new_location) then
    return false;
  end if;

  insert into public.study_schedule_exceptions(
    chapter_id, occurrence_id, kind, start_time, end_time, location, instructions, source, changed_by
  ) values (
    v_chapter_id, v_occurrence.id, 'override', new_start_time, new_end_time, trim(new_location),
    coalesce(v_exception.instructions, v_occurrence.instructions), 'proctor', auth.uid()
  )
  on conflict (occurrence_id) do update set
    kind = 'override', start_time = excluded.start_time, end_time = excluded.end_time,
    location = excluded.location, instructions = excluded.instructions,
    reason = null, source = 'proctor', changed_by = auth.uid(), updated_at = now();

  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, before_state, after_state)
  values (
    v_chapter_id, auth.uid(), 'study_schedule_occurrence_proctor_edited', 'study_schedule_occurrence', v_occurrence.id::text,
    jsonb_build_object('session_date', v_occurrence.session_date, 'start_time', v_before_start, 'end_time', v_before_end, 'location', v_before_location),
    jsonb_build_object('session_date', v_occurrence.session_date, 'start_time', new_start_time, 'end_time', new_end_time, 'location', trim(new_location))
  );
  insert into public.study_schedule_notifications(
    chapter_id, occurrence_id, actor_profile_id, before_state, after_state
  ) values (
    v_chapter_id, v_occurrence.id, auth.uid(),
    jsonb_build_object('session_date', v_occurrence.session_date, 'start_time', v_before_start, 'end_time', v_before_end, 'location', v_before_location),
    jsonb_build_object('session_date', v_occurrence.session_date, 'start_time', new_start_time, 'end_time', new_end_time, 'location', trim(new_location))
  );
  return true;
end;
$$;

create or replace function public.mark_study_schedule_notification_read(target_notification_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_chapter_role('scholarship_chair') then raise exception 'Not authorized'; end if;
  update public.study_schedule_notifications
  set read_at = coalesce(read_at, now()), read_by = auth.uid()
  where id = target_notification_id and chapter_id = public.current_chapter_id();
  if not found then raise exception 'Schedule notification was not found'; end if;
end;
$$;

create or replace function public.list_study_schedule_occurrences(
  target_semester_id uuid,
  range_start date,
  range_end date
)
returns table(
  occurrence_id uuid,
  series_id uuid,
  session_date date,
  start_time time,
  end_time time,
  location text,
  instructions text,
  cancelled boolean,
  cancellation_reason text,
  starts_at timestamptz,
  ends_at timestamptz,
  semester_timezone text,
  proctors jsonb
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.has_chapter_role('member') or public.has_chapter_role('proctor') or public.is_admin_or_chair()) then raise exception 'Not authorized'; end if;
  if range_end < range_start then raise exception 'Schedule date range is invalid'; end if;
  if not exists (
    select 1 from public.semesters s
    where s.id = target_semester_id and s.chapter_id = public.current_chapter_id() and s.active
  ) then raise exception 'Active semester was not found'; end if;
  return query
  with effective as (
    select
      o.id,
      o.series_id,
      o.session_date,
      coalesce(e.start_time, o.start_time) as effective_start_time,
      coalesce(e.end_time, o.end_time) as effective_end_time,
      coalesce(e.location, o.location) as effective_location,
      coalesce(e.instructions, o.instructions) as effective_instructions,
      (e.kind = 'cancel') as is_cancelled,
      case when e.kind = 'cancel' then e.reason else null end as effective_cancellation_reason,
      s.timezone
    from public.study_schedule_occurrences o
    join public.semesters s on s.id = o.semester_id
    left join public.study_schedule_exceptions e on e.occurrence_id = o.id
    where o.chapter_id = public.current_chapter_id()
      and o.semester_id = target_semester_id
      and o.session_date between range_start and range_end
  )
  select
    e.id,
    e.series_id,
    e.session_date,
    e.effective_start_time,
    e.effective_end_time,
    e.effective_location,
    e.effective_instructions,
    coalesce(e.is_cancelled, false),
    e.effective_cancellation_reason,
    (e.session_date + e.effective_start_time) at time zone e.timezone,
    (e.session_date + e.effective_end_time) at time zone e.timezone,
    e.timezone,
    coalesce(
      jsonb_agg(
        jsonb_build_object('memberId', m.id, 'fullName', m.full_name)
        order by m.full_name
      ) filter (where m.id is not null),
      '[]'::jsonb
    )
  from effective e
  left join public.study_schedule_occurrence_proctors op on op.occurrence_id = e.id
  left join public.members m on m.id = op.proctor_member_id
  group by e.id, e.series_id, e.session_date, e.effective_start_time, e.effective_end_time,
    e.effective_location, e.effective_instructions, e.is_cancelled, e.effective_cancellation_reason, e.timezone
  order by e.session_date, e.effective_start_time, e.effective_location;
end;
$$;

revoke all on function public.validate_schedule_proctors(uuid, uuid[]) from public;
revoke all on function public.create_study_schedule_series(uuid, smallint, time, time, text, text, uuid[]) from public;
revoke all on function public.update_study_schedule_series(uuid, smallint, time, time, text, text, uuid[]) from public;
revoke all on function public.remove_study_schedule_series(uuid, text) from public;
revoke all on function public.manage_study_schedule_occurrence(uuid, text, time, time, text, text, text) from public;
revoke all on function public.update_study_schedule_occurrence_by_proctor(uuid, time, time, text) from public;
revoke all on function public.mark_study_schedule_notification_read(uuid) from public;
revoke all on function public.list_study_schedule_occurrences(uuid, date, date) from public;
grant execute on function public.create_study_schedule_series(uuid, smallint, time, time, text, text, uuid[]) to authenticated;
grant execute on function public.update_study_schedule_series(uuid, smallint, time, time, text, text, uuid[]) to authenticated;
grant execute on function public.remove_study_schedule_series(uuid, text) to authenticated;
grant execute on function public.manage_study_schedule_occurrence(uuid, text, time, time, text, text, text) to authenticated;
grant execute on function public.update_study_schedule_occurrence_by_proctor(uuid, time, time, text) to authenticated;
grant execute on function public.mark_study_schedule_notification_read(uuid) to authenticated;
grant execute on function public.list_study_schedule_occurrences(uuid, date, date) to authenticated;

commit;
