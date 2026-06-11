-- Polyshield 0003 — gateway hardening from the security review.
--   1. gateway_call_context refuses ambiguous wire names instead of silently
--      dispatching the wrong tool / evaluating the wrong policy.
--   2. gateway_log / gateway_create_approval validate the tool against the
--      project catalog and constrain decision/status enums, so a single agent
--      key cannot forge arbitrary audit history or spoof the approval queue.

-- ---------- ambiguity-safe call resolution ----------
create or replace function public.gateway_call_context (p_key_hash text, p_wire_name text)
returns jsonb
language plpgsql security definer stable
set search_path = public
as $$
declare
  v_agent record;
  v_tool record;
  v_server record;
  v_match_count int;
begin
  select id, project_id into v_agent from agents where key_hash = p_key_hash;
  if not found then
    return null;
  end if;

  -- The MCP wire name collapses '.' to '_', which is not injective
  -- (prefix/raw_name underscores can alias). If two enabled tools share a
  -- wire name, refuse rather than pick one arbitrarily and risk bypassing the
  -- intended tool's policy.
  select count(*) into v_match_count
  from catalog_tools ct
  where ct.project_id = v_agent.project_id
    and replace(ct.exposed_name, '.', '_') = p_wire_name;

  if v_match_count = 0 then
    return jsonb_build_object('found', false);
  end if;
  if v_match_count > 1 then
    return jsonb_build_object('found', false, 'ambiguous', true);
  end if;

  select ct.* into v_tool
  from catalog_tools ct
  where ct.project_id = v_agent.project_id
    and replace(ct.exposed_name, '.', '_') = p_wire_name
  order by ct.exposed_name
  limit 1;

  select s.* into v_server from mcp_servers s where s.id = v_tool.server_id;

  return jsonb_build_object(
    'found', true,
    'tool', jsonb_build_object(
      'id', v_tool.id,
      'raw_name', v_tool.raw_name,
      'exposed_name', v_tool.exposed_name,
      'enabled', v_tool.enabled,
      'input_schema', v_tool.input_schema
    ),
    'server', jsonb_build_object(
      'id', v_server.id,
      'name', v_server.name,
      'prefix', v_server.prefix,
      'status', v_server.status,
      'transport', v_server.transport
    ),
    'policies', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id,
        'exposed_tool', p.exposed_tool,
        'decision', p.decision,
        'condition', p.condition,
        'description', p.description
      )), '[]'::jsonb)
      from policies p
      where p.project_id = v_agent.project_id
        and p.exposed_tool = v_tool.exposed_name
    ),
    'secrets', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', ss.name,
        'ciphertext', ss.ciphertext
      )), '[]'::jsonb)
      from server_secrets ss
      where ss.server_id = v_tool.server_id
    )
  );
end;
$$;

-- ---------- audit-forgery-resistant logging ----------
create or replace function public.gateway_log (
  p_key_hash text,
  p_server_id uuid,
  p_exposed_tool text,
  p_decision text,
  p_status text,
  p_args jsonb,
  p_reason text,
  p_result jsonb
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_agent record;
  v_id uuid;
begin
  select id, name, project_id into v_agent from agents where key_hash = p_key_hash;
  if not found then
    return null;
  end if;

  -- Constrain decision/status to known values and require the tool to be a
  -- real catalog entry in this project, so a raw agent key can't fabricate
  -- audit history for tools that don't exist or with bogus outcomes.
  if p_decision not in ('allow', 'deny', 'require_approval') then
    return null;
  end if;
  if p_status not in ('allowed', 'denied', 'waiting_for_approval', 'approved', 'blocked', 'error') then
    return null;
  end if;
  if not exists (
    select 1 from catalog_tools ct
    where ct.project_id = v_agent.project_id and ct.exposed_name = p_exposed_tool
  ) then
    return null;
  end if;

  if p_server_id is not null and not exists (
    select 1 from mcp_servers s
    where s.id = p_server_id and s.project_id = v_agent.project_id
  ) then
    return null;
  end if;

  insert into audit_log (project_id, server_id, agent, exposed_tool, decision, status, args, reason, result)
  values (
    v_agent.project_id, p_server_id, v_agent.name, p_exposed_tool,
    p_decision, p_status, coalesce(p_args, '{}'::jsonb), p_reason, p_result
  )
  returning id into v_id;

  if p_server_id is not null then
    update mcp_servers set last_action_at = now () where id = p_server_id;
  end if;

  return v_id;
end;
$$;

-- ---------- approval-spoofing-resistant queue insert ----------
create or replace function public.gateway_create_approval (
  p_key_hash text,
  p_server_id uuid,
  p_exposed_tool text,
  p_args jsonb,
  p_reason text,
  p_policy_id uuid,
  p_audit_id uuid
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_agent record;
  v_id uuid;
begin
  select id, name, project_id into v_agent from agents where key_hash = p_key_hash;
  if not found then
    return null;
  end if;

  -- The approval queue is a human surface; only allow tickets for real tools
  -- in this project so the queue can't be spammed with fabricated entries.
  if not exists (
    select 1 from catalog_tools ct
    where ct.project_id = v_agent.project_id and ct.exposed_name = p_exposed_tool
  ) then
    return null;
  end if;

  if p_server_id is not null and not exists (
    select 1 from mcp_servers s
    where s.id = p_server_id and s.project_id = v_agent.project_id
  ) then
    return null;
  end if;
  if p_policy_id is not null and not exists (
    select 1 from policies p
    where p.id = p_policy_id and p.project_id = v_agent.project_id
  ) then
    return null;
  end if;
  if p_audit_id is not null and not exists (
    select 1 from audit_log al
    where al.id = p_audit_id and al.project_id = v_agent.project_id
  ) then
    return null;
  end if;

  insert into approvals (project_id, server_id, audit_id, policy_id, agent, exposed_tool, args, reason, status)
  values (
    v_agent.project_id, p_server_id, p_audit_id, p_policy_id, v_agent.name,
    p_exposed_tool, coalesce(p_args, '{}'::jsonb), coalesce(p_reason, ''), 'pending'
  )
  returning id into v_id;
  return v_id;
end;
$$;
