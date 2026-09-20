begin;

alter table public.academic_weeks
  add column grade_check_required boolean not null default true;

alter table public.semesters
  add column first_grade_check_week_id uuid;

alter table public.semesters
  add constraint semesters_first_grade_check_week_fkey
  foreign key (first_grade_check_week_id)
  references public.academic_weeks(id)
  on delete set null;

-- Preserve the existing behavior for semesters that predate this setting:
-- their first generated academic week is the first grade-check week.
update public.semesters semesters
set first_grade_check_week_id = (
  select weeks.id
  from public.academic_weeks weeks
  where weeks.semester_id = semesters.id
  order by weeks.sequence_number
  limit 1
)
where semesters.first_grade_check_week_id is null;

create or replace function public.initialize_first_grade_check_week()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.semesters
  set first_grade_check_week_id = new.id,
      updated_at = now()
  where id = new.semester_id
    and first_grade_check_week_id is null;
  return new;
end;
$$;

drop trigger if exists academic_week_initializes_grade_check_start
  on public.academic_weeks;
create trigger academic_week_initializes_grade_check_start
after insert on public.academic_weeks
for each row execute function public.initialize_first_grade_check_week();

create or replace function public.enforce_grade_check_submission_week()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_grade_check_required(new.week_id) then
    raise exception 'No grade check is required for this week';
  end if;
  return new;
end;
$$;

drop trigger if exists grade_submission_requires_grade_check
  on public.grade_submissions;
create trigger grade_submission_requires_grade_check
before insert on public.grade_submissions
for each row execute function public.enforce_grade_check_submission_week();

create or replace function public.enforce_grade_check_email_batch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.batch_type = 'missing_grade_reminder'
    and not public.is_grade_check_required(new.week_id) then
    raise exception 'Missing-grade reminders are not eligible for this week';
  end if;
  return new;
end;
$$;

drop trigger if exists email_batch_requires_grade_check
  on public.email_batches;
create trigger email_batch_requires_grade_check
before insert on public.email_batches
for each row execute function public.enforce_grade_check_email_batch();

-- Calendar configuration is changed only through audited RPCs.
revoke insert, update, delete on public.semesters from authenticated;
revoke insert, update, delete on public.academic_weeks from authenticated;

create or replace function public.is_grade_check_required(target_week_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(week.grade_check_required, false)
    and week.sequence_number >= coalesce(start_week.sequence_number, 1)
  from public.academic_weeks week
  join public.semesters semester on semester.id = week.semester_id
  left join public.academic_weeks start_week
    on start_week.id = semester.first_grade_check_week_id
  where week.id = target_week_id
$$;

create or replace function public.set_semester_grade_check_start(
  target_semester_id uuid,
  target_week_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chapter_id uuid := public.current_chapter_id();
  v_semester public.semesters%rowtype;
  v_week public.academic_weeks%rowtype;
begin
  if v_chapter_id is null or not public.is_admin_or_chair() then
    raise exception 'Not authorized';
  end if;

  select * into v_semester
  from public.semesters
  where id = target_semester_id and chapter_id = v_chapter_id
  for update;
  if v_semester.id is null then
    raise exception 'Semester was not found';
  end if;

  select * into v_week
  from public.academic_weeks
  where id = target_week_id
    and semester_id = target_semester_id
    and chapter_id = v_chapter_id;
  if v_week.id is null then
    raise exception 'First grade-check week must belong to the selected semester';
  end if;

  update public.semesters
  set first_grade_check_week_id = target_week_id,
      updated_at = now()
  where id = target_semester_id;

  insert into public.audit_log(
    chapter_id, actor_profile_id, action, entity_type, entity_id,
    before_state, after_state
  ) values (
    v_chapter_id, auth.uid(), 'semester_grade_check_start_updated', 'semester',
    target_semester_id::text,
    jsonb_build_object('first_grade_check_week_id', v_semester.first_grade_check_week_id),
    jsonb_build_object('first_grade_check_week_id', target_week_id)
  );
end;
$$;

create or replace function public.set_academic_week_grade_check_required(
  target_week_id uuid,
  required boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chapter_id uuid := public.current_chapter_id();
  v_week public.academic_weeks%rowtype;
begin
  if v_chapter_id is null or not public.is_admin_or_chair() then
    raise exception 'Not authorized';
  end if;

  select * into v_week
  from public.academic_weeks
  where id = target_week_id and chapter_id = v_chapter_id
  for update;
  if v_week.id is null then
    raise exception 'Academic week was not found';
  end if;

  update public.academic_weeks
  set grade_check_required = required,
      updated_at = now()
  where id = target_week_id;

  insert into public.audit_log(
    chapter_id, actor_profile_id, action, entity_type, entity_id,
    before_state, after_state
  ) values (
    v_chapter_id, auth.uid(), 'academic_week_grade_check_requirement_updated',
    'academic_week', target_week_id::text,
    jsonb_build_object('grade_check_required', v_week.grade_check_required),
    jsonb_build_object('grade_check_required', required)
  );
end;
$$;

revoke all on function public.is_grade_check_required(uuid) from public;
revoke all on function public.set_semester_grade_check_start(uuid, uuid) from public;
revoke all on function public.set_academic_week_grade_check_required(uuid, boolean) from public;
grant execute on function public.is_grade_check_required(uuid) to authenticated;
grant execute on function public.set_semester_grade_check_start(uuid, uuid) to authenticated;
grant execute on function public.set_academic_week_grade_check_required(uuid, boolean) to authenticated;

commit;
