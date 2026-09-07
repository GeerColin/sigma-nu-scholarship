-- Development-only synthetic seed data. Never run against production.
insert into public.chapters (id, fraternity_name, chapter_name, institution_name, initialized_at)
values ('00000000-0000-4000-8000-000000000001', 'Sigma Nu', 'Eta Chapter', 'Mercer University', now())
on conflict do nothing;

insert into public.semesters (id, chapter_id, name, start_date, end_date, default_deadline_weekday, default_deadline_time, timezone, active)
values ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'Fall 2026 Demo', '2026-08-17', '2026-12-11', 5, '23:59', 'America/New_York', true)
on conflict do nothing;

insert into public.study_hour_rule_sets (id, chapter_id, version, active)
values ('00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000001', 1, true)
on conflict do nothing;

insert into public.study_hour_bands (rule_set_id, minimum_gpa, maximum_gpa, base_hours, sort_order)
values
  ('00000000-0000-4000-8000-000000000020', 3.50, 4.00, 1, 1),
  ('00000000-0000-4000-8000-000000000020', 3.00, 3.49, 1, 2),
  ('00000000-0000-4000-8000-000000000020', 2.75, 2.99, 2, 3),
  ('00000000-0000-4000-8000-000000000020', 2.50, 2.74, 2, 4),
  ('00000000-0000-4000-8000-000000000020', 2.25, 2.49, 3, 5),
  ('00000000-0000-4000-8000-000000000020', 2.00, 2.24, 4, 6),
  ('00000000-0000-4000-8000-000000000020', null, 1.99, 5, 7)
on conflict do nothing;

