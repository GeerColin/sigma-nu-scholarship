begin;

create or replace function public.enforce_active_course_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.archived_at is null and exists (
    select 1
    from public.courses
    where member_id = new.member_id
      and semester_id = new.semester_id
      and archived_at is null
      and id <> new.id
    group by member_id, semester_id
    having count(*) >= 8
  ) then
    raise exception 'A member may have at most 8 active courses per semester';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_active_course_limit() from public;

drop trigger if exists enforce_active_course_limit on public.courses;
create trigger enforce_active_course_limit
before insert or update of member_id, semester_id, archived_at on public.courses
for each row execute function public.enforce_active_course_limit();

commit;
