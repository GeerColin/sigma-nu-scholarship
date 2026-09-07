begin;

-- Keep database and RLS verification reproducible on linked development projects.
create extension if not exists pgtap with schema extensions;

commit;
