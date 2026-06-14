-- tables + whether RLS is enabled
select c.relname as tbl, c.relrowsecurity as rls_on, c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by 1;

-- every RLS policy
select tablename, policyname, cmd, roles::text as roles, qual, with_check
from pg_policies where schemaname = 'public'
order by tablename, cmd, policyname;
