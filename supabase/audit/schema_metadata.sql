-- Read-only catalog inspection. Never reads roster, academic, or auth-user rows.
begin read only;
select jsonb_build_object(
  'migrations', (select jsonb_agg(version order by version) from supabase_migrations.schema_migrations),
  'tables', (select jsonb_agg(jsonb_build_object('name', c.relname, 'rls', c.relrowsecurity, 'force_rls', c.relforcerowsecurity, 'owner', pg_get_userbyid(c.relowner)) order by c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'),
  'columns', (select jsonb_agg(jsonb_build_object('table',table_name,'name',column_name,'type',udt_name,'nullable',is_nullable,'default',column_default) order by table_name,ordinal_position) from information_schema.columns where table_schema='public'),
  'constraints', (select jsonb_agg(jsonb_build_object('table',c.relname,'name',k.conname,'definition',pg_get_constraintdef(k.oid)) order by c.relname,k.conname) from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'),
  'indexes', (select jsonb_agg(jsonb_build_object('table',tablename,'name',indexname,'definition',indexdef) order by tablename,indexname) from pg_indexes where schemaname='public'),
  'policies', (select jsonb_agg(jsonb_build_object('table',tablename,'name',policyname,'roles',roles,'command',cmd,'using',qual,'check',with_check) order by tablename,policyname) from pg_policies where schemaname='public'),
  'functions', (select jsonb_agg(jsonb_build_object('name',p.proname,'args',pg_get_function_identity_arguments(p.oid),'definer',p.prosecdef,'owner',pg_get_userbyid(p.proowner),'config',p.proconfig,'hash',md5(pg_get_functiondef(p.oid)),'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),'service_execute',has_function_privilege('service_role',p.oid,'EXECUTE')) order by p.proname,pg_get_function_identity_arguments(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f'),
  'triggers', (select jsonb_agg(jsonb_build_object('table',c.relname,'name',t.tgname,'definition',pg_get_triggerdef(t.oid)) order by c.relname,t.tgname) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth') and not t.tgisinternal),
  'grants', (select jsonb_agg(jsonb_build_object('table',table_name,'role',grantee,'privilege',privilege_type) order by table_name,grantee,privilege_type) from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated','service_role'))
) as metadata;
rollback;
