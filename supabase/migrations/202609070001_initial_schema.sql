begin;

create extension if not exists pgcrypto with schema extensions;

create type public.member_status as enum ('active', 'inactive', 'alumni');
create type public.chapter_role as enum ('member', 'proctor', 'admin', 'scholarship_chair');
create type public.access_request_status as enum ('pending', 'approved', 'rejected');
create type public.grading_type as enum ('percentage', 'letter', 'pass_fail', 'custom');
create type public.weighting_mode as enum ('credit_hours', 'equal');
create type public.submission_timing as enum ('on_time', 'late');
create type public.custom_grading_treatment as enum ('exclude', 'pass_fail', 'custom_conversion');
create type public.assignment_state as enum ('draft', 'ready', 'frozen', 'review_required');
create type public.email_batch_state as enum ('draft', 'approved', 'sending', 'completed', 'partial_failure');
create type public.email_message_state as enum ('draft', 'queued', 'sent', 'delivered', 'bounced', 'failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  fraternity_name text not null,
  chapter_name text not null,
  institution_name text not null,
  initialized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete restrict,
  profile_id uuid unique references public.profiles(id) on delete set null,
  full_name text not null check (char_length(trim(full_name)) between 2 and 150),
  status public.member_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (chapter_id, id)
);

create table public.member_roles (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete restrict,
  member_id uuid not null references public.members(id) on delete restrict,
  role public.chapter_role not null,
  active boolean not null default true,
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (member_id, role)
);

create unique index exactly_one_active_chair_per_chapter
  on public.member_roles(chapter_id)
  where role = 'scholarship_chair' and active;

create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  requested_name text not null check (char_length(trim(requested_name)) between 2 and 150),
  authenticated_name text,
  authenticated_email text not null,
  possible_member_id uuid references public.members(id) on delete set null,
  status public.access_request_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  unique (profile_id, status)
);

create table public.semesters (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete restrict,
  name text not null,
  start_date date not null,
  end_date date not null,
  default_deadline_weekday smallint not null check (default_deadline_weekday between 0 and 6),
  default_deadline_time time not null,
  timezone text not null default 'America/New_York',
  gpa_weighting public.weighting_mode not null default 'credit_hours',
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  unique (chapter_id, name)
);

create unique index one_active_semester_per_chapter on public.semesters(chapter_id) where active;

create table public.academic_weeks (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete restrict,
  semester_id uuid not null references public.semesters(id) on delete restrict,
  sequence_number integer not null check (sequence_number > 0),
  label text not null,
  starts_on date not null,
  ends_on date not null,
  deadline_at timestamptz not null,
  deadline_overridden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  unique (semester_id, sequence_number)
);

create table public.grading_scales (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete restrict,
  name text not null,
  version integer not null check (version > 0),
  scale jsonb not null,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (chapter_id, name, version)
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete restrict,
  member_id uuid not null references public.members(id) on delete restrict,
  semester_id uuid not null references public.semesters(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 160),
  credit_hours numeric(4,2) not null check (credit_hours > 0 and credit_hours <= 24),
  grading_type public.grading_type not null,
  grading_scale_id uuid references public.grading_scales(id) on delete restrict,
  custom_grading_description text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chapter_id, id)
);

create table public.custom_grading_reviews (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  treatment public.custom_grading_treatment not null,
  conversion jsonb,
  reason text not null,
  reviewed_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.grade_submissions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete restrict,
  member_id uuid not null references public.members(id) on delete restrict,
  week_id uuid not null references public.academic_weeks(id) on delete restrict,
  revision_number integer not null check (revision_number > 0),
  previous_revision_id uuid references public.grade_submissions(id) on delete restrict,
  submitted_at timestamptz not null default now(),
  original_submitted_at timestamptz not null,
  deadline_at_snapshot timestamptz not null,
  original_timing public.submission_timing not null,
  revision_timing public.submission_timing not null,
  is_current boolean not null default true,
  estimated_gpa_snapshot numeric(4,2),
  included_course_count integer not null default 0,
  active_course_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (member_id, week_id, revision_number)
);

create unique index one_current_submission_per_member_week
  on public.grade_submissions(member_id, week_id)
  where is_current;

create table public.grade_entries (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete restrict,
  submission_id uuid not null references public.grade_submissions(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  course_name_snapshot text not null,
  credit_hours_snapshot numeric(4,2) not null,
  grading_type_snapshot public.grading_type not null,
  grading_scale_snapshot jsonb,
  reported_value jsonb not null,
  included_in_gpa boolean not null,
  gpa_points numeric(4,2),
  letter_equivalent text,
  created_at timestamptz not null default now(),
  unique (submission_id, course_id)
);

create table public.academic_alerts (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete restrict,
  member_id uuid not null references public.members(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  submission_id uuid not null references public.grade_submissions(id) on delete restrict,
  alert_type text not null,
  details jsonb not null,
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.study_hour_rule_sets (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete restrict,
  version integer not null check (version > 0),
  d_adjustment_hours integer not null default 1 check (d_adjustment_hours >= 0),
  f_adjustment_hours integer not null default 2 check (f_adjustment_hours >= 0),
  maximum_hours integer not null default 5 check (maximum_hours >= 0),
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (chapter_id, version)
);

create unique index one_active_rule_set_per_chapter on public.study_hour_rule_sets(chapter_id) where active;

create table public.study_hour_bands (
  id uuid primary key default gen_random_uuid(),
  rule_set_id uuid not null references public.study_hour_rule_sets(id) on delete restrict,
  minimum_gpa numeric(4,2),
  maximum_gpa numeric(4,2) not null,
  base_hours integer not null check (base_hours >= 0),
  sort_order integer not null,
  check (minimum_gpa is null or maximum_gpa >= minimum_gpa),
  unique (rule_set_id, sort_order)
);

create table public.study_hour_assignments (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete restrict,
  member_id uuid not null references public.members(id) on delete restrict,
  week_id uuid not null references public.academic_weeks(id) on delete restrict,
  rule_set_id uuid not null references public.study_hour_rule_sets(id) on delete restrict,
  estimated_gpa_used numeric(4,2),
  had_d boolean not null default false,
  had_f boolean not null default false,
  automatic_hours integer not null check (automatic_hours >= 0),
  override_hours integer check (override_hours >= 0),
  override_reason text,
  override_actor uuid references public.profiles(id) on delete set null,
  override_at timestamptz,
  final_hours integer not null check (final_hours >= 0),
  state public.assignment_state not null default 'draft',
  frozen_at timestamptz,
  proposed_hours integer check (proposed_hours >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((override_hours is null and override_reason is null) or (override_hours is not null and nullif(trim(override_reason), '') is not null)),
  unique (member_id, week_id)
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete restrict,
  member_id uuid not null references public.members(id) on delete restrict,
  proctor_member_id uuid not null references public.members(id) on delete restrict,
  week_id uuid not null references public.academic_weeks(id) on delete restrict,
  session_date date not null,
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 1440),
  notes text,
  voided_at timestamptz,
  voided_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete restrict,
  template_type text not null,
  name text not null,
  subject_template text not null,
  body_template text not null,
  version integer not null check (version > 0),
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (chapter_id, template_type, version)
);

create table public.email_batches (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete restrict,
  week_id uuid references public.academic_weeks(id) on delete restrict,
  batch_type text not null,
  state public.email_batch_state not null default 'draft',
  idempotency_key uuid not null default gen_random_uuid() unique,
  approved_by uuid references public.profiles(id) on delete restrict,
  approved_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.email_messages (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete restrict,
  batch_id uuid references public.email_batches(id) on delete restrict,
  member_id uuid references public.members(id) on delete restrict,
  recipient_email text not null,
  recipient_name text,
  message_type text not null,
  final_subject text not null,
  final_body text not null,
  state public.email_message_state not null default 'draft',
  selected boolean not null default true,
  idempotency_key uuid not null default gen_random_uuid() unique,
  provider_message_id text unique,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.email_delivery_events (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.email_messages(id) on delete restrict,
  provider_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now()
);

create table public.chapter_settings (
  chapter_id uuid primary key references public.chapters(id) on delete restrict,
  percentage_alert_drop numeric(5,2) not null default 10,
  letter_alert_steps integer not null default 1,
  email_from text,
  email_reply_to text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.bootstrap_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  chapter_id uuid references public.chapters(id) on delete restrict,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before_state jsonb,
  after_state jsonb,
  reason text,
  request_id uuid,
  created_at timestamptz not null default now()
);

create index members_chapter_status_idx on public.members(chapter_id, status);
create index roles_member_active_idx on public.member_roles(member_id, active);
create index courses_member_semester_idx on public.courses(member_id, semester_id) where archived_at is null;
create index submissions_member_week_idx on public.grade_submissions(member_id, week_id, revision_number desc);
create index entries_submission_idx on public.grade_entries(submission_id);
create index assignments_week_idx on public.study_hour_assignments(chapter_id, week_id);
create index sessions_week_member_idx on public.study_sessions(week_id, member_id) where voided_at is null;
create index alerts_chapter_created_idx on public.academic_alerts(chapter_id, created_at desc);
create index audit_chapter_created_idx on public.audit_log(chapter_id, created_at desc);

create or replace function public.current_member_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select m.id from public.members m where m.profile_id = (select auth.uid()) limit 1
$$;

create or replace function public.current_chapter_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select m.chapter_id from public.members m where m.profile_id = (select auth.uid()) limit 1
$$;

create or replace function public.has_chapter_role(required_role public.chapter_role)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.member_roles r
    join public.members m on m.id = r.member_id
    where m.profile_id = (select auth.uid()) and m.status = 'active' and r.role = required_role and r.active
  )
$$;

create or replace function public.is_admin_or_chair()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_chapter_role('admin') or public.has_chapter_role('scholarship_chair')
$$;

create or replace function public.prevent_audit_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Audit records are append-only';
end;
$$;

create trigger audit_log_immutable before update or delete on public.audit_log
for each row execute function public.prevent_audit_mutation();

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, email, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_created after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.transfer_scholarship_chair(successor_member_id uuid, outgoing_lower_roles public.chapter_role[] default array['member']::public.chapter_role[])
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_chapter_id uuid := public.current_chapter_id();
  v_actor_member_id uuid := public.current_member_id();
  v_successor public.members%rowtype;
  v_role public.chapter_role;
begin
  if not public.has_chapter_role('scholarship_chair') then raise exception 'Only the Scholarship Chair may transfer this role'; end if;
  select * into v_successor from public.members where id = successor_member_id and chapter_id = v_chapter_id for update;
  if v_successor.id is null or v_successor.status <> 'active' or v_successor.profile_id is null then raise exception 'Successor must be an active member with an activated Google account'; end if;
  if v_successor.id = v_actor_member_id then raise exception 'Successor must be another member'; end if;

  update public.member_roles set active = false, revoked_at = now()
    where chapter_id = v_chapter_id and member_id = v_actor_member_id and role = 'scholarship_chair' and active;
  insert into public.member_roles(chapter_id, member_id, role, active, granted_by)
    values (v_chapter_id, successor_member_id, 'scholarship_chair', true, auth.uid())
    on conflict (member_id, role) do update set active = true, revoked_at = null, granted_by = auth.uid(), granted_at = now();

  update public.member_roles set active = false, revoked_at = now()
    where member_id = v_actor_member_id and role <> 'scholarship_chair' and not (role = any(outgoing_lower_roles));
  foreach v_role in array outgoing_lower_roles loop
    if v_role = 'scholarship_chair' then raise exception 'Outgoing lower roles cannot include Scholarship Chair'; end if;
  end loop;

  insert into public.audit_log(chapter_id, actor_profile_id, action, entity_type, entity_id, after_state)
  values (v_chapter_id, auth.uid(), 'scholarship_chair_transferred', 'member', successor_member_id::text,
    jsonb_build_object('outgoing_member_id', public.current_member_id(), 'successor_member_id', successor_member_id));
end;
$$;

alter table public.profiles enable row level security;
alter table public.chapters enable row level security;
alter table public.members enable row level security;
alter table public.member_roles enable row level security;
alter table public.access_requests enable row level security;
alter table public.semesters enable row level security;
alter table public.academic_weeks enable row level security;
alter table public.grading_scales enable row level security;
alter table public.courses enable row level security;
alter table public.custom_grading_reviews enable row level security;
alter table public.grade_submissions enable row level security;
alter table public.grade_entries enable row level security;
alter table public.academic_alerts enable row level security;
alter table public.study_hour_rule_sets enable row level security;
alter table public.study_hour_bands enable row level security;
alter table public.study_hour_assignments enable row level security;
alter table public.study_sessions enable row level security;
alter table public.email_templates enable row level security;
alter table public.email_batches enable row level security;
alter table public.email_messages enable row level security;
alter table public.email_delivery_events enable row level security;
alter table public.chapter_settings enable row level security;
alter table public.bootstrap_tokens enable row level security;
alter table public.audit_log enable row level security;

create policy profiles_self_select on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_self_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_admin_select on public.profiles for select to authenticated using (
  public.is_admin_or_chair() and exists (select 1 from public.members m where m.profile_id = profiles.id and m.chapter_id = public.current_chapter_id())
);

create policy chapter_approved_select on public.chapters for select to authenticated using (id = public.current_chapter_id());

create policy member_self_select on public.members for select to authenticated using (profile_id = (select auth.uid()));
create policy member_admin_select on public.members for select to authenticated using (chapter_id = public.current_chapter_id() and public.is_admin_or_chair());
create policy member_proctor_active_names on public.members for select to authenticated using (
  chapter_id = public.current_chapter_id() and status = 'active' and public.has_chapter_role('proctor')
);
create policy member_self_update on public.members for update to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()) and chapter_id = public.current_chapter_id());
create policy member_admin_manage on public.members for all to authenticated using (chapter_id = public.current_chapter_id() and public.is_admin_or_chair()) with check (chapter_id = public.current_chapter_id() and public.is_admin_or_chair());

create policy roles_self_select on public.member_roles for select to authenticated using (member_id = public.current_member_id());
create policy roles_admin_select on public.member_roles for select to authenticated using (chapter_id = public.current_chapter_id() and public.is_admin_or_chair());

create policy access_request_self_select on public.access_requests for select to authenticated using (profile_id = (select auth.uid()));
create policy access_request_self_insert on public.access_requests for insert to authenticated with check (profile_id = (select auth.uid()) and status = 'pending');
create policy access_request_admin_manage on public.access_requests for all to authenticated using (
  public.is_admin_or_chair() and (possible_member_id is null or exists (select 1 from public.members m where m.id = possible_member_id and m.chapter_id = public.current_chapter_id()))
) with check (public.is_admin_or_chair());

create policy semesters_approved_select on public.semesters for select to authenticated using (chapter_id = public.current_chapter_id());
create policy semesters_admin_manage on public.semesters for all to authenticated using (chapter_id = public.current_chapter_id() and public.is_admin_or_chair()) with check (chapter_id = public.current_chapter_id() and public.is_admin_or_chair());
create policy weeks_approved_select on public.academic_weeks for select to authenticated using (chapter_id = public.current_chapter_id());
create policy weeks_admin_manage on public.academic_weeks for all to authenticated using (chapter_id = public.current_chapter_id() and public.is_admin_or_chair()) with check (chapter_id = public.current_chapter_id() and public.is_admin_or_chair());
create policy scales_approved_select on public.grading_scales for select to authenticated using (chapter_id = public.current_chapter_id());
create policy scales_admin_manage on public.grading_scales for all to authenticated using (chapter_id = public.current_chapter_id() and public.is_admin_or_chair()) with check (chapter_id = public.current_chapter_id() and public.is_admin_or_chair());

create policy courses_owner_select on public.courses for select to authenticated using (member_id = public.current_member_id());
create policy courses_owner_insert on public.courses for insert to authenticated with check (member_id = public.current_member_id() and chapter_id = public.current_chapter_id());
create policy courses_owner_update on public.courses for update to authenticated using (member_id = public.current_member_id()) with check (member_id = public.current_member_id() and chapter_id = public.current_chapter_id());
create policy courses_admin_manage on public.courses for all to authenticated using (chapter_id = public.current_chapter_id() and public.is_admin_or_chair()) with check (chapter_id = public.current_chapter_id() and public.is_admin_or_chair());

create policy custom_reviews_owner_select on public.custom_grading_reviews for select to authenticated using (exists (select 1 from public.courses c where c.id = course_id and c.member_id = public.current_member_id()));
create policy custom_reviews_admin_manage on public.custom_grading_reviews for all to authenticated using (chapter_id = public.current_chapter_id() and public.is_admin_or_chair()) with check (chapter_id = public.current_chapter_id() and public.is_admin_or_chair());

create policy submissions_owner_select on public.grade_submissions for select to authenticated using (member_id = public.current_member_id());
create policy submissions_owner_insert on public.grade_submissions for insert to authenticated with check (member_id = public.current_member_id() and chapter_id = public.current_chapter_id());
create policy submissions_admin_select on public.grade_submissions for select to authenticated using (chapter_id = public.current_chapter_id() and public.is_admin_or_chair());
create policy entries_owner_select on public.grade_entries for select to authenticated using (exists (select 1 from public.grade_submissions s where s.id = submission_id and s.member_id = public.current_member_id()));
create policy entries_owner_insert on public.grade_entries for insert to authenticated with check (chapter_id = public.current_chapter_id() and exists (select 1 from public.grade_submissions s where s.id = submission_id and s.member_id = public.current_member_id()));
create policy entries_admin_select on public.grade_entries for select to authenticated using (chapter_id = public.current_chapter_id() and public.is_admin_or_chair());

create policy alerts_admin_manage on public.academic_alerts for all to authenticated using (chapter_id = public.current_chapter_id() and public.is_admin_or_chair()) with check (chapter_id = public.current_chapter_id() and public.is_admin_or_chair());

create policy rules_admin_manage on public.study_hour_rule_sets for all to authenticated using (chapter_id = public.current_chapter_id() and public.is_admin_or_chair()) with check (chapter_id = public.current_chapter_id() and public.is_admin_or_chair());
create policy bands_admin_manage on public.study_hour_bands for all to authenticated using (exists (select 1 from public.study_hour_rule_sets r where r.id = rule_set_id and r.chapter_id = public.current_chapter_id() and public.is_admin_or_chair())) with check (exists (select 1 from public.study_hour_rule_sets r where r.id = rule_set_id and r.chapter_id = public.current_chapter_id() and public.is_admin_or_chair()));
create policy assignments_owner_select on public.study_hour_assignments for select to authenticated using (member_id = public.current_member_id());
create policy assignments_admin_manage on public.study_hour_assignments for all to authenticated using (chapter_id = public.current_chapter_id() and public.is_admin_or_chair()) with check (chapter_id = public.current_chapter_id() and public.is_admin_or_chair());

create policy sessions_member_select on public.study_sessions for select to authenticated using (member_id = public.current_member_id() or proctor_member_id = public.current_member_id());
create policy sessions_proctor_insert on public.study_sessions for insert to authenticated with check (
  chapter_id = public.current_chapter_id() and proctor_member_id = public.current_member_id() and public.has_chapter_role('proctor') and exists (select 1 from public.members m where m.id = member_id and m.status = 'active' and m.chapter_id = public.current_chapter_id())
);
create policy sessions_proctor_current_week_update on public.study_sessions for update to authenticated using (
  proctor_member_id = public.current_member_id() and public.has_chapter_role('proctor') and exists (select 1 from public.academic_weeks w where w.id = week_id and current_date between w.starts_on and w.ends_on)
) with check (proctor_member_id = public.current_member_id() and chapter_id = public.current_chapter_id());
create policy sessions_admin_manage on public.study_sessions for all to authenticated using (chapter_id = public.current_chapter_id() and public.is_admin_or_chair()) with check (chapter_id = public.current_chapter_id() and public.is_admin_or_chair());

create policy email_templates_admin_manage on public.email_templates for all to authenticated using (chapter_id = public.current_chapter_id() and public.is_admin_or_chair()) with check (chapter_id = public.current_chapter_id() and public.is_admin_or_chair());
create policy email_batches_admin_manage on public.email_batches for all to authenticated using (chapter_id = public.current_chapter_id() and public.is_admin_or_chair()) with check (chapter_id = public.current_chapter_id() and public.is_admin_or_chair());
create policy email_messages_admin_manage on public.email_messages for all to authenticated using (chapter_id = public.current_chapter_id() and public.is_admin_or_chair()) with check (chapter_id = public.current_chapter_id() and public.is_admin_or_chair());
create policy email_events_admin_select on public.email_delivery_events for select to authenticated using (exists (select 1 from public.email_messages m where m.id = message_id and m.chapter_id = public.current_chapter_id() and public.is_admin_or_chair()));
create policy settings_admin_manage on public.chapter_settings for all to authenticated using (chapter_id = public.current_chapter_id() and public.is_admin_or_chair()) with check (chapter_id = public.current_chapter_id() and public.is_admin_or_chair());
create policy audit_admin_select on public.audit_log for select to authenticated using (chapter_id = public.current_chapter_id() and public.is_admin_or_chair());

revoke all on public.bootstrap_tokens from anon, authenticated;
revoke update, delete on public.audit_log from anon, authenticated;
revoke all on function public.transfer_scholarship_chair(uuid, public.chapter_role[]) from public;
grant execute on function public.transfer_scholarship_chair(uuid, public.chapter_role[]) to authenticated;

commit;
