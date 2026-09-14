begin;

alter table public.semesters add column archived_at timestamptz;
alter table public.semesters add constraint archived_semester_inactive check (archived_at is null or not active);

-- Ordinary clients cannot bypass the audited management RPCs with direct writes.
revoke update, delete on public.semesters from authenticated;

create or replace function public.manage_semester(
  target_semester_id uuid, requested_operation text, new_name text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_semester public.semesters%rowtype;
begin
  if not public.has_chapter_role('scholarship_chair') then raise exception 'Not authorized'; end if;
  select * into v_semester from public.semesters
    where id = target_semester_id and chapter_id = public.current_chapter_id() for update;
  if v_semester.id is null then raise exception 'Semester was not found'; end if;
  if requested_operation = 'rename' then
    if new_name is null or length(trim(new_name)) not between 1 and 100 then raise exception 'Invalid semester name'; end if;
    update public.semesters set name = trim(new_name), updated_at = now() where id = v_semester.id;
  elsif requested_operation = 'archive' then
    update public.semesters set archived_at = now(), active = false, updated_at = now() where id = v_semester.id;
  elsif requested_operation = 'restore' then
    update public.semesters set archived_at = null, updated_at = now() where id = v_semester.id;
  elsif requested_operation = 'delete' then
    -- Generated weeks are configuration, not academic history. RESTRICT foreign
    -- keys prevent removal if any course, submission, assignment, session, or
    -- alert depends on the semester/weeks. Any failure rolls everything back.
    delete from public.academic_weeks where semester_id = v_semester.id;
    delete from public.semesters where id = v_semester.id;
  else
    raise exception 'Invalid semester operation';
  end if;
  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, before_state, after_state)
    values(v_semester.chapter_id, auth.uid(), 'semester_' || requested_operation, 'semester', v_semester.id::text,
      to_jsonb(v_semester), case when requested_operation = 'delete' then null else
        (select to_jsonb(s) from public.semesters s where id = v_semester.id) end);
end;
$$;
revoke all on function public.manage_semester(uuid, text, text) from public;
grant execute on function public.manage_semester(uuid, text, text) to authenticated;

commit;
