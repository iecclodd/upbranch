-- enable offline/privacy mode + bump plan, to test redaction and perk gating
update projects set privacy_mode = true where id = '627a00d8-c0df-476d-98d6-3f9de7486afc';
update profiles set plan = 'builder'
where id = (select owner_id from projects where id = '627a00d8-c0df-476d-98d6-3f9de7486afc');

select p.privacy_mode, pr.plan
from projects p
join profiles pr on pr.id = p.owner_id
where p.id = '627a00d8-c0df-476d-98d6-3f9de7486afc';
