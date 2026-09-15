begin;

alter table public.courses add column removed_at timestamptz;
alter table public.courses add constraint removed_course_archived check (removed_at is null or archived_at is not null);

create or replace function public.remove_archived_course(target_course_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_course public.courses%rowtype;
  v_has_history boolean;
begin
  if not public.has_chapter_role('scholarship_chair') then raise exception 'Only the Scholarship Chair may remove an archived course'; end if;
  select * into v_course from public.courses
    where id = target_course_id and chapter_id = public.current_chapter_id()
      and archived_at is not null and removed_at is null for update;
  if v_course.id is null then raise exception 'Archived course was not found'; end if;

  v_has_history := exists (select 1 from public.grade_entries where course_id = v_course.id)
    or exists (select 1 from public.academic_alerts where course_id = v_course.id)
    or exists (select 1 from public.custom_grading_reviews where course_id = v_course.id);
  if v_has_history then
    update public.courses set removed_at = now(), updated_at = now() where id = v_course.id;
    insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, before_state, after_state)
    values (v_course.chapter_id, auth.uid(), 'archived_course_hidden', 'course', v_course.id::text,
      jsonb_build_object('member_id', v_course.member_id, 'name', v_course.name, 'archived_at', v_course.archived_at),
      jsonb_build_object('removed_from_schedules', true, 'history_preserved', true));
    return 'hidden';
  end if;

  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, before_state, after_state)
  values (v_course.chapter_id, auth.uid(), 'archived_course_removed', 'course', v_course.id::text,
    jsonb_build_object('member_id', v_course.member_id, 'name', v_course.name, 'archived_at', v_course.archived_at),
    jsonb_build_object('removed', true));
  delete from public.courses where id = v_course.id;
  return 'deleted';
end;
$$;

commit;
