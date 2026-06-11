-- Polyshield 0002 — gateway execution layer.
-- Credential vault, agent-key-gated gateway RPCs, richer audit/approval
-- records, and removal of seeded demo data.

-- ---------- credential vault ----------
-- Secrets are AES-256-GCM ciphertext; the encryption key lives only in the
-- app server's environment (POLYSHIELD_VAULT_KEY). Owners can manage rows for
-- their own project, but a row never contains usable plaintext.

create table public.server_secrets (
  id uuid primary key default gen_random_uuid (),
  project_id uuid not null references public.projects (id) on delete cascade,
  server_id uuid not null references public.mcp_servers (id) on delete cascade,
  name text not null,
  ciphertext text not null,
  created_at timestamptz not null default now (),
  unique (server_id, name)
);
create index server_secrets_project_idx on public.server_secrets (project_id);

alter table public.server_secrets enable row level security;
create policy "own secrets" on public.server_secrets
  for all using (public.owns_project (project_id))
  with check (public.owns_project (project_id));

-- ---------- richer audit + approvals ----------

alter table public.audit_log
  add column if not exists args jsonb not null default '{}'::jsonb,
  add column if not exists result jsonb;

alter table public.approvals
  add column if not exists policy_id uuid references public.policies (id) on delete set null,
  add column if not exists result jsonb;

create unique index if not exists agents_key_hash_idx on public.agents (key_hash);

-- ---------- gateway RPCs ----------
-- The gateway holds no privileged Supabase key. It authenticates agents by
-- SHA-256 key hash and these security-definer functions are the only
-- privileged surface it can reach. Each function resolves the agent from the
-- hash first and scopes every read/write to that agent's project, so the
-- public anon key plus a valid agent key grants exactly one project's
-- gateway traffic — nothing more.

create or replace function public.gateway_handshake (p_key_hash text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v record;
begin
  select id, name, project_id into v from agents where key_hash = p_key_hash;
  if not found then
    return null;
  end if;
  update agents set last_seen_at = now (), status = 'active' where id = v.id;
  return jsonb_build_object(
    'agent_id', v.id,
    'agent_name', v.name,
    'project_id', v.project_id
  );
end;
$$;

create or replace function public.gateway_list_tools (p_key_hash text)
returns jsonb
language sql security definer stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'exposed_name', ct.exposed_name,
    'raw_name', ct.raw_name,
    'description', ct.raw_description,
    'input_schema', ct.input_schema
  ) order by ct.exposed_name), '[]'::jsonb)
  from catalog_tools ct
  join agents a on a.project_id = ct.project_id
  where a.key_hash = p_key_hash and ct.enabled;
$$;

create or replace function public.gateway_call_context (p_key_hash text, p_wire_name text)
returns jsonb
language plpgsql security definer stable
set search_path = public
as $$
declare
  v_agent record;
  v_tool record;
  v_server record;
begin
  select id, project_id into v_agent from agents where key_hash = p_key_hash;
  if not found then
    return null;
  end if;

  select ct.* into v_tool
  from catalog_tools ct
  where ct.project_id = v_agent.project_id
    and replace(ct.exposed_name, '.', '_') = p_wire_name
  limit 1;
  if not found then
    return jsonb_build_object('found', false);
  end if;

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

create or replace function public.gateway_check_approval (p_key_hash text, p_approval_id uuid)
returns jsonb
language sql security definer stable
set search_path = public
as $$
  select jsonb_build_object(
    'status', ap.status,
    'result', ap.result,
    'approver', ap.approver,
    'decided_at', ap.decided_at,
    'exposed_tool', ap.exposed_tool
  )
  from approvals ap
  join agents a on a.project_id = ap.project_id
  where a.key_hash = p_key_hash and ap.id = p_approval_id;
$$;

-- Explicit execution surface: only the gateway functions are anon-callable.
revoke execute on function public.gateway_handshake (text) from public;
revoke execute on function public.gateway_list_tools (text) from public;
revoke execute on function public.gateway_call_context (text, text) from public;
revoke execute on function public.gateway_log (text, uuid, text, text, text, jsonb, text, jsonb) from public;
revoke execute on function public.gateway_create_approval (text, uuid, text, jsonb, text, uuid, uuid) from public;
revoke execute on function public.gateway_check_approval (text, uuid) from public;

grant execute on function public.gateway_handshake (text) to anon, authenticated, service_role;
grant execute on function public.gateway_list_tools (text) to anon, authenticated, service_role;
grant execute on function public.gateway_call_context (text, text) to anon, authenticated, service_role;
grant execute on function public.gateway_log (text, uuid, text, text, text, jsonb, text, jsonb) to anon, authenticated, service_role;
grant execute on function public.gateway_create_approval (text, uuid, text, jsonb, text, uuid, uuid) to anon, authenticated, service_role;
grant execute on function public.gateway_check_approval (text, uuid) to anon, authenticated, service_role;

-- ---------- demo data removal ----------
-- Seeded demo servers cascade to their tools, policies, and secrets;
-- audit/approval rows keep history with server_id nulled.
delete from public.mcp_servers where kind = 'mock';
