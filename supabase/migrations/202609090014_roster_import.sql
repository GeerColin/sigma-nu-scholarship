begin;

create or replace function public.import_roster_members(import_rows jsonb)
returns table(inserted_count integer, duplicate_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chapter_id uuid := public.current_chapter_id();
  v_row jsonb;
  v_first_name text;
  v_last_name text;
  v_full_name text;
  v_status public.member_status;
  v_member_id uuid;
  v_import_id uuid := gen_random_uuid();
begin
  if not public.is_admin_or_chair() or v_chapter_id is null then
    raise exception 'Not authorized';
  end if;
  if jsonb_typeof(import_rows) <> 'array' then
    raise exception 'Roster rows must be an array';
  end if;
  if jsonb_array_length(import_rows) < 1 or jsonb_array_length(import_rows) > 1000 then
    raise exception 'Roster import must contain between 1 and 1000 rows';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_chapter_id::text, 0));
  inserted_count := 0;
  duplicate_count := 0;

  for v_row in select value from jsonb_array_elements(import_rows)
  loop
    if jsonb_typeof(v_row) <> 'object' then
      raise exception 'Every roster row must be an object';
    end if;
    v_first_name := pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(v_row ->> 'firstName', '')), '[[:space:]]+', ' ', 'g');
    v_last_name := pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(v_row ->> 'lastName', '')), '[[:space:]]+', ' ', 'g');
    v_full_name := v_first_name || ' ' || v_last_name;

    if v_first_name = '' or v_last_name = '' or char_length(v_first_name) > 100
      or char_length(v_last_name) > 100 or char_length(v_full_name) > 150 then
      raise exception 'Roster row contains an invalid name';
    end if;
    if coalesce(v_row ->> 'status', '') not in ('active', 'inactive', 'alumni') then
      raise exception 'Roster row contains an invalid status';
    end if;
    v_status := (v_row ->> 'status')::public.member_status;

    if exists (
      select 1
      from public.members m
      where m.chapter_id = v_chapter_id
        and pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(m.full_name), '[[:space:]]+', ' ', 'g')) = pg_catalog.lower(v_full_name)
    ) then
      duplicate_count := duplicate_count + 1;
      continue;
    end if;

    insert into public.members(chapter_id, full_name, status)
    values (v_chapter_id, v_full_name, v_status)
    returning id into v_member_id;

    insert into public.member_roles(chapter_id, member_id, role, active, granted_by)
    values (v_chapter_id, v_member_id, 'member', true, auth.uid());
    inserted_count := inserted_count + 1;
  end loop;

  insert into public.audit_log(
    chapter_id,
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    after_state,
    reason
  ) values (
    v_chapter_id,
    auth.uid(),
    'roster_imported',
    'roster_import',
    v_import_id::text,
    jsonb_build_object(
      'inserted_count', inserted_count,
      'duplicate_count', duplicate_count,
      'submitted_count', jsonb_array_length(import_rows)
    ),
    'Confirmed CSV roster import'
  );

  return next;
end;
$$;

revoke all on function public.import_roster_members(jsonb) from public;
grant execute on function public.import_roster_members(jsonb) to authenticated;

commit;
