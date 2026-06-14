-- ============================================================
-- 0012 — security hardening (audit 2026-06-14)
-- Fixes: profiles plan self-upgrade (CRITICAL), proof oracle (MEDIUM),
-- gateway_call_context secret-name leak (MEDIUM), taint keyed on agent name,
-- gateway_config table grants (DiD).
-- NOTE: db-migrate.mjs wraps this file in a transaction — no begin/commit here.
-- ============================================================

-- (1) [CRITICAL] profiles: a signed-in user could PATCH their own row and set
-- plan='enterprise' (authenticated holds table UPDATE; RLS only checks the row,
-- not the columns). Lock writes to billing/entitlement columns; users may only
-- edit display fields. Profile rows are created by handle_new_user (security
-- definer), so users never need INSERT/DELETE/TRUNCATE here.
revoke insert, update, delete, truncate on public.profiles from anon, authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

-- stripe_customer_id was written from the user session (startCheckoutAction).
-- Route it through a proof-gated RPC instead — also stops a user pointing their
-- customer id at someone else's Stripe customer to hijack the billing portal.
create or replace function public.gateway_set_stripe_customer (
  p_user_id uuid,
  p_customer_id text,
  p_proof text
)
returns boolean
language plpgsql security definer
set search_path = public
as $$
begin
  if not gateway_proof_ok (p_proof) then
    return false;
  end if;
  if p_customer_id is null or length(p_customer_id) = 0 or length(p_customer_id) > 255 then
    return false;
  end if;
  update profiles set stripe_customer_id = p_customer_id where id = p_user_id;
  return found;
end;
$$;
revoke execute on function public.gateway_set_stripe_customer (uuid, text, text) from public;
grant execute on function public.gateway_set_stripe_customer (uuid, text, text) to anon, authenticated, service_role;

-- (2) [MEDIUM] gateway_proof_ok must not be directly callable (it is a
-- confirm-the-proof oracle). The 0005 `revoke ... from public` was defeated by
-- Supabase's default-privilege grant to anon/authenticated. Revoke explicitly.
-- Definer functions that call it internally run as the owner and are unaffected.
revoke execute on function public.gateway_proof_ok (text) from anon, authenticated;

-- (3) [LOW/DiD] gateway_config holds the proof hash and is only ever touched by
-- definer functions / the set-gateway-proof script (direct postgres). Drop the
-- default anon/authenticated table grants so isolation doesn't rest on RLS alone.
-- (server_secrets is intentionally left alone: it is written via the user
-- session in addServerAction, RLS scopes it per-project, and the ciphertext is
-- useless without the server-only vault key.)
revoke all on public.gateway_config from anon, authenticated;

-- (4) Taint was keyed on the mutable, non-unique agent NAME, so two agents with
-- the same name in one project cross-contaminate taint. Key on agent_id.
alter table public.taint_events add column if not exists agent_id uuid;

create or replace function public.gateway_record_taint (
  p_key_hash text, p_kind text, p_source_tool text, p_detail text, p_proof text
)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_agent record;
begin
  if not gateway_proof_ok (p_proof) then
    return false;
  end if;
  if p_kind not in ('shield_flag', 'untrusted_source') then
    return false;
  end if;
  select id, name, project_id into v_agent from agents where key_hash = p_key_hash;
  if not found then
    return false;
  end if;
  insert into taint_events (project_id, agent, agent_id, kind, source_tool, detail)
  values (v_agent.project_id, v_agent.name, v_agent.id, p_kind, p_source_tool, left(coalesce(p_detail, ''), 300));
  return true;
end;
$$;

-- (5) [MEDIUM] gateway_call_context returned secret names + ciphertext to ANY
-- agent-key holder via a proof-less read (an agent could harvest its project's
-- secret names by calling the RPC directly through PostgREST). Add a proof gate
-- so only the gateway can resolve call context; also match taint on agent_id.
drop function if exists public.gateway_call_context (text, text);

create or replace function public.gateway_call_context (p_key_hash text, p_wire_name text, p_proof text)
returns jsonb
language plpgsql security definer stable
set search_path = public
as $$
declare
  v_agent record;
  v_tool record;
  v_server record;
  v_match_count int;
  v_tainted boolean;
  v_project record;
begin
  if not gateway_proof_ok (p_proof) then
    return null;
  end if;

  select id, name, project_id into v_agent from agents where key_hash = p_key_hash;
  if not found then
    return null;
  end if;

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

  select exists (
    select 1 from taint_events te
    where te.project_id = v_agent.project_id
      and te.agent_id = v_agent.id
      and te.created_at > now () - interval '30 minutes'
  ) into v_tainted;

  select coalesce(taint_escalation, true) as taint_escalation,
         coalesce(privacy_mode, false) as privacy_mode
  into v_project
  from projects where id = v_agent.project_id;

  return jsonb_build_object(
    'found', true,
    'agent_name', v_agent.name,
    'privacy_mode', v_project.privacy_mode,
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
      'transport', v_server.transport,
      'shield_mode', v_server.shield_mode,
      'sandbox_profile', v_server.sandbox_profile
    ),
    'taint', jsonb_build_object('tainted', v_tainted, 'escalation', v_project.taint_escalation),
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
revoke execute on function public.gateway_call_context (text, text, text) from public;
grant execute on function public.gateway_call_context (text, text, text) to anon, authenticated, service_role;
