begin;

create or replace function public.configure_study_hour_rule_set(
  p_gpa_350_400_hours integer,
  p_gpa_300_349_hours integer,
  p_gpa_275_299_hours integer,
  p_gpa_250_274_hours integer,
  p_gpa_225_249_hours integer,
  p_gpa_200_224_hours integer,
  p_gpa_below_200_hours integer,
  p_d_adjustment_hours integer,
  p_f_adjustment_hours integer,
  p_maximum_hours integer,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chapter_id uuid := public.current_chapter_id();
  v_rule_set_id uuid;
  v_version integer;
  v_before jsonb;
begin
  if v_chapter_id is null or not public.is_admin_or_chair() then
    raise exception 'Not authorized';
  end if;

  if coalesce(nullif(trim(p_reason), ''), '') = '' then
    raise exception 'A change reason is required';
  end if;

  if array_position(
      array[
        p_gpa_350_400_hours,
        p_gpa_300_349_hours,
        p_gpa_275_299_hours,
        p_gpa_250_274_hours,
        p_gpa_225_249_hours,
        p_gpa_200_224_hours,
        p_gpa_below_200_hours,
        p_d_adjustment_hours,
        p_f_adjustment_hours,
        p_maximum_hours
      ],
      null
    ) is not null
    or p_d_adjustment_hours not between 0 and 24
    or p_f_adjustment_hours not between 0 and 24
    or p_f_adjustment_hours < p_d_adjustment_hours
    or p_maximum_hours not between 0 and 24
    or p_gpa_350_400_hours not between 0 and 24
    or p_gpa_300_349_hours not between 0 and 24
    or p_gpa_275_299_hours not between 0 and 24
    or p_gpa_250_274_hours not between 0 and 24
    or p_gpa_225_249_hours not between 0 and 24
    or p_gpa_200_224_hours not between 0 and 24
    or p_gpa_below_200_hours not between 0 and 24 then
    raise exception 'Study-hour values must be integers between 0 and 24, and the F adjustment cannot be lower than the D adjustment';
  end if;

  perform 1 from public.chapters where id = v_chapter_id for update;

  select jsonb_build_object(
    'id', rules.id,
    'version', rules.version,
    'd_adjustment_hours', rules.d_adjustment_hours,
    'f_adjustment_hours', rules.f_adjustment_hours,
    'maximum_hours', rules.maximum_hours
  )
  into v_before
  from public.study_hour_rule_sets rules
  where rules.chapter_id = v_chapter_id and rules.active
  order by rules.version desc
  limit 1;

  select coalesce(max(rules.version), 0) + 1
  into v_version
  from public.study_hour_rule_sets rules
  where rules.chapter_id = v_chapter_id;

  update public.study_hour_rule_sets
  set active = false
  where chapter_id = v_chapter_id and active;

  insert into public.study_hour_rule_sets(
    chapter_id,
    version,
    d_adjustment_hours,
    f_adjustment_hours,
    maximum_hours,
    active,
    created_by
  )
  values (
    v_chapter_id,
    v_version,
    p_d_adjustment_hours,
    p_f_adjustment_hours,
    p_maximum_hours,
    true,
    auth.uid()
  )
  returning id into v_rule_set_id;

  insert into public.study_hour_bands(rule_set_id, minimum_gpa, maximum_gpa, base_hours, sort_order)
  values
    (v_rule_set_id, 3.50, 4.00, p_gpa_350_400_hours, 1),
    (v_rule_set_id, 3.00, 3.49, p_gpa_300_349_hours, 2),
    (v_rule_set_id, 2.75, 2.99, p_gpa_275_299_hours, 3),
    (v_rule_set_id, 2.50, 2.74, p_gpa_250_274_hours, 4),
    (v_rule_set_id, 2.25, 2.49, p_gpa_225_249_hours, 5),
    (v_rule_set_id, 2.00, 2.24, p_gpa_200_224_hours, 6),
    (v_rule_set_id, null, 1.99, p_gpa_below_200_hours, 7);

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
    'study_hour_rules_configured',
    'study_hour_rule_set',
    v_rule_set_id::text,
    v_before,
    jsonb_build_object(
      'id', v_rule_set_id,
      'version', v_version,
      'd_adjustment_hours', p_d_adjustment_hours,
      'f_adjustment_hours', p_f_adjustment_hours,
      'maximum_hours', p_maximum_hours,
      'bands', jsonb_build_array(
        jsonb_build_object('minimum_gpa', 3.50, 'maximum_gpa', 4.00, 'base_hours', p_gpa_350_400_hours),
        jsonb_build_object('minimum_gpa', 3.00, 'maximum_gpa', 3.49, 'base_hours', p_gpa_300_349_hours),
        jsonb_build_object('minimum_gpa', 2.75, 'maximum_gpa', 2.99, 'base_hours', p_gpa_275_299_hours),
        jsonb_build_object('minimum_gpa', 2.50, 'maximum_gpa', 2.74, 'base_hours', p_gpa_250_274_hours),
        jsonb_build_object('minimum_gpa', 2.25, 'maximum_gpa', 2.49, 'base_hours', p_gpa_225_249_hours),
        jsonb_build_object('minimum_gpa', 2.00, 'maximum_gpa', 2.24, 'base_hours', p_gpa_200_224_hours),
        jsonb_build_object('minimum_gpa', null, 'maximum_gpa', 1.99, 'base_hours', p_gpa_below_200_hours)
      )
    ),
    trim(p_reason)
  );

  return v_rule_set_id;
end;
$$;

create or replace function public.refresh_study_hour_assignments(target_week_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chapter_id uuid := public.current_chapter_id();
  v_rule_set_id uuid;
  v_week public.academic_weeks%rowtype;
  v_submission record;
  v_existing public.study_hour_assignments%rowtype;
  v_has_d boolean;
  v_has_f boolean;
  v_hours integer;
  v_count integer := 0;
begin
  if v_chapter_id is null or not public.is_admin_or_chair() then
    raise exception 'Not authorized';
  end if;

  select * into v_week
  from public.academic_weeks
  where id = target_week_id and chapter_id = v_chapter_id;

  if v_week.id is null then
    raise exception 'Academic week was not found';
  end if;

  select id into v_rule_set_id
  from public.study_hour_rule_sets
  where chapter_id = v_chapter_id and active
  order by version desc
  limit 1;

  if v_rule_set_id is null then
    raise exception 'No active study-hour rule set is configured';
  end if;

  for v_submission in
    select submissions.id, submissions.member_id, submissions.estimated_gpa_snapshot
    from public.grade_submissions submissions
    where submissions.chapter_id = v_chapter_id
      and submissions.week_id = target_week_id
      and submissions.is_current
      and submissions.estimated_gpa_snapshot is not null
  loop
    select
      coalesce(bool_or(entries.letter_equivalent = 'D'), false),
      coalesce(bool_or(entries.letter_equivalent = 'F'), false)
    into v_has_d, v_has_f
    from public.grade_entries entries
    where entries.submission_id = v_submission.id;

    v_hours := public.calculate_study_hour_requirement(
      v_rule_set_id,
      v_submission.estimated_gpa_snapshot,
      v_has_d,
      v_has_f
    );

    select * into v_existing
    from public.study_hour_assignments
    where member_id = v_submission.member_id and week_id = target_week_id
    for update;

    if v_existing.id is null then
      insert into public.study_hour_assignments(
        chapter_id,
        member_id,
        week_id,
        rule_set_id,
        estimated_gpa_used,
        had_d,
        had_f,
        automatic_hours,
        final_hours
      )
      values (
        v_chapter_id,
        v_submission.member_id,
        target_week_id,
        v_rule_set_id,
        v_submission.estimated_gpa_snapshot,
        v_has_d,
        v_has_f,
        v_hours,
        v_hours
      );
    elsif v_existing.state in ('draft', 'ready') then
      update public.study_hour_assignments
      set
        rule_set_id = v_rule_set_id,
        estimated_gpa_used = v_submission.estimated_gpa_snapshot,
        had_d = v_has_d,
        had_f = v_has_f,
        automatic_hours = v_hours,
        final_hours = coalesce(override_hours, v_hours),
        proposed_hours = null,
        updated_at = now()
      where id = v_existing.id;
    elsif v_existing.state in ('frozen', 'review_required')
      and v_existing.final_hours <> coalesce(v_existing.override_hours, v_hours) then
      update public.study_hour_assignments
      set
        state = 'review_required',
        proposed_hours = coalesce(override_hours, v_hours),
        updated_at = now()
      where id = v_existing.id;
    end if;

    v_count := v_count + 1;
  end loop;

  insert into public.audit_log(
    chapter_id,
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    after_state
  )
  values (
    v_chapter_id,
    auth.uid(),
    'study_hour_assignments_refreshed',
    'academic_week',
    target_week_id::text,
    jsonb_build_object('rule_set_id', v_rule_set_id, 'submission_count', v_count)
  );

  return v_count;
end;
$$;

revoke all on function public.configure_study_hour_rule_set(integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, text) from public;
revoke all on function public.refresh_study_hour_assignments(uuid) from public;
grant execute on function public.configure_study_hour_rule_set(integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, text) to authenticated;
grant execute on function public.refresh_study_hour_assignments(uuid) to authenticated;

commit;
