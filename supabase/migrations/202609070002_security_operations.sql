begin;

drop policy if exists member_proctor_active_names on public.members;

create or replace function public.list_active_members_for_proctor()
returns table(member_id uuid, full_name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.has_chapter_role('proctor') or public.is_admin_or_chair()) then
    raise exception 'Not authorized';
  end if;
  return query
    select m.id, m.full_name
    from public.members m
    where m.chapter_id = public.current_chapter_id() and m.status = 'active'
    order by m.full_name;
end;
$$;

revoke all on function public.list_active_members_for_proctor() from public;
grant execute on function public.list_active_members_for_proctor() to authenticated;

create or replace function public.enforce_role_chapter_match()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.members m where m.id = new.member_id and m.chapter_id = new.chapter_id) then
    raise exception 'Role and member must belong to the same chapter';
  end if;
  return new;
end;
$$;

create trigger member_role_chapter_match before insert or update on public.member_roles
for each row execute function public.enforce_role_chapter_match();

create or replace function public.approve_access_request(request_id uuid, roster_member_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_request public.access_requests%rowtype;
  v_member public.members%rowtype;
begin
  if not public.is_admin_or_chair() then raise exception 'Not authorized'; end if;
  select * into v_request from public.access_requests where id = request_id and status = 'pending' for update;
  select * into v_member from public.members where id = roster_member_id and chapter_id = public.current_chapter_id() for update;
  if v_request.id is null or v_member.id is null then raise exception 'Request or member was not found'; end if;
  if v_member.profile_id is not null then raise exception 'Member already has a linked Google account'; end if;
  if exists (select 1 from public.members where profile_id = v_request.profile_id) then raise exception 'Google account is already linked'; end if;
  update public.members set profile_id = v_request.profile_id, updated_at = now() where id = v_member.id;
  update public.access_requests set status = 'approved', possible_member_id = v_member.id, reviewed_by = auth.uid(), reviewed_at = now() where id = v_request.id;
  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, after_state)
  values (v_member.chapter_id, auth.uid(), 'account_link_approved', 'member', v_member.id::text,
    jsonb_build_object('profile_id', v_request.profile_id, 'access_request_id', v_request.id));
end;
$$;

create or replace function public.disconnect_member_account(roster_member_id uuid, reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_member public.members%rowtype;
begin
  if not public.is_admin_or_chair() then raise exception 'Not authorized'; end if;
  if nullif(trim(reason), '') is null then raise exception 'A reason is required'; end if;
  select * into v_member from public.members where id = roster_member_id and chapter_id = public.current_chapter_id() for update;
  if v_member.id is null then raise exception 'Member was not found'; end if;
  if exists (select 1 from public.member_roles where member_id = v_member.id and role = 'scholarship_chair' and active) then
    raise exception 'Transfer the Scholarship Chair role before disconnecting this account';
  end if;
  update public.members set profile_id = null, updated_at = now() where id = v_member.id;
  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, before_state, after_state, reason)
  values (v_member.chapter_id, auth.uid(), 'account_disconnected', 'member', v_member.id::text,
    jsonb_build_object('profile_id', v_member.profile_id), jsonb_build_object('profile_id', null), reason);
end;
$$;

create or replace function public.manage_member_role(roster_member_id uuid, managed_role public.chapter_role, enable_role boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_chapter_id uuid := public.current_chapter_id();
begin
  if managed_role in ('member', 'scholarship_chair') then raise exception 'This role cannot be changed here'; end if;
  if managed_role = 'admin' and not public.has_chapter_role('scholarship_chair') then raise exception 'Only the Scholarship Chair manages Admins'; end if;
  if managed_role = 'proctor' and not public.is_admin_or_chair() then raise exception 'Not authorized'; end if;
  if not exists (select 1 from public.members where id = roster_member_id and chapter_id = v_chapter_id) then raise exception 'Member was not found'; end if;
  insert into public.member_roles(chapter_id, member_id, role, active, granted_by, revoked_at)
  values (v_chapter_id, roster_member_id, managed_role, enable_role, auth.uid(), case when enable_role then null else now() end)
  on conflict (member_id, role) do update set active = excluded.active, granted_by = auth.uid(), granted_at = now(), revoked_at = excluded.revoked_at;
  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, after_state)
  values (v_chapter_id, auth.uid(), case when enable_role then 'role_assigned' else 'role_removed' end, 'member', roster_member_id::text,
    jsonb_build_object('role', managed_role, 'active', enable_role));
end;
$$;

create or replace function public.bootstrap_chapter(
  bootstrap_token text,
  fraternity_name text,
  chapter_name text,
  institution_name text,
  initial_chair_name text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_token public.bootstrap_tokens%rowtype;
  v_chapter_id uuid;
  v_member_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  select * into v_token from public.bootstrap_tokens
    where token_hash = encode(extensions.digest(bootstrap_token, 'sha256'), 'hex')
      and used_at is null and expires_at > now()
    for update;
  if v_token.id is null then raise exception 'Bootstrap token is invalid or expired'; end if;
  insert into public.chapters(fraternity_name, chapter_name, institution_name, initialized_at)
    values (trim(fraternity_name), trim(chapter_name), trim(institution_name), now()) returning id into v_chapter_id;
  insert into public.members(chapter_id, profile_id, full_name, status)
    values (v_chapter_id, auth.uid(), trim(initial_chair_name), 'active') returning id into v_member_id;
  insert into public.member_roles(chapter_id, member_id, role, active, granted_by)
    values (v_chapter_id, v_member_id, 'member', true, auth.uid()), (v_chapter_id, v_member_id, 'scholarship_chair', true, auth.uid());
  insert into public.chapter_settings(chapter_id, updated_by) values (v_chapter_id, auth.uid());
  update public.bootstrap_tokens set used_at = now(), used_by = auth.uid() where id = v_token.id;
  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, after_state)
    values (v_chapter_id, auth.uid(), 'chapter_bootstrapped', 'chapter', v_chapter_id::text,
      jsonb_build_object('initial_chair_member_id', v_member_id));
  return v_chapter_id;
end;
$$;

revoke all on function public.approve_access_request(uuid, uuid) from public;
revoke all on function public.disconnect_member_account(uuid, text) from public;
revoke all on function public.manage_member_role(uuid, public.chapter_role, boolean) from public;
revoke all on function public.bootstrap_chapter(text, text, text, text, text) from public;
grant execute on function public.approve_access_request(uuid, uuid) to authenticated;
grant execute on function public.disconnect_member_account(uuid, text) to authenticated;
grant execute on function public.manage_member_role(uuid, public.chapter_role, boolean) to authenticated;
grant execute on function public.bootstrap_chapter(text, text, text, text, text) to authenticated;

commit;

