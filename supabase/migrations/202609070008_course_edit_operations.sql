begin;

create or replace function public.create_member_course_configured(
  course_name text,
  course_credit_hours numeric,
  course_grading_type public.grading_type,
  course_custom_description text default null,
  percentage_a_min numeric default null,
  percentage_b_min numeric default null,
  percentage_c_min numeric default null,
  percentage_d_min numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid := public.current_member_id();
  v_chapter_id uuid := public.current_chapter_id();
  v_semester_id uuid;
  v_course_id uuid := gen_random_uuid();
  v_scale_id uuid;
  v_has_custom_scale boolean := percentage_a_min is not null
    or percentage_b_min is not null
    or percentage_c_min is not null
    or percentage_d_min is not null;
begin
  if v_member_id is null then raise exception 'An approved member account is required'; end if;
  if not exists (select 1 from public.members where id = v_member_id and status = 'active') then
    raise exception 'Only active members may add courses';
  end if;
  if char_length(trim(course_name)) not between 1 and 160 then raise exception 'Course name is required'; end if;
  if course_credit_hours <= 0 or course_credit_hours > 24 then raise exception 'Credit hours must be between 0 and 24'; end if;
  if course_grading_type = 'custom' and nullif(trim(course_custom_description), '') is null then
    raise exception 'Describe the custom grading system';
  end if;
  if course_grading_type <> 'percentage' and v_has_custom_scale then
    raise exception 'Percentage thresholds apply only to percentage courses';
  end if;
  if v_has_custom_scale and (
    percentage_a_min is null or percentage_b_min is null
    or percentage_c_min is null or percentage_d_min is null
    or percentage_a_min > 100
    or percentage_a_min <= percentage_b_min
    or percentage_b_min <= percentage_c_min
    or percentage_c_min <= percentage_d_min
    or percentage_d_min <= 0
  ) then
    raise exception 'Percentage thresholds must descend from A through D';
  end if;

  select id into v_semester_id
  from public.semesters
  where chapter_id = v_chapter_id and active
  limit 1;
  if v_semester_id is null then raise exception 'No active semester is configured'; end if;

  if v_has_custom_scale then
    insert into public.grading_scales(
      chapter_id, name, version, scale, active, created_by
    )
    values (
      v_chapter_id,
      'Course ' || v_course_id::text,
      1,
      jsonb_build_array(
        jsonb_build_object('letter', 'A', 'minimum', percentage_a_min, 'gradePoints', 4),
        jsonb_build_object('letter', 'B', 'minimum', percentage_b_min, 'gradePoints', 3),
        jsonb_build_object('letter', 'C', 'minimum', percentage_c_min, 'gradePoints', 2),
        jsonb_build_object('letter', 'D', 'minimum', percentage_d_min, 'gradePoints', 1),
        jsonb_build_object('letter', 'F', 'minimum', 0, 'gradePoints', 0)
      ),
      true,
      auth.uid()
    )
    returning id into v_scale_id;
  end if;

  insert into public.courses(
    id, chapter_id, member_id, semester_id, name, credit_hours,
    grading_type, grading_scale_id, custom_grading_description
  )
  values (
    v_course_id, v_chapter_id, v_member_id, v_semester_id, trim(course_name),
    course_credit_hours, course_grading_type, v_scale_id,
    case when course_grading_type = 'custom'
      then nullif(trim(course_custom_description), '') else null end
  );

  insert into public.audit_log(
    chapter_id, actor_profile_id, action, entity_type, entity_id, after_state
  )
  values (
    v_chapter_id, auth.uid(), 'course_created', 'course', v_course_id::text,
    jsonb_build_object(
      'name', trim(course_name),
      'credit_hours', course_credit_hours,
      'grading_type', course_grading_type,
      'custom_percentage_scale', v_has_custom_scale
    )
  );
  return v_course_id;
end;
$$;

create or replace function public.update_member_course(
  target_course_id uuid,
  course_name text,
  course_credit_hours numeric,
  course_grading_type public.grading_type,
  course_custom_description text default null,
  percentage_a_min numeric default null,
  percentage_b_min numeric default null,
  percentage_c_min numeric default null,
  percentage_d_min numeric default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course public.courses%rowtype;
  v_scale_id uuid;
  v_scale_version integer;
  v_scale_name text := 'Course ' || target_course_id::text;
  v_has_custom_scale boolean := percentage_a_min is not null
    or percentage_b_min is not null
    or percentage_c_min is not null
    or percentage_d_min is not null;
begin
  select * into v_course
  from public.courses
  where id = target_course_id
    and member_id = public.current_member_id()
    and archived_at is null
  for update;
  if v_course.id is null then raise exception 'Active course was not found'; end if;
  if char_length(trim(course_name)) not between 1 and 160 then raise exception 'Course name is required'; end if;
  if course_credit_hours <= 0 or course_credit_hours > 24 then raise exception 'Credit hours must be between 0 and 24'; end if;
  if course_grading_type = 'custom' and nullif(trim(course_custom_description), '') is null then
    raise exception 'Describe the custom grading system';
  end if;
  if course_grading_type <> 'percentage' and v_has_custom_scale then
    raise exception 'Percentage thresholds apply only to percentage courses';
  end if;
  if v_has_custom_scale and (
    percentage_a_min is null or percentage_b_min is null
    or percentage_c_min is null or percentage_d_min is null
    or percentage_a_min > 100
    or percentage_a_min <= percentage_b_min
    or percentage_b_min <= percentage_c_min
    or percentage_c_min <= percentage_d_min
    or percentage_d_min <= 0
  ) then
    raise exception 'Percentage thresholds must descend from A through D';
  end if;

  if v_has_custom_scale then
    select coalesce(max(version), 0) + 1 into v_scale_version
    from public.grading_scales
    where chapter_id = v_course.chapter_id and name = v_scale_name;
    update public.grading_scales
    set active = false
    where chapter_id = v_course.chapter_id and name = v_scale_name and active;
    insert into public.grading_scales(
      chapter_id, name, version, scale, active, created_by
    )
    values (
      v_course.chapter_id,
      v_scale_name,
      v_scale_version,
      jsonb_build_array(
        jsonb_build_object('letter', 'A', 'minimum', percentage_a_min, 'gradePoints', 4),
        jsonb_build_object('letter', 'B', 'minimum', percentage_b_min, 'gradePoints', 3),
        jsonb_build_object('letter', 'C', 'minimum', percentage_c_min, 'gradePoints', 2),
        jsonb_build_object('letter', 'D', 'minimum', percentage_d_min, 'gradePoints', 1),
        jsonb_build_object('letter', 'F', 'minimum', 0, 'gradePoints', 0)
      ),
      true,
      auth.uid()
    )
    returning id into v_scale_id;
  end if;

  update public.courses
  set name = trim(course_name),
      credit_hours = course_credit_hours,
      grading_type = course_grading_type,
      grading_scale_id = v_scale_id,
      custom_grading_description = case
        when course_grading_type = 'custom'
          then nullif(trim(course_custom_description), '')
        else null
      end,
      updated_at = now()
  where id = v_course.id;

  insert into public.audit_log(
    chapter_id, actor_profile_id, action, entity_type, entity_id,
    before_state, after_state
  )
  values (
    v_course.chapter_id, auth.uid(), 'course_updated', 'course', v_course.id::text,
    jsonb_build_object(
      'name', v_course.name,
      'credit_hours', v_course.credit_hours,
      'grading_type', v_course.grading_type,
      'grading_scale_id', v_course.grading_scale_id,
      'custom_grading_description', v_course.custom_grading_description
    ),
    jsonb_build_object(
      'name', trim(course_name),
      'credit_hours', course_credit_hours,
      'grading_type', course_grading_type,
      'grading_scale_id', v_scale_id,
      'custom_grading_description', case
        when course_grading_type = 'custom'
          then nullif(trim(course_custom_description), '')
        else null
      end
    )
  );
end;
$$;

revoke all on function public.create_member_course_configured(text, numeric, public.grading_type, text, numeric, numeric, numeric, numeric) from public;
revoke all on function public.update_member_course(uuid, text, numeric, public.grading_type, text, numeric, numeric, numeric, numeric) from public;
grant execute on function public.create_member_course_configured(text, numeric, public.grading_type, text, numeric, numeric, numeric, numeric) to authenticated;
grant execute on function public.update_member_course(uuid, text, numeric, public.grading_type, text, numeric, numeric, numeric, numeric) to authenticated;

commit;

