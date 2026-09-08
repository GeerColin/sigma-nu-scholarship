begin;

alter table public.access_requests
  drop constraint if exists access_requests_profile_id_status_key;

create unique index if not exists one_pending_access_request_per_profile
  on public.access_requests(profile_id)
  where status = 'pending';

create or replace function public.reject_access_request(
  request_id uuid,
  reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.access_requests%rowtype;
  v_chapter_id uuid := public.current_chapter_id();
begin
  if not public.is_admin_or_chair() then
    raise exception 'Not authorized';
  end if;
  if nullif(trim(reason), '') is null then
    raise exception 'A reason is required';
  end if;

  select * into v_request
  from public.access_requests
  where id = request_id and status = 'pending'
  for update;

  if v_request.id is null then
    raise exception 'Pending request was not found';
  end if;

  update public.access_requests
  set status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      rejection_reason = trim(reason)
  where id = v_request.id;

  insert into public.audit_log(
    chapter_id,
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    before_state,
    after_state,
    reason
  )
  values (
    v_chapter_id,
    auth.uid(),
    'account_link_rejected',
    'access_request',
    v_request.id::text,
    jsonb_build_object('status', v_request.status),
    jsonb_build_object('status', 'rejected'),
    trim(reason)
  );
end;
$$;

revoke all on function public.reject_access_request(uuid, text) from public;
grant execute on function public.reject_access_request(uuid, text) to authenticated;

commit;

