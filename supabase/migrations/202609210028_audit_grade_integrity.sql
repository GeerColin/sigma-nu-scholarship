begin;

-- Serialize competing additions for the same member before checking the cap.
-- No chapter-wide lock: unrelated members can still add courses concurrently.
create or replace function public.enforce_active_course_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.archived_at is null then
    perform 1 from public.members where id = new.member_id for update;
    if (select count(*) from public.courses
      where member_id = new.member_id and semester_id = new.semester_id
        and archived_at is null and id <> new.id) >= 8 then
      raise exception 'A member may have at most 8 active courses per semester';
    end if;
  end if;
  return new;
end;
$$;

-- Preserve revision history across deadline and grading-type corrections.
create or replace function public.submit_weekly_checkin(target_week_id uuid, submitted_entries jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_member_id uuid := public.current_member_id();
  v_chapter_id uuid := public.current_chapter_id();
  v_week public.academic_weeks%rowtype;
  v_semester public.semesters%rowtype;
  v_previous public.grade_submissions%rowtype;
  v_submission_id uuid;
  v_revision integer;
  v_original_at timestamptz;
  v_original_timing public.submission_timing;
  v_revision_timing public.submission_timing;
  v_item jsonb;
  v_course public.courses%rowtype;
  v_value jsonb;
  v_points numeric;
  v_letter text;
  v_included boolean;
  v_scale jsonb;
  v_band jsonb;
  v_numerator numeric := 0;
  v_denominator numeric := 0;
  v_included_count integer := 0;
  v_active_count integer;
  v_seen uuid[] := array[]::uuid[];
  v_previous_value numeric;
  v_alert_threshold numeric;
begin
  if v_member_id is null then raise exception 'An approved member account is required'; end if;
  if not exists (select 1 from public.members where id = v_member_id and status = 'active') then raise exception 'Only active members may submit grades'; end if;
  if submitted_entries is null or jsonb_typeof(submitted_entries) <> 'array' then raise exception 'Entries must be an array'; end if;
  if jsonb_array_length(submitted_entries) not between 1 and 8 then raise exception 'Submit between 1 and 8 course entries'; end if;
  select * into v_week from public.academic_weeks where id = target_week_id and chapter_id = v_chapter_id for update;
  if v_week.id is null then raise exception 'Academic week was not found'; end if;
  select * into v_semester from public.semesters where id = v_week.semester_id;
  select count(*) into v_active_count from public.courses where member_id = v_member_id and semester_id = v_week.semester_id and archived_at is null;
  if jsonb_array_length(submitted_entries) <> v_active_count then raise exception 'Submit one entry for every active course'; end if;
  select * into v_previous from public.grade_submissions where member_id = v_member_id and week_id = target_week_id and is_current for update;
  select coalesce(max(revision_number), 0) + 1 into v_revision from public.grade_submissions where member_id = v_member_id and week_id = target_week_id;
  v_original_at := coalesce(v_previous.original_submitted_at, now());
  v_original_timing := coalesce(v_previous.original_timing, case when v_original_at <= v_week.deadline_at then 'on_time'::public.submission_timing else 'late'::public.submission_timing end);
  v_revision_timing := case when now() <= v_week.deadline_at then 'on_time'::public.submission_timing else 'late'::public.submission_timing end;
  if v_previous.id is not null then update public.grade_submissions set is_current = false where id = v_previous.id; end if;
  insert into public.grade_submissions(chapter_id, member_id, week_id, revision_number, previous_revision_id, original_submitted_at, deadline_at_snapshot, original_timing, revision_timing, active_course_count)
  values (v_chapter_id, v_member_id, target_week_id, v_revision, v_previous.id, v_original_at, v_week.deadline_at, v_original_timing, v_revision_timing, v_active_count)
  returning id into v_submission_id;

  for v_item in select value from jsonb_array_elements(submitted_entries) loop
    select * into v_course from public.courses
      where id = (v_item ->> 'courseId')::uuid and member_id = v_member_id and semester_id = v_week.semester_id and archived_at is null;
    if v_course.id is null or v_course.id = any(v_seen) then raise exception 'Invalid or duplicate course entry'; end if;
    v_seen := array_append(v_seen, v_course.id);
    v_value := v_item -> 'value';
    v_points := null; v_letter := null; v_included := false; v_scale := null;

    if v_course.grading_type = 'percentage' then
      if jsonb_typeof(v_value) <> 'number' or (v_value #>> '{}')::numeric < 0 or (v_value #>> '{}')::numeric > 100 then raise exception 'Percentage must be between 0 and 100'; end if;
      select scale into v_scale from public.grading_scales where id = v_course.grading_scale_id;
      v_scale := coalesce(v_scale, '[{"letter":"A","minimum":90,"gradePoints":4},{"letter":"B","minimum":80,"gradePoints":3},{"letter":"C","minimum":70,"gradePoints":2},{"letter":"D","minimum":60,"gradePoints":1},{"letter":"F","minimum":0,"gradePoints":0}]'::jsonb);
      select band into v_band from jsonb_array_elements(v_scale) band where (v_value #>> '{}')::numeric >= (band ->> 'minimum')::numeric order by (band ->> 'minimum')::numeric desc limit 1;
      if v_band is null then raise exception 'Grading scale does not cover the submitted percentage'; end if;
      v_points := (v_band ->> 'gradePoints')::numeric; v_letter := v_band ->> 'letter'; v_included := true;
    elsif v_course.grading_type = 'letter' then
      v_letter := upper(trim(v_value #>> '{}'));
      v_points := case v_letter when 'A' then 4 when 'B' then 3 when 'C' then 2 when 'D' then 1 when 'F' then 0 else null end;
      if v_points is null then raise exception 'Letter grade must be A, B, C, D, or F'; end if;
      v_included := true;
    elsif v_course.grading_type = 'pass_fail' then
      if upper(trim(v_value #>> '{}')) not in ('PASS', 'FAIL') then raise exception 'Pass/Fail value must be Pass or Fail'; end if;
    elsif v_course.grading_type = 'custom' then
      if nullif(trim(v_value #>> '{}'), '') is null then raise exception 'Custom course standing is required'; end if;
    end if;

    insert into public.grade_entries(chapter_id, submission_id, course_id, course_name_snapshot, credit_hours_snapshot, grading_type_snapshot, grading_scale_snapshot, reported_value, included_in_gpa, gpa_points, letter_equivalent)
    values (v_chapter_id, v_submission_id, v_course.id, v_course.name, v_course.credit_hours, v_course.grading_type, v_scale, v_value, v_included, v_points, v_letter);
    if v_included then
      v_numerator := v_numerator + v_points * case when v_semester.gpa_weighting = 'credit_hours' then v_course.credit_hours else 1 end;
      v_denominator := v_denominator + case when v_semester.gpa_weighting = 'credit_hours' then v_course.credit_hours else 1 end;
      v_included_count := v_included_count + 1;
    end if;

    if v_previous.id is not null and v_course.grading_type = 'percentage' then
      select case when jsonb_typeof(reported_value) = 'number' then (reported_value #>> '{}')::numeric end into v_previous_value from public.grade_entries where submission_id = v_previous.id and course_id = v_course.id and grading_type_snapshot = 'percentage';
      select percentage_alert_drop into v_alert_threshold from public.chapter_settings where chapter_id = v_chapter_id;
      if v_previous_value is not null and v_previous_value - (v_value #>> '{}')::numeric >= coalesce(v_alert_threshold, 10) then
        insert into public.academic_alerts(chapter_id, member_id, course_id, submission_id, alert_type, details)
        values (v_chapter_id, v_member_id, v_course.id, v_submission_id, 'percentage_drop', jsonb_build_object('previous', v_previous_value, 'current', (v_value #>> '{}')::numeric));
      end if;
    end if;
  end loop;

  update public.grade_submissions set estimated_gpa_snapshot = case when v_denominator > 0 then round(v_numerator / v_denominator, 2) else null end, included_course_count = v_included_count where id = v_submission_id;
  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, after_state)
  values (v_chapter_id, auth.uid(), case when v_revision = 1 then 'grade_submission_created' else 'grade_submission_revised' end,
    'grade_submission', v_submission_id::text, jsonb_build_object('revision', v_revision, 'original_timing', v_original_timing, 'revision_timing', v_revision_timing));
  return v_submission_id;
end;
$$;

commit;
