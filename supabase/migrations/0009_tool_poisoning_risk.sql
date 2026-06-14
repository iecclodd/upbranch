-- Polyshield 0009 — store the tool-poisoning scan result on discovery and
-- auto-disable high-risk (poisoned) tools so they're never exposed before a
-- human reviews them. Keeps 0006's policy-preservation behavior.

create or replace function public.runner_report_tools (
  p_token_hash text,
  p_server_id uuid,
  p_tools jsonb
)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v record;
  v_server record;
  t record;
  v_exposed text;
begin
  select r.id, r.project_id into v from runners r where r.token_hash = p_token_hash;
  if not found then
    return false;
  end if;

  select s.* into v_server
  from mcp_servers s
  where s.id = p_server_id
    and s.project_id = v.project_id
    and s.transport ->> 'type' = 'stdio';
  if not found then
    return false;
  end if;

  delete from catalog_tools ct
  where ct.server_id = v_server.id
    and ct.raw_name not in (
      select e ->> 'name'
      from jsonb_array_elements(coalesce(p_tools, '[]'::jsonb)) e
      where coalesce(e ->> 'name', '') <> ''
    );

  for t in
    select
      e ->> 'name' as name,
      coalesce(e ->> 'description', '') as description,
      coalesce(e -> 'input_schema', '{}'::jsonb) as input_schema,
      coalesce((e ->> 'risky')::boolean, false) as risky,
      coalesce(e ->> 'risk', 'none') as risk,
      e ->> 'risk_detail' as risk_detail
    from jsonb_array_elements(coalesce(p_tools, '[]'::jsonb)) e
    where coalesce(e ->> 'name', '') <> ''
  loop
    v_exposed := v_server.prefix || '.' || t.name;

    -- New high-risk (poisoned) tools land DISABLED; on re-discovery we update
    -- the risk metadata but never override the user's enable/disable choice.
    insert into catalog_tools (project_id, server_id, raw_name, raw_description, input_schema, exposed_name, enabled, risk, risk_detail)
    values (v.project_id, v_server.id, t.name, t.description, t.input_schema, v_exposed,
            t.risk <> 'high', t.risk, t.risk_detail)
    on conflict (server_id, raw_name) do update
      set raw_description = excluded.raw_description,
          input_schema = excluded.input_schema,
          exposed_name = excluded.exposed_name,
          risk = excluded.risk,
          risk_detail = excluded.risk_detail;

    if t.risky and not exists (
      select 1 from policies p
      where p.project_id = v.project_id and p.exposed_tool = v_exposed
    ) then
      insert into policies (project_id, server_id, exposed_tool, decision, description)
      values (
        v.project_id, v_server.id, v_exposed, 'require_approval',
        'Auto-gated on discovery — destructive or outbound verb.'
      );
    end if;
  end loop;

  update mcp_servers
  set status = 'connected',
      description = 'Local stdio server — running on the paired Polyshield runner.',
      last_action_at = now ()
  where id = v_server.id;

  update runners set last_seen_at = now () where id = v.id;
  return true;
end;
$$;
