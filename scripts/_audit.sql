select exposed_tool, decision, args, result, created_at
from audit_log
where project_id = '627a00d8-c0df-476d-98d6-3f9de7486afc'
  and exposed_tool like 'fs.read%'
order by created_at desc limit 3;
