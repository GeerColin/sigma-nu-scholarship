begin;

create table public.application_configuration (
  singleton boolean primary key default true check (singleton),
  chapter_id uuid not null unique references public.chapters(id) on delete restrict,
  created_at timestamptz not null default now()
);

insert into public.application_configuration(singleton, chapter_id)
select true, id
from public.chapters
where (select count(*) from public.chapters) = 1
limit 1;

alter table public.access_requests
  add column chapter_id uuid references public.chapters(id) on delete restrict;

update public.access_requests requests
set chapter_id = members.chapter_id
from public.members members
where members.id = requests.possible_member_id and requests.chapter_id is null;

update public.access_requests requests
set chapter_id = configuration.chapter_id
from public.application_configuration configuration
where configuration.singleton and requests.chapter_id is null;

create index access_requests_chapter_status_idx
  on public.access_requests(chapter_id, status, created_at desc);

alter table public.application_configuration enable row level security;
revoke all on public.application_configuration from anon, authenticated;

create or replace function public.configure_first_chapter()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.application_configuration(singleton, chapter_id)
  values (true, new.id)
  on conflict (singleton) do nothing;
  return new;
end;
$$;

create trigger configure_first_chapter_after_insert
after insert on public.chapters
for each row execute function public.configure_first_chapter();

drop policy if exists access_request_self_insert on public.access_requests;
drop policy if exists access_request_admin_manage on public.access_requests;

create policy access_request_admin_manage on public.access_requests
for all to authenticated
using (chapter_id = public.current_chapter_id() and public.is_admin_or_chair())
with check (chapter_id = public.current_chapter_id() and public.is_admin_or_chair());

create or replace function public.submit_access_request(
  requested_name text,
  authenticated_name text,
  authenticated_email text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_chapter_id uuid;
  v_request_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  if nullif(trim(requested_name), '') is null or char_length(trim(requested_name)) > 150 then
    raise exception 'Requested name is invalid';
  end if;
  select chapter_id into v_chapter_id from public.application_configuration where singleton;
  if v_chapter_id is null then raise exception 'Chapter access is not configured'; end if;
  insert into public.access_requests(chapter_id, profile_id, requested_name, authenticated_name, authenticated_email)
  values (v_chapter_id, auth.uid(), trim(requested_name), nullif(trim(authenticated_name), ''), lower(trim(authenticated_email)))
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
  if v_member.profile_id is not null then raise exception 'Member already has a linked Google account'; end if;
  if exists (select 1 from public.members where profile_id = v_request.profile_id) then raise exception 'Google account is already linked'; end if;
  update public.members set profile_id = v_request.profile_id, updated_at = now() where id = v_member.id;
  update public.access_requests set status = 'approved', possible_member_id = v_member.id, reviewed_by = auth.uid(), reviewed_at = now() where id = v_request.id;
  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, after_state)
  values (v_chapter_id, auth.uid(), 'account_link_approved', 'member', v_member.id::text,
    jsonb_build_object('profile_id', v_request.profile_id, 'access_request_id', v_request.id));
end;
$$;

create or replace function public.reject_access_request(request_id uuid, reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_request public.access_requests%rowtype;
  v_chapter_id uuid := public.current_chapter_id();
begin
  if not public.is_admin_or_chair() then raise exception 'Not authorized'; end if;
  if nullif(trim(reason), '') is null then raise exception 'A reason is required'; end if;
  select * into v_request from public.access_requests
  where id = request_id and chapter_id = v_chapter_id and status = 'pending' for update;
  if v_request.id is null then raise exception 'Pending request was not found'; end if;
  update public.access_requests set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), rejection_reason = trim(reason)
  where id = v_request.id;
  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, before_state, after_state, reason)
  values (v_chapter_id, auth.uid(), 'account_link_rejected', 'access_request', v_request.id::text,
    jsonb_build_object('status', v_request.status), jsonb_build_object('status', 'rejected'), trim(reason));
end;
$$;

revoke all on function public.submit_access_request(text, text, text) from public, anon;
grant execute on function public.submit_access_request(text, text, text) to authenticated;

commit;
