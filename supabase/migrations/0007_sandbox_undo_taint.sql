-- Polyshield 0007 — runner sandbox, undo/rollback, dry-run diff previews,
-- taint/provenance propagation, and the `flag` decision.
--
-- These are the local-execution features a cloud connector gateway can't
-- offer (PRD R11/R12 + §10 taint rule + §12.1 diff previews). The cloud only
-- ever holds policy + metadata; the runner does the filesystem work.

-- ---------- per-server sandbox profile ----------
-- fsScope: allowlisted root dirs (cwd is pinned here; path args escaping it
--   are refused). egress.mode: inherit|none|allowlist. limits.wallMs: per-call
--   kill timer. snapshotBeforeWrite: snapshot the scope before destructive
--   approved calls (undo). dryRunOnApproval: run gated calls against a
--   copy-on-write copy first and show the diff. stripEnv: child gets only
--   declared env + passthrough, not ambient host vars.
alter table public.mcp_servers
  add column if not exists sandbox_profile jsonb not null default jsonb_build_object(
    'fsScope', '[]'::jsonb,
    'egress', jsonb_build_object('mode', 'inherit', 'allow', '[]'::jsonb),
    'limits', jsonb_build_object('wallMs', 60000),
    'snapshotBeforeWrite', false,
    'dryRunOnApproval', false,
    'stripEnv', false
  );

-- ---------- job kinds + metadata ----------
-- kind: call | dryrun | restore. meta carries snapshot flags, the linked
-- approval (dryrun), the snapshot ref (restore), and the fs scope.
alter table public.runner_jobs
  add column if not exists kind text not null default 'call',
  add column if not exists meta jsonb not null default '{}'::jsonb;

-- ---------- snapshots (undo) ----------
create table if not exists public.runner_snapshots (
  id uuid primary key default gen_random_uuid (),
  project_id uuid not null references public.projects (id) on delete cascade,
  server_id uuid references public.mcp_servers (id) on delete set null,
  job_id uuid references public.runner_jobs (id) on delete set null,
  audit_id uuid references public.audit_log (id) on delete set null,
  label text not null default '',
  scope_path text not null default '',
  ref text not null,
  kind text not null default 'copy',
  status text not null default 'available', -- available|restoring|restored|gone
  bytes bigint,
  created_at timestamptz not null default now (),
  restored_at timestamptz
);
create index if not exists runner_snapshots_project_idx
  on public.runner_snapshots (project_id, created_at desc);

alter table public.runner_snapshots enable row level security;
create policy "own snapshots" on public.runner_snapshots
  for all using (public.owns_project (project_id))
  with check (public.owns_project (project_id));

-- ---------- approval card extras: diff preview, context, risk ----------
alter table public.approvals
  add column if not exists preview jsonb,
  add column if not exists context jsonb,
  add column if not exists risk text;

-- ---------- audit correlation + risk ----------
alter table public.audit_log
  add column if not exists risk text,
  add column if not exists request_id text;

-- ---------- taint / provenance ----------
-- One row per untrusted-data event for an agent: an injection-flagged result
-- or output from an ingestion tool (web/fetch/read). Used to escalate risky
-- downstream actions by the same agent within a short window.
create table if not exists public.taint_events (
  id uuid primary key default gen_random_uuid (),
  project_id uuid not null references public.projects (id) on delete cascade,
  agent text not null,
  kind text not null,            -- shield_flag | untrusted_source
  source_tool text,
  detail text,
  created_at timestamptz not null default now ()
);
create index if not exists taint_events_lookup
  on public.taint_events (project_id, agent, created_at desc);

alter table public.taint_events enable row level security;
create policy "own taint" on public.taint_events
  for all using (public.owns_project (project_id))
  with check (public.owns_project (project_id));

alter table public.projects
  add column if not exists taint_escalation boolean not null default true;

-- ====================================================================
-- RPC updates
-- ====================================================================

-- ---------- call context: + sandbox_profile, taint, agent name ----------
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
  v_tainted boolean;
  v_escalate boolean;
begin
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

  -- Agent is "tainted" if it ingested untrusted data in the last 30 minutes.
  select exists (
    select 1 from taint_events te
    where te.project_id = v_agent.project_id
      and te.agent = v_agent.name
      and te.created_at > now () - interval '30 minutes'
  ) into v_tainted;

  select coalesce(p.taint_escalation, true) into v_escalate
  from projects p where p.id = v_agent.project_id;

  return jsonb_build_object(
    'found', true,
    'agent_name', v_agent.name,
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
    'taint', jsonb_build_object('tainted', v_tainted, 'escalation', v_escalate),
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

-- ---------- audit log: allow `flag`/`flagged`, store risk + request_id ----------
drop function if exists public.gateway_log (text, uuid, text, text, text, jsonb, text, jsonb, text);

create or replace function public.gateway_log (
  p_key_hash text,
  p_server_id uuid,
  p_exposed_tool text,
  p_decision text,
  p_status text,
  p_args jsonb,
  p_reason text,
  p_result jsonb,
  p_risk text,
  p_request_id text,
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

  if p_decision not in ('allow', 'deny', 'require_approval', 'flag') then
    return null;
  end if;
  if p_status not in ('allowed', 'denied', 'waiting_for_approval', 'approved', 'blocked', 'error', 'flagged') then
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

  insert into audit_log (project_id, server_id, agent, exposed_tool, decision, status, args, reason, result, risk, request_id, event_type)
  values (
    v_agent.project_id, p_server_id, v_agent.name, p_exposed_tool,
    p_decision, p_status, coalesce(p_args, '{}'::jsonb), p_reason, p_result, p_risk, p_request_id, 'tool_call'
  )
  returning id into v_id;

  if p_server_id is not null then
    update mcp_servers set last_action_at = now () where id = p_server_id;
  end if;

  return v_id;
end;
$$;

-- ---------- create approval: + context, risk ----------
drop function if exists public.gateway_create_approval (text, uuid, text, jsonb, text, uuid, uuid, text);

create or replace function public.gateway_create_approval (
  p_key_hash text,
  p_server_id uuid,
  p_exposed_tool text,
  p_args jsonb,
  p_reason text,
  p_policy_id uuid,
  p_audit_id uuid,
  p_context jsonb,
  p_risk text,
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

  insert into approvals (project_id, server_id, audit_id, policy_id, agent, exposed_tool, args, reason, status, context, risk)
  values (
    v_agent.project_id, p_server_id, p_audit_id, p_policy_id, v_agent.name,
    p_exposed_tool, coalesce(p_args, '{}'::jsonb), coalesce(p_reason, ''), 'pending', p_context, p_risk
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------- record taint (proof-gated, gateway only) ----------
create or replace function public.gateway_record_taint (
  p_key_hash text,
  p_kind text,
  p_source_tool text,
  p_detail text,
  p_proof text
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
  select name, project_id into v_agent from agents where key_hash = p_key_hash;
  if not found then
    return false;
  end if;
  insert into taint_events (project_id, agent, kind, source_tool, detail)
  values (v_agent.project_id, v_agent.name, p_kind, p_source_tool, left(coalesce(p_detail, ''), 300));
  return true;
end;
$$;

-- ---------- enqueue job: + kind, meta ----------
drop function if exists public.gateway_enqueue_job (text, uuid, text, jsonb, text);

create or replace function public.gateway_enqueue_job (
  p_key_hash text,
  p_server_id uuid,
  p_raw_name text,
  p_args jsonb,
  p_kind text,
  p_meta jsonb,
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
  if p_kind not in ('call', 'dryrun') then
    return jsonb_build_object('queued', false, 'reason', 'bad_kind');
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

  insert into runner_jobs (project_id, server_id, raw_name, args, agent, kind, meta)
  values (v_agent.project_id, p_server_id, p_raw_name, coalesce(p_args, '{}'::jsonb), v_agent.name,
          p_kind, coalesce(p_meta, '{}'::jsonb))
  returning id into v_id;

  return jsonb_build_object('queued', true, 'job_id', v_id);
end;
$$;

-- ---------- runner config: + sandbox_profile ----------
create or replace function public.runner_get_config (p_token_hash text)
returns jsonb
language sql security definer stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'name', s.name,
    'prefix', s.prefix,
    'status', s.status,
    'transport', s.transport,
    'sandbox_profile', s.sandbox_profile,
    'secrets', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', ss.name,
        'ciphertext', ss.ciphertext
      )), '[]'::jsonb)
      from server_secrets ss
      where ss.server_id = s.id
    )
  ) order by s.created_at), '[]'::jsonb)
  from mcp_servers s
  join runners r on r.project_id = s.project_id
  where r.token_hash = p_token_hash
    and s.transport ->> 'type' = 'stdio';
$$;

-- ---------- claim jobs: + kind, meta ----------
create or replace function public.runner_claim_jobs (p_token_hash text, p_max int default 5)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v record;
  v_jobs jsonb;
begin
  select r.id, r.project_id into v from runners r where r.token_hash = p_token_hash;
  if not found then
    return null;
  end if;

  update runners set last_seen_at = now () where id = v.id;

  update runner_jobs
  set status = 'expired', finished_at = now ()
  where project_id = v.project_id
    and status = 'pending'
    and created_at < now () - interval '70 seconds';

  update runner_jobs
  set status = 'expired', finished_at = now ()
  where project_id = v.project_id
    and status = 'running'
    and claimed_at < now () - interval '5 minutes';

  with claimed as (
    select id from runner_jobs
    where project_id = v.project_id and status = 'pending'
    order by created_at
    limit greatest(1, least(coalesce(p_max, 5), 20))
    for update skip locked
  ), updated as (
    update runner_jobs j
    set status = 'running', claimed_at = now (), runner_id = v.id
    from claimed c
    where j.id = c.id
    returning j.id, j.server_id, j.raw_name, j.args, j.kind, j.meta
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', u.id,
    'server_id', u.server_id,
    'raw_name', u.raw_name,
    'args', u.args,
    'kind', u.kind,
    'meta', u.meta
  )), '[]'::jsonb) into v_jobs
  from updated u;

  return coalesce(v_jobs, '[]'::jsonb);
end;
$$;

-- ---------- complete job: route dryrun diffs to the approval card ----------
create or replace function public.runner_complete_job (
  p_token_hash text,
  p_job_id uuid,
  p_result jsonb,
  p_error text
)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v record;
  v_job record;
  v_count int;
begin
  select r.id, r.project_id into v from runners r where r.token_hash = p_token_hash;
  if not found then
    return false;
  end if;

  select * into v_job from runner_jobs
  where id = p_job_id and project_id = v.project_id and runner_id = v.id and status = 'running';
  if not found then
    return false;
  end if;

  update runner_jobs
  set status = case when p_error is null or p_error = '' then 'done' else 'error' end,
      result = p_result,
      error = nullif(p_error, ''),
      finished_at = now ()
  where id = p_job_id;
  get diagnostics v_count = row_count;

  -- A completed dry-run carries the diff for its linked approval card.
  if v_job.kind = 'dryrun'
     and (p_error is null or p_error = '')
     and v_job.meta ? 'approvalId' then
    update approvals
    set preview = p_result
    where id = (v_job.meta ->> 'approvalId')::uuid
      and project_id = v.project_id;
  end if;

  update runners set last_seen_at = now () where id = v.id;
  return v_count > 0;
end;
$$;

-- ---------- record a snapshot (token-gated, runner only) ----------
create or replace function public.runner_report_snapshot (
  p_token_hash text,
  p_server_id uuid,
  p_job_id uuid,
  p_label text,
  p_scope_path text,
  p_ref text,
  p_kind text,
  p_bytes bigint
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v record;
  v_id uuid;
begin
  select r.id, r.project_id into v from runners r where r.token_hash = p_token_hash;
  if not found then
    return null;
  end if;
  if p_server_id is not null and not exists (
    select 1 from mcp_servers s where s.id = p_server_id and s.project_id = v.project_id
  ) then
    return null;
  end if;
  if p_job_id is not null and not exists (
    select 1 from runner_jobs j where j.id = p_job_id and j.project_id = v.project_id
  ) then
    return null;
  end if;

  insert into runner_snapshots (project_id, server_id, job_id, label, scope_path, ref, kind, bytes)
  values (v.project_id, p_server_id, p_job_id, coalesce(p_label, ''), coalesce(p_scope_path, ''),
          p_ref, coalesce(p_kind, 'copy'), p_bytes)
  returning id into v_id;

  update runners set last_seen_at = now () where id = v.id;
  return v_id;
end;
$$;

-- Runner reports the outcome of a restore job back onto the snapshot row.
create or replace function public.runner_mark_snapshot_restored (
  p_token_hash text,
  p_snapshot_id uuid,
  p_ok boolean
)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v record;
  v_count int;
begin
  select r.id, r.project_id into v from runners r where r.token_hash = p_token_hash;
  if not found then
    return false;
  end if;
  update runner_snapshots
  set status = case when p_ok then 'restored' else 'available' end,
      restored_at = case when p_ok then now () else restored_at end
  where id = p_snapshot_id and project_id = v.project_id;
  get diagnostics v_count = row_count;
  update runners set last_seen_at = now () where id = v.id;
  return v_count > 0;
end;
$$;

-- ---------- execution surface ----------
revoke execute on function public.gateway_log (text, uuid, text, text, text, jsonb, text, jsonb, text, text, text) from public;
revoke execute on function public.gateway_create_approval (text, uuid, text, jsonb, text, uuid, uuid, jsonb, text, text) from public;
revoke execute on function public.gateway_record_taint (text, text, text, text, text) from public;
revoke execute on function public.gateway_enqueue_job (text, uuid, text, jsonb, text, jsonb, text) from public;
revoke execute on function public.runner_report_snapshot (text, uuid, uuid, text, text, text, text, bigint) from public;
revoke execute on function public.runner_mark_snapshot_restored (text, uuid, boolean) from public;

grant execute on function public.gateway_log (text, uuid, text, text, text, jsonb, text, jsonb, text, text, text) to anon, authenticated, service_role;
grant execute on function public.gateway_create_approval (text, uuid, text, jsonb, text, uuid, uuid, jsonb, text, text) to anon, authenticated, service_role;
grant execute on function public.gateway_record_taint (text, text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.gateway_enqueue_job (text, uuid, text, jsonb, text, jsonb, text) to anon, authenticated, service_role;
grant execute on function public.runner_report_snapshot (text, uuid, uuid, text, text, text, text, bigint) to anon, authenticated, service_role;
grant execute on function public.runner_mark_snapshot_restored (text, uuid, boolean) to anon, authenticated, service_role;
