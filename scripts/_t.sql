select name, status from mcp_servers where project_id = '627a00d8-c0df-476d-98d6-3f9de7486afc';
select raw_name, exposed_name, enabled, risk from catalog_tools
where project_id = '627a00d8-c0df-476d-98d6-3f9de7486afc' order by raw_name;
