-- columns for the tables I need to seed a runtime test
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('projects','agents','runners','mcp_servers','catalog_tools','profiles','runner_jobs','approvals')
order by table_name, ordinal_position;

-- is the CRITICAL profiles billing-column write actually exposed to authenticated?
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'profiles'
  and grantee in ('anon','authenticated')
order by grantee, privilege_type;
