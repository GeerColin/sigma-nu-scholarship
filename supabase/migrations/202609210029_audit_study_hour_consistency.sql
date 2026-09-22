begin;

create or replace function public.refresh_study_hour_assignment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_rule_set_id uuid;
  v_has_d boolean;
  v_has_f boolean;
  v_hours integer;
  v_existing public.study_hour_assignments%rowtype;
begin
  if not new.is_current or new.estimated_gpa_snapshot is null then return new; end if;
  select id into v_rule_set_id from public.study_hour_rule_sets where chapter_id = new.chapter_id and active order by version desc limit 1;
  if v_rule_set_id is null then return new; end if;
  select coalesce(bool_or(letter_equivalent = 'D'), false), coalesce(bool_or(letter_equivalent = 'F'), false)
    into v_has_d, v_has_f from public.grade_entries where submission_id = new.id;
  v_hours := public.calculate_study_hour_requirement(v_rule_set_id, new.estimated_gpa_snapshot, v_has_d, v_has_f);
  select * into v_existing from public.study_hour_assignments where member_id = new.member_id and week_id = new.week_id for update;
  if v_existing.id is null then
    insert into public.study_hour_assignments(chapter_id, member_id, week_id, rule_set_id, estimated_gpa_used, had_d, had_f, automatic_hours, final_hours)
    values (new.chapter_id, new.member_id, new.week_id, v_rule_set_id, new.estimated_gpa_snapshot, v_has_d, v_has_f, v_hours, v_hours);
  elsif v_existing.state in ('draft', 'ready') then
    update public.study_hour_assignments set
      rule_set_id = v_rule_set_id, estimated_gpa_used = new.estimated_gpa_snapshot, had_d = v_has_d, had_f = v_has_f,
      automatic_hours = v_hours, final_hours = coalesce(override_hours, v_hours), proposed_hours = null, updated_at = now()
    where id = v_existing.id;
  elsif v_existing.state in ('frozen', 'review_required') and v_existing.final_hours <> coalesce(v_existing.override_hours, v_hours) then
    update public.study_hour_assignments set state = 'review_required', proposed_hours = coalesce(override_hours, v_hours), updated_at = now() where id = v_existing.id;
  elsif v_existing.state = 'review_required' and v_existing.final_hours = coalesce(v_existing.override_hours, v_hours) then
    -- The latest grades no longer propose a change. Never leave an obsolete
    -- proposal available for an administrator to accept.
    update public.study_hour_assignments set state = 'frozen', proposed_hours = null, updated_at = now() where id = v_existing.id;
  end if;
  return new;
end;
$$;

-- Keep the documented Admin/Chair self-edit capability, without allowing edits
-- to another proctor's record. Week boundaries follow the semester timezone.
create or replace function public.edit_own_current_week_session(session_id uuid, new_session_date date, new_duration_minutes integer, new_notes text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_session public.study_sessions%rowtype;
begin
  if not (public.has_chapter_role('proctor') or public.is_admin_or_chair()) then raise exception 'Not authorized'; end if;
  select * into v_session from public.study_sessions where id = session_id and proctor_member_id = public.current_member_id() and voided_at is null for update;
  if v_session.id is null then raise exception 'Session was not found'; end if;
  if not exists (select 1 from public.academic_weeks w join public.semesters s on s.id = w.semester_id where w.id = v_session.week_id and timezone(s.timezone, now())::date between w.starts_on and w.ends_on and new_session_date between w.starts_on and w.ends_on) then raise exception 'The session is locked because its week has ended'; end if;
  if new_duration_minutes <= 0 or new_duration_minutes > 1440 then raise exception 'Duration must be positive integer minutes'; end if;
  update public.study_sessions set session_date = new_session_date, duration_minutes = new_duration_minutes, notes = nullif(trim(new_notes), ''), updated_at = now() where id = session_id;
  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, before_state, after_state)
  values (v_session.chapter_id, auth.uid(), 'study_session_edited', 'study_session', session_id::text,
    jsonb_build_object('session_date', v_session.session_date, 'duration_minutes', v_session.duration_minutes, 'notes', v_session.notes),
    jsonb_build_object('session_date', new_session_date, 'duration_minutes', new_duration_minutes, 'notes', nullif(trim(new_notes), '')));
end;
$$;

commit;
