begin;

drop policy if exists sessions_proctor_insert on public.study_sessions;
drop policy if exists sessions_proctor_current_week_update on public.study_sessions;

create or replace function public.calculate_study_hour_requirement(
  selected_rule_set_id uuid,
  estimated_gpa numeric,
  has_d boolean,
  has_f boolean
)
returns integer language plpgsql stable security definer set search_path = '' as $$
declare
  v_rules public.study_hour_rule_sets%rowtype;
  v_base integer;
  v_adjustment integer;
begin
  if estimated_gpa is null or estimated_gpa < 0 or estimated_gpa > 4 then raise exception 'Estimated GPA must be between 0 and 4'; end if;
  select * into v_rules from public.study_hour_rule_sets where id = selected_rule_set_id;
  if v_rules.id is null then raise exception 'Study-hour rule set was not found'; end if;
  select base_hours into v_base from public.study_hour_bands
    where rule_set_id = selected_rule_set_id and estimated_gpa <= maximum_gpa and (minimum_gpa is null or estimated_gpa >= minimum_gpa)
    order by sort_order limit 1;
  if v_base is null then raise exception 'Study-hour rule set does not cover this GPA'; end if;
  v_adjustment := case when has_f then v_rules.f_adjustment_hours when has_d then v_rules.d_adjustment_hours else 0 end;
  return least(v_base + v_adjustment, v_rules.maximum_hours);
end;
$$;

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
  end if;
  return new;
end;
$$;

create trigger grade_submission_refreshes_assignment
after update of estimated_gpa_snapshot on public.grade_submissions
for each row execute function public.refresh_study_hour_assignment();

create or replace function public.override_study_hour_assignment(assignment_id uuid, new_hours integer, reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_assignment public.study_hour_assignments%rowtype;
begin
  if not public.is_admin_or_chair() then raise exception 'Not authorized'; end if;
  if new_hours < 0 or new_hours > 24 then raise exception 'Override hours must be between 0 and 24'; end if;
  if nullif(trim(reason), '') is null then raise exception 'A reason is required'; end if;
  select * into v_assignment from public.study_hour_assignments where id = assignment_id and chapter_id = public.current_chapter_id() for update;
  if v_assignment.id is null then raise exception 'Assignment was not found'; end if;
  update public.study_hour_assignments set override_hours = new_hours, override_reason = trim(reason), override_actor = auth.uid(), override_at = now(), final_hours = new_hours, updated_at = now() where id = assignment_id;
  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, before_state, after_state, reason)
  values (v_assignment.chapter_id, auth.uid(), 'study_hours_overridden', 'study_hour_assignment', assignment_id::text,
    jsonb_build_object('automatic_hours', v_assignment.automatic_hours, 'override_hours', v_assignment.override_hours, 'final_hours', v_assignment.final_hours),
    jsonb_build_object('automatic_hours', v_assignment.automatic_hours, 'override_hours', new_hours, 'final_hours', new_hours), trim(reason));
end;
$$;

create or replace function public.remove_study_hour_override(assignment_id uuid, reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_assignment public.study_hour_assignments%rowtype;
begin
  if not public.is_admin_or_chair() then raise exception 'Not authorized'; end if;
  if nullif(trim(reason), '') is null then raise exception 'A reason is required'; end if;
  select * into v_assignment from public.study_hour_assignments where id = assignment_id and chapter_id = public.current_chapter_id() for update;
  if v_assignment.id is null or v_assignment.override_hours is null then raise exception 'Active override was not found'; end if;
  update public.study_hour_assignments set override_hours = null, override_reason = null, override_actor = null, override_at = null, final_hours = automatic_hours, updated_at = now() where id = assignment_id;
  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, before_state, after_state, reason)
  values (v_assignment.chapter_id, auth.uid(), 'study_hours_override_removed', 'study_hour_assignment', assignment_id::text,
    jsonb_build_object('override_hours', v_assignment.override_hours, 'final_hours', v_assignment.final_hours),
    jsonb_build_object('override_hours', null, 'final_hours', v_assignment.automatic_hours), trim(reason));
end;
$$;

create or replace function public.freeze_study_hour_assignment(assignment_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_assignment public.study_hour_assignments%rowtype;
begin
  if not public.is_admin_or_chair() then raise exception 'Not authorized'; end if;
  select * into v_assignment from public.study_hour_assignments where id = assignment_id and chapter_id = public.current_chapter_id() for update;
  if v_assignment.id is null then raise exception 'Assignment was not found'; end if;
  if v_assignment.state not in ('draft', 'ready') then raise exception 'Only an unfrozen assignment can be frozen'; end if;
  update public.study_hour_assignments set state = 'frozen', frozen_at = now(), proposed_hours = null, updated_at = now() where id = assignment_id;
  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, after_state)
  values (v_assignment.chapter_id, auth.uid(), 'study_hours_frozen', 'study_hour_assignment', assignment_id::text, jsonb_build_object('final_hours', v_assignment.final_hours));
end;
$$;

create or replace function public.resolve_frozen_assignment(assignment_id uuid, update_to_proposed boolean, reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_assignment public.study_hour_assignments%rowtype;
begin
  if not public.is_admin_or_chair() then raise exception 'Not authorized'; end if;
  if nullif(trim(reason), '') is null then raise exception 'A reason is required'; end if;
  select * into v_assignment from public.study_hour_assignments where id = assignment_id and chapter_id = public.current_chapter_id() and state = 'review_required' for update;
  if v_assignment.id is null or v_assignment.proposed_hours is null then raise exception 'No frozen-assignment review is pending'; end if;
  update public.study_hour_assignments set final_hours = case when update_to_proposed then proposed_hours else final_hours end,
    automatic_hours = case when update_to_proposed and override_hours is null then proposed_hours else automatic_hours end,
    state = 'frozen', proposed_hours = null, updated_at = now() where id = assignment_id;
  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, before_state, after_state, reason)
  values (v_assignment.chapter_id, auth.uid(), case when update_to_proposed then 'frozen_assignment_updated' else 'frozen_assignment_kept' end,
    'study_hour_assignment', assignment_id::text, jsonb_build_object('final_hours', v_assignment.final_hours, 'proposed_hours', v_assignment.proposed_hours),
    jsonb_build_object('final_hours', case when update_to_proposed then v_assignment.proposed_hours else v_assignment.final_hours end), trim(reason));
end;
$$;

create or replace function public.record_study_session(target_member_id uuid, target_week_id uuid, session_date date, duration_minutes integer, notes text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_chapter_id uuid := public.current_chapter_id();
begin
  if not (public.has_chapter_role('proctor') or public.is_admin_or_chair()) then raise exception 'Not authorized'; end if;
  if duration_minutes <= 0 or duration_minutes > 1440 then raise exception 'Duration must be positive integer minutes'; end if;
  if not exists (select 1 from public.members where id = target_member_id and chapter_id = v_chapter_id and status = 'active') then raise exception 'Active member was not found'; end if;
  if not exists (select 1 from public.academic_weeks where id = target_week_id and chapter_id = v_chapter_id and session_date between starts_on and ends_on) then raise exception 'Session date does not belong to the selected week'; end if;
  insert into public.study_sessions(chapter_id, member_id, proctor_member_id, week_id, session_date, duration_minutes, notes)
  values (v_chapter_id, target_member_id, public.current_member_id(), target_week_id, session_date, duration_minutes, nullif(trim(notes), '')) returning id into v_id;
  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, after_state)
  values (v_chapter_id, auth.uid(), 'study_session_recorded', 'study_session', v_id::text, jsonb_build_object('member_id', target_member_id, 'week_id', target_week_id, 'duration_minutes', duration_minutes));
  return v_id;
end;
$$;

create or replace function public.edit_own_current_week_session(session_id uuid, new_session_date date, new_duration_minutes integer, new_notes text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_session public.study_sessions%rowtype;
begin
  if not public.has_chapter_role('proctor') then raise exception 'Not authorized'; end if;
  select * into v_session from public.study_sessions where id = session_id and proctor_member_id = public.current_member_id() and voided_at is null for update;
  if v_session.id is null then raise exception 'Session was not found'; end if;
  if not exists (select 1 from public.academic_weeks where id = v_session.week_id and current_date between starts_on and ends_on and new_session_date between starts_on and ends_on) then raise exception 'The session is locked because its week has ended'; end if;
  if new_duration_minutes <= 0 or new_duration_minutes > 1440 then raise exception 'Duration must be positive integer minutes'; end if;
  update public.study_sessions set session_date = new_session_date, duration_minutes = new_duration_minutes, notes = nullif(trim(new_notes), ''), updated_at = now() where id = session_id;
  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, before_state, after_state)
  values (v_session.chapter_id, auth.uid(), 'study_session_edited', 'study_session', session_id::text,
    jsonb_build_object('session_date', v_session.session_date, 'duration_minutes', v_session.duration_minutes, 'notes', v_session.notes),
    jsonb_build_object('session_date', new_session_date, 'duration_minutes', new_duration_minutes, 'notes', nullif(trim(new_notes), '')));
end;
$$;

revoke all on function public.calculate_study_hour_requirement(uuid, numeric, boolean, boolean) from public;
revoke all on function public.override_study_hour_assignment(uuid, integer, text) from public;
revoke all on function public.remove_study_hour_override(uuid, text) from public;
revoke all on function public.freeze_study_hour_assignment(uuid) from public;
revoke all on function public.resolve_frozen_assignment(uuid, boolean, text) from public;
revoke all on function public.record_study_session(uuid, uuid, date, integer, text) from public;
revoke all on function public.edit_own_current_week_session(uuid, date, integer, text) from public;
grant execute on function public.calculate_study_hour_requirement(uuid, numeric, boolean, boolean) to authenticated;
grant execute on function public.override_study_hour_assignment(uuid, integer, text) to authenticated;
grant execute on function public.remove_study_hour_override(uuid, text) to authenticated;
grant execute on function public.freeze_study_hour_assignment(uuid) to authenticated;
grant execute on function public.resolve_frozen_assignment(uuid, boolean, text) to authenticated;
grant execute on function public.record_study_session(uuid, uuid, date, integer, text) to authenticated;
grant execute on function public.edit_own_current_week_session(uuid, date, integer, text) to authenticated;

commit;

