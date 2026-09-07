begin;
select plan(10);

select has_table('public', 'members', 'members table exists');
select has_table('public', 'grade_entries', 'grade entries table exists');
select has_table('public', 'audit_log', 'audit log exists');
select ok((select relrowsecurity from pg_class where oid = 'public.members'::regclass), 'members RLS is active');
select ok((select relrowsecurity from pg_class where oid = 'public.grade_entries'::regclass), 'grade-entry RLS is active');
select ok((select relrowsecurity from pg_class where oid = 'public.study_sessions'::regclass), 'study-session RLS is active');
select policies_are('public', 'grade_entries', array['entries_owner_select', 'entries_admin_select'], 'grade entries expose only explicit read paths; trusted functions own writes');
select policies_are('public', 'academic_alerts', array['alerts_admin_manage'], 'academic alerts have no member or proctor path');
select policies_are('public', 'audit_log', array['audit_admin_select'], 'audit log is read-only to authorized administrators');
select has_function('public', 'transfer_scholarship_chair', array['uuid', 'chapter_role[]'], 'atomic Chair transfer function exists');

select * from finish();
rollback;
