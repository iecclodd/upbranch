select id, exposed_tool, status, risk,
       (preview is not null) as has_preview,
       preview
from approvals
where project_id = '627a00d8-c0df-476d-98d6-3f9de7486afc'
order by requested_at desc limit 3;
