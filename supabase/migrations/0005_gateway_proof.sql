-- Polyshield 0005 — gateway proof.
--
-- Threat: the gateway holds only the anon key, so its RPCs are anon-callable
-- and gated by the AGENT's key hash. But the agent is the untrusted party. A
-- malicious agent holding its own valid key could call side-effecting RPCs
-- directly against PostgREST and skip the gateway's policy engine entirely —
-- worst case gateway_enqueue_job, which would hand an un-policied tool call
-- straight to the user's local runner with no human in the loop.
--
-- Fix: side-effecting gateway RPCs additionally require p_proof, a secret
-- only the gateway server derives (from POLYSHIELD_VAULT_KEY). The database
-- stores only sha256(proof) in gateway_config, a table with RLS enabled and
-- ZERO policies, so nothing but definer functions can read it. Fail closed:
-- no stored hash → no writes.

create table if not exists public.gateway_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now ()
);
alter table public.gateway_config enable row level security;
-- deliberately no RLS policies: invisible to anon AND authenticated.

-- pgcrypto lives in the "extensions" schema on Supabase; qualify explicitly
-- since these functions pin search_path = public.
create or replace function public.gateway_proof_ok (p_proof text)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from gateway_config
    where key = 'gateway_proof_hash'
      and value = encode(extensions.digest(coalesce(p_proof, ''), 'sha256'), 'hex')
  );
$$;
revoke execute on function public.gateway_proof_ok (text) from public;
-- callable only from other definer functions; no direct grants.

-- ---------- enqueue: proof required ----------

drop function if exists public.gateway_enqueue_job (text, uuid, text, jsonb);

create or replace function public.gateway_enqueue_job (
  p_key_hash text,
  p_server_id uuid,
  p_raw_name text,
  p_args jsonb,
  p_proof text
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_agent record;
  v_id uuid;
begin
  if not gateway_proof_ok (p_proof) then
    return jsonb_build_object('queued', false, 'reason', 'bad_proof');
  end if;
  select a.id, a.name, a.project_id into v_agent from agents a where a.key_hash = p_key_hash;
  if not found then
    return null;
  end if;
  if not exists (
    select 1 from mcp_servers s
    where s.id = p_server_id
      and s.project_id = v_agent.project_id
      and s.transport ->> 'type' = 'stdio'
  ) then
    return jsonb_build_object('queued', false, 'reason', 'unknown_server');
  end if;
  if not exists (
    select 1 from runners r
    where r.project_id = v_agent.project_id
      and r.last_seen_at > now () - interval '90 seconds'
  ) then
    return jsonb_build_object('queued', false, 'reason', 'no_runner');
  end if;

  insert into runner_jobs (project_id, server_id, raw_name, args, agent)
  values (v_agent.project_id, p_server_id, p_raw_name, coalesce(p_args, '{}'::jsonb), v_agent.name)
  returning id into v_id;

  return jsonb_build_object('queued', true, 'job_id', v_id);
end;
$$;

-- ---------- audit + approvals: proof required (forge resistance) ----------

drop function if exists public.gateway_log (text, uuid, text, text, text, jsonb, text, jsonb);

create or replace function public.gateway_log (
  p_key_hash text,
  p_server_id uuid,
  p_exposed_tool text,
  p_decision text,
  p_status text,
  p_args jsonb,
  p_reason text,
  p_result jsonb,
  p_proof text
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_agent record;
  v_id uuid;
begin
  if not gateway_proof_ok (p_proof) then
    return null;
  end if;
  select id, name, project_id into v_agent from agents where key_hash = p_key_hash;
  if not found then
    return null;
  end if;

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

  insert into audit_log (project_id, server_id, agent, exposed_tool, decision, status, args, reason, result, event_type)
  values (
    v_agent.project_id, p_server_id, v_agent.name, p_exposed_tool,
    p_decision, p_status, coalesce(p_args, '{}'::jsonb), p_reason, p_result, 'tool_call'
  )
  returning id into v_id;

  if p_server_id is not null then
    update mcp_servers set last_action_at = now () where id = p_server_id;
  end if;

  return v_id;
end;
$$;

drop function if exists public.gateway_create_approval (text, uuid, text, jsonb, text, uuid, uuid);

create or replace function public.gateway_create_approval (
  p_key_hash text,
  p_server_id uuid,
  p_exposed_tool text,
  p_args jsonb,
  p_reason text,
  p_policy_id uuid,
  p_audit_id uuid,
  p_proof text
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_agent record;
  v_id uuid;
begin
  if not gateway_proof_ok (p_proof) then
    return null;
  end if;
  select id, name, project_id into v_agent from agents where key_hash = p_key_hash;
  if not found then
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

-- ---------- execution surface ----------

revoke execute on function public.gateway_enqueue_job (text, uuid, text, jsonb, text) from public;
revoke execute on function public.gateway_log (text, uuid, text, text, text, jsonb, text, jsonb, text) from public;
revoke execute on function public.gateway_create_approval (text, uuid, text, jsonb, text, uuid, uuid, text) from public;

grant execute on function public.gateway_enqueue_job (text, uuid, text, jsonb, text) to anon, authenticated, service_role;
grant execute on function public.gateway_log (text, uuid, text, text, text, jsonb, text, jsonb, text) to anon, authenticated, service_role;
grant execute on function public.gateway_create_approval (text, uuid, text, jsonb, text, uuid, uuid, text) to anon, authenticated, service_role;
