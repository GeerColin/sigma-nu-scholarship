-- Read-only evidence query for the connected synthetic scholarship workflow.
with synthetic_members as (
  select id, full_name
  from public.members
  where notification_email like '%@scholarship.invalid'
),
active_period as (
  select s.id as semester_id, s.name as semester_name, w.id as week_id,
    w.label as week_label, w.deadline_at
  from public.semesters s
  join public.academic_weeks w on w.semester_id = s.id
  where s.active
    and current_date between w.starts_on and w.ends_on
  order by w.sequence_number
  limit 1
),
current_submissions as (
  select gs.member_id, gs.original_timing, gs.revision_timing,
    gs.revision_number, gs.estimated_gpa_snapshot
  from public.grade_submissions gs
  join synthetic_members sm on sm.id = gs.member_id
  join active_period ap on ap.week_id = gs.week_id
  where gs.is_current
),
completed_minutes as (
  select ss.member_id, sum(ss.duration_minutes)::integer as minutes
  from public.study_sessions ss
  join synthetic_members sm on sm.id = ss.member_id
  join active_period ap on ap.week_id = ss.week_id
  where ss.voided_at is null
  group by ss.member_id
)
select jsonb_build_object(
  'period', (select to_jsonb(ap) from active_period ap),
  'counts', jsonb_build_object(
    'members', (select count(*) from synthetic_members),
    'authenticated_non_login_actors', (select count(*) from public.members m join synthetic_members sm on sm.id = m.id where m.profile_id is not null),
    'courses', (select count(*) from public.courses c join synthetic_members sm on sm.id = c.member_id),
    'submissions', (select count(*) from public.grade_submissions gs join synthetic_members sm on sm.id = gs.member_id),
    'grade_entries', (select count(*) from public.grade_entries ge join public.grade_submissions gs on gs.id = ge.submission_id join synthetic_members sm on sm.id = gs.member_id),
    'alerts', (select count(*) from public.academic_alerts aa join synthetic_members sm on sm.id = aa.member_id),
    'open_alerts', (select count(*) from public.academic_alerts aa join synthetic_members sm on sm.id = aa.member_id where aa.acknowledged_at is null),
    'acknowledged_alerts', (select count(*) from public.academic_alerts aa join synthetic_members sm on sm.id = aa.member_id where aa.acknowledged_at is not null),
    'assignments', (select count(*) from public.study_hour_assignments sha join synthetic_members sm on sm.id = sha.member_id),
    'sessions', (select count(*) from public.study_sessions ss join synthetic_members sm on sm.id = ss.member_id),
    'fixture_audit_events', (select count(*) from public.audit_log where reason = 'Synthetic connected-workflow fixture'),
    'email_batches', (select count(distinct em.batch_id) from public.email_messages em where em.recipient_email like '%@scholarship.invalid'),
    'email_messages', (select count(*) from public.email_messages em where em.recipient_email like '%@scholarship.invalid'),
    'sent_email_messages', (select count(*) from public.email_messages em where em.recipient_email like '%@scholarship.invalid' and em.state = 'sent'),
    'failed_email_messages', (select count(*) from public.email_messages em where em.recipient_email like '%@scholarship.invalid' and em.state = 'failed')
  ),
  'course_types', (select jsonb_object_agg(grading_type, course_count) from (
    select c.grading_type::text as grading_type, count(*) as course_count
    from public.courses c join synthetic_members sm on sm.id = c.member_id
    group by c.grading_type
  ) types),
  'submission_status', jsonb_build_object(
    'on_time', (select count(*) from current_submissions where original_timing = 'on_time'),
    'late', (select count(*) from current_submissions where original_timing = 'late'),
    'missing', (select count(*) from synthetic_members) - (select count(*) from current_submissions),
    'on_time_edited_after_deadline', (select count(*) from current_submissions where original_timing = 'on_time' and revision_timing = 'late')
  ),
  'member_state', (select jsonb_agg(jsonb_build_object(
    'member', sm.full_name,
    'estimated_gpa', cs.estimated_gpa_snapshot,
    'submission_timing', cs.original_timing,
    'revision_timing', cs.revision_timing,
    'revision', cs.revision_number,
    'required_hours', sha.final_hours,
    'completed_minutes', coalesce(cm.minutes, 0),
    'remaining_minutes', greatest(coalesce(sha.final_hours, 0) * 60 - coalesce(cm.minutes, 0), 0),
    'assignment_state', sha.state,
    'proposed_hours', sha.proposed_hours
  ) order by sm.full_name)
  from synthetic_members sm
  left join current_submissions cs on cs.member_id = sm.id
  left join active_period ap on true
  left join public.study_hour_assignments sha on sha.member_id = sm.id and sha.week_id = ap.week_id
  left join completed_minutes cm on cm.member_id = sm.id)
) as connected_workflow_evidence;
