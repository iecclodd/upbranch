-- must-provide columns (NOT NULL, no default) for the seed tables
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('projects','runners','mcp_servers','runner_jobs','agents')
  and is_nullable = 'NO' and column_default is null
order by table_name, ordinal_position;

-- CRITICAL confirm: what can authenticated/anon do to profiles?
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'profiles'
  and grantee in ('anon','authenticated')
order by grantee, privilege_type;

-- what columns does profiles have (for the lockdown fix)
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
order by ordinal_position;
