begin;

create or replace function public.manage_member_role(roster_member_id uuid, managed_role public.chapter_role, enable_role boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_chapter_id uuid := public.current_chapter_id();
  v_member public.members%rowtype;
begin
  if managed_role in ('member', 'scholarship_chair') then raise exception 'This role cannot be changed here'; end if;
  if managed_role = 'admin' and not public.has_chapter_role('scholarship_chair') then raise exception 'Only the Scholarship Chair manages Admins'; end if;
  if managed_role = 'proctor' and not public.is_admin_or_chair() then raise exception 'Not authorized'; end if;

  select * into v_member
  from public.members
  where id = roster_member_id and chapter_id = v_chapter_id;
  if v_member.id is null then raise exception 'Member was not found'; end if;
  if enable_role and (v_member.status <> 'active' or v_member.profile_id is null) then
    raise exception 'Operational roles require an active member with a connected account';
  end if;

  insert into public.member_roles(chapter_id, member_id, role, active, granted_by, revoked_at)
  values (v_chapter_id, roster_member_id, managed_role, enable_role, auth.uid(), case when enable_role then null else now() end)
  on conflict (member_id, role) do update set active = excluded.active, granted_by = auth.uid(), granted_at = now(), revoked_at = excluded.revoked_at;
  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, after_state)
  values (v_chapter_id, auth.uid(), case when enable_role then 'role_assigned' else 'role_removed' end, 'member', roster_member_id::text,
    jsonb_build_object('role', managed_role, 'active', enable_role));
end;
$$;

revoke all on function public.manage_member_role(uuid, public.chapter_role, boolean) from public;
grant execute on function public.manage_member_role(uuid, public.chapter_role, boolean) to authenticated;

commit;
