begin;

alter table public.grade_submissions
  add column submission_comment text,
  add constraint grade_submission_comment_length
    check (submission_comment is null or char_length(submission_comment) <= 1000);

-- Keep the original two-argument RPC compatible for existing clients and tests,
-- while adding an atomic comment-bearing entry point for the application.
create or replace function public.submit_weekly_checkin(
  target_week_id uuid,
  submitted_entries jsonb,
  submission_comment text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_submission_id uuid;
  v_comment text := nullif(trim(submission_comment), '');
begin
  if v_comment is not null and char_length(v_comment) > 1000 then
    raise exception 'Submission comment must be 1000 characters or fewer';
  end if;

  v_submission_id := public.submit_weekly_checkin(target_week_id, submitted_entries);
  update public.grade_submissions
  set submission_comment = v_comment
  where id = v_submission_id;
  return v_submission_id;
end;
$$;

revoke all on function public.submit_weekly_checkin(uuid, jsonb, text) from public;
grant execute on function public.submit_weekly_checkin(uuid, jsonb, text) to authenticated;

commit;
