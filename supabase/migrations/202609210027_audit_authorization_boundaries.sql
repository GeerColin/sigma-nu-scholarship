begin;

-- Application mutations already use audited SECURITY DEFINER RPCs. Table grants
-- must not provide an alternate path around their role/history constraints.
-- SELECT grants and all chapter-scoped RLS policies remain unchanged.
revoke insert, update, delete, truncate, references, trigger on all tables in schema public
  from anon, authenticated;

create or replace function public.submit_access_request(
  requested_name text,
  authenticated_name text,
  authenticated_email text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_chapter_id uuid;
  v_request_id uuid;
  v_email text;
  v_name text;
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  if nullif(trim(requested_name), '') is null or char_length(trim(requested_name)) > 150 then
    raise exception 'Requested name is invalid';
  end if;
  -- Keep the RPC signature compatible, but never trust caller-supplied identity.
  -- Names are display metadata, not independent evidence for roster approval.
  select lower(trim(u.email)), nullif(trim(u.raw_user_meta_data ->> 'full_name'), '')
    into v_email, v_name from auth.users u where u.id = auth.uid();
  if nullif(v_email, '') is null then raise exception 'Authenticated identity is unavailable'; end if;
  select chapter_id into v_chapter_id from public.application_configuration where singleton;
  if v_chapter_id is null then raise exception 'Chapter access is not configured'; end if;
  insert into public.access_requests(chapter_id, profile_id, requested_name, authenticated_name, authenticated_email)
  values (v_chapter_id, auth.uid(), trim(requested_name), v_name, v_email)
  returning id into v_request_id;
  return v_request_id;
end;
$$;

create or replace function public.approve_access_request(request_id uuid, roster_member_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_request public.access_requests%rowtype;
  v_member public.members%rowtype;
  v_chapter_id uuid := public.current_chapter_id();
begin
  if not public.is_admin_or_chair() then raise exception 'Not authorized'; end if;
  select * into v_request from public.access_requests
  where id = request_id and chapter_id = v_chapter_id and status = 'pending' for update;
  select * into v_member from public.members
  where id = roster_member_id and chapter_id = v_chapter_id for update;
  if v_request.id is null or v_member.id is null then raise exception 'Request or member was not found'; end if;
  if not public.has_chapter_role('scholarship_chair') and exists (
    select 1 from public.member_roles where member_id = v_member.id and active and role in ('admin', 'scholarship_chair')
  ) then raise exception 'Only the Scholarship Chair manages Admin account links'; end if;
  if v_member.profile_id is not null then raise exception 'Member already has a linked Google account'; end if;
  if exists (select 1 from public.members where profile_id = v_request.profile_id) then raise exception 'Google account is already linked'; end if;
  update public.members set profile_id = v_request.profile_id, updated_at = now() where id = v_member.id;
  update public.access_requests set status = 'approved', possible_member_id = v_member.id, reviewed_by = auth.uid(), reviewed_at = now() where id = v_request.id;
  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, after_state)
  values (v_chapter_id, auth.uid(), 'account_link_approved', 'member', v_member.id::text,
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
  if not public.has_chapter_role('scholarship_chair') and exists (
    select 1 from public.member_roles where member_id = v_member.id and role = 'admin' and active
  ) then raise exception 'Only the Scholarship Chair manages Admin account links'; end if;
  update public.members set profile_id = null, updated_at = now() where id = v_member.id;
  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, before_state, after_state, reason)
  values (v_member.chapter_id, auth.uid(), 'account_disconnected', 'member', v_member.id::text,
    jsonb_build_object('profile_id', v_member.profile_id), jsonb_build_object('profile_id', null), reason);
end;
$$;

commit;
