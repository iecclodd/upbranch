-- Polyshield 0016 - focused security audit fixes.
--
-- Authenticated users must be able to read their own queue/audit/approval
-- state in the dashboard, but they must not be able to forge or mutate these
-- security-sensitive rows directly through PostgREST. Writes now go through
-- narrow SECURITY DEFINER RPCs that re-check project ownership and preserve
-- the existing dashboard flows.

-- runner_jobs is an execution queue. Direct user writes could enqueue local
-- side effects without the gateway policy engine or approval path, so keep
-- owner SELECT only and require enqueue RPCs for dashboard-created jobs.
drop policy if exists "own runner jobs" on public.runner_jobs;
drop policy if exists "own runner jobs read" on public.runner_jobs;
create policy "own runner jobs read" on public.runner_jobs
  for select to authenticated
  using (public.owns_project (project_id));

-- audit_log is the tamper-evident history. Direct user inserts/updates/deletes
-- could forge or rewrite enforcement outcomes, so keep owner SELECT only and
-- require logging/finalization RPCs for dashboard-originated events.
drop policy if exists "own audit" on public.audit_log;
drop policy if exists "own audit read" on public.audit_log;
create policy "own audit read" on public.audit_log
  for select to authenticated
  using (public.owns_project (project_id));

-- approvals are the authorization gate. Direct user writes could approve,
-- deny, or alter pending requests outside the atomic decision RPC, so keep
-- owner SELECT only and require dashboard approval RPCs for decisions/results.
drop policy if exists "own approvals" on public.approvals;
drop policy if exists "own approvals read" on public.approvals;
create policy "own approvals read" on public.approvals
  for select to authenticated
  using (public.owns_project (project_id));

-- Defense in depth: even if a future permissive policy appears, PostgREST
-- callers in anon/authenticated roles should not hold table-level DML grants
-- for these security-sensitive tables.
revoke insert, update, delete on table public.runner_jobs from public, anon, authenticated;
revoke insert, update, delete on table public.audit_log from public, anon, authenticated;
revoke insert, update, delete on table public.approvals from public, anon, authenticated;

-- Privacy-mode approvals keep the executable payload encrypted with the app
-- vault key. The visible approval args row stores only redacted metadata, and
-- this ciphertext is cleared once a human denies/finalizes the approval.
alter table public.approvals
  add column if not exists args_ciphertext text,
  add column if not exists agent_id uuid references public.agents (id) on delete set null;

create index if not exists approvals_agent_id_idx on public.approvals (agent_id);

-- Helper used only by dashboard definer RPCs. It derives a display name from
-- the trusted session rather than accepting an arbitrary approver string from
-- the client.
create or replace function public.dashboard_actor ()
returns text
language sql security definer stable
set search_path = public
as $$
  select coalesce(
    (select nullif(p.email, '') from public.profiles p where p.id = auth.uid ()),
    nullif(auth.jwt () ->> 'email', ''),
    'dashboard'
  );
$$;

revoke execute on function public.dashboard_actor () from public;

-- Privacy mode must not persist readable approval results at rest. This keeps
-- the MCP result shape so polling agents get a valid tool result, but replaces
-- readable content with metadata.
create or replace function public.dashboard_redacted_tool_result (p_result jsonb)
returns jsonb
language sql security definer stable
set search_path = public
as $$
  select jsonb_build_object(
    'content', jsonb_build_array(jsonb_build_object(
      'type', 'text',
      'text', 'Privacy mode is enabled; Polyshield redacted this approved tool result at rest.'
    )),
    'structuredContent', jsonb_build_object(
      '_redacted', true,
      'bytes', length(coalesce(p_result::text, 'null'))
    ),
    'isError', case
      when jsonb_typeof(coalesce(p_result, '{}'::jsonb) -> 'isError') = 'boolean'
        then (coalesce(p_result, '{}'::jsonb) ->> 'isError')::boolean
      else false
    end
  );
$$;

revoke execute on function public.dashboard_redacted_tool_result (jsonb) from public;

-- Gateway-only approval creation, extended with encrypted args for privacy
-- mode. `p_args` is what operators see; when privacy mode is on it is redacted
-- metadata, while `p_args_ciphertext` is decrypted only by dashboard execution.
drop function if exists public.gateway_create_approval (text, uuid, text, jsonb, text, uuid, uuid, jsonb, text, text);

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
  p_proof text,
  p_args_ciphertext text default null
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

  insert into approvals (
    project_id, server_id, audit_id, policy_id, agent_id, agent, exposed_tool, args,
    args_ciphertext, reason, status, context, risk
  )
  values (
    v_agent.project_id, p_server_id, p_audit_id, p_policy_id, v_agent.id, v_agent.name,
    p_exposed_tool, coalesce(p_args, '{}'::jsonb), nullif(p_args_ciphertext, ''),
    coalesce(p_reason, ''), 'pending', p_context, p_risk
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- Approval tickets are scoped to the exact agent key that created them.
-- Project-level matching would let another agent in the same project poll a
-- ticket and receive approved tool results intended for a different agent.
create or replace function public.gateway_check_approval (p_key_hash text, p_approval_id uuid)
returns jsonb
language sql security definer
set search_path = public
as $$
  select jsonb_build_object(
    'status', ap.status,
    'result', ap.result,
    'approver', ap.approver,
    'exposed_tool', ap.exposed_tool
  )
  from public.approvals ap
  join public.agents a on a.id = ap.agent_id and a.project_id = ap.project_id
  where a.key_hash = p_key_hash
    and ap.id = p_approval_id;
$$;

-- Narrow replacement for dashboard admin audit inserts.
create or replace function public.dashboard_log_admin_event (
  p_project_id uuid,
  p_server_id uuid,
  p_target text,
  p_detail text
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_actor text;
  v_id uuid;
begin
  if not public.owns_project (p_project_id) then
    return null;
  end if;

  if p_server_id is not null and not exists (
    select 1 from public.mcp_servers s
    where s.id = p_server_id and s.project_id = p_project_id
  ) then
    return null;
  end if;

  v_actor := public.dashboard_actor ();

  insert into public.audit_log (
    project_id, server_id, agent, exposed_tool, decision, status, event_type, reason, args
  )
  values (
    p_project_id, p_server_id, v_actor, left(coalesce(p_target, 'dashboard'), 256),
    'allow', 'info', 'admin', left(coalesce(p_detail, ''), 2000), '{}'::jsonb
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Atomic approval decision. Denials also update the linked audit row inside
-- the same trusted RPC so direct audit/approval updates stay closed.
create or replace function public.dashboard_claim_approval_decision (
  p_approval_id uuid,
  p_decision text
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_actor text;
  v_approval record;
begin
  if p_decision not in ('approved', 'denied') then
    return null;
  end if;

  v_actor := public.dashboard_actor ();

  with claimed as (
    update public.approvals ap
    set status = p_decision,
        approver = v_actor,
        decided_via = 'dashboard',
        decided_at = now ()
    from public.projects p
    where ap.id = p_approval_id
      and ap.project_id = p.id
      and p.owner_id = auth.uid ()
      and ap.status = 'pending'
    returning
      ap.id, ap.project_id, ap.audit_id, ap.server_id, ap.exposed_tool,
      ap.args, ap.args_ciphertext, ap.approver, p.privacy_mode
  )
  select * into v_approval from claimed;

  if not found then
    return null;
  end if;

  if p_decision = 'denied' and v_approval.audit_id is not null then
    update public.audit_log
    set status = 'denied',
        approver = v_actor,
        decided_via = 'dashboard',
        reason = 'Denied by approver - not forwarded.'
    where id = v_approval.audit_id
      and project_id = v_approval.project_id;
  end if;

  if p_decision = 'denied' and coalesce(v_approval.privacy_mode, false) then
    update public.approvals
    set args_ciphertext = null,
        args = jsonb_build_object(
          '_redacted', true,
          'bytes', length(coalesce(v_approval.args::text, 'null'))
        )
    where id = v_approval.id
      and project_id = v_approval.project_id;
  end if;

  return jsonb_build_object(
    'id', v_approval.id,
    'audit_id', v_approval.audit_id,
    'server_id', v_approval.server_id,
    'exposed_tool', v_approval.exposed_tool,
    'args', coalesce(v_approval.args, '{}'::jsonb),
    'args_ciphertext', v_approval.args_ciphertext,
    'approver', v_approval.approver
  );
end;
$$;

-- Trusted finalization for approved dashboard executions. The RPC enforces
-- owner scope, writes the agent-visible approval result, and updates the linked
-- audit row without exposing direct update access to either table.
create or replace function public.dashboard_finish_approval (
  p_approval_id uuid,
  p_result jsonb,
  p_audit_result jsonb,
  p_status text,
  p_reason text
)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_approval record;
  v_result jsonb;
  v_audit_result jsonb;
begin
  if p_status not in ('approved', 'blocked', 'error') then
    return false;
  end if;

  select ap.id, ap.project_id, ap.audit_id, ap.approver, ap.args, p.privacy_mode
  into v_approval
  from public.approvals ap
  join public.projects p on p.id = ap.project_id
  where ap.id = p_approval_id
    and p.owner_id = auth.uid ()
    and ap.status = 'approved';

  if not found then
    return false;
  end if;

  if coalesce(v_approval.privacy_mode, false) then
    v_result := public.dashboard_redacted_tool_result (p_result);
    v_audit_result := jsonb_build_object(
      '_redacted', true,
      'bytes', length(coalesce(coalesce(p_audit_result, p_result)::text, 'null'))
    );
  else
    v_result := p_result;
    v_audit_result := p_audit_result;
  end if;

  update public.approvals
  set result = v_result,
      args_ciphertext = null,
      args = case
        when coalesce(v_approval.privacy_mode, false) then jsonb_build_object(
          '_redacted', true,
          'bytes', length(coalesce(v_approval.args::text, 'null'))
        )
        else args
      end
  where id = v_approval.id
    and project_id = v_approval.project_id;

  if v_approval.audit_id is not null then
    update public.audit_log
    set status = p_status,
        approver = v_approval.approver,
        decided_via = 'dashboard',
        reason = left(coalesce(p_reason, ''), 2000),
        result = v_audit_result
    where id = v_approval.audit_id
      and project_id = v_approval.project_id;
  end if;

  return true;
end;
$$;

-- Narrow replacement for approved stdio execution enqueue. It only accepts
-- owner-scoped stdio catalog tools, keeps the agent label fixed, and refuses
-- to enqueue if no paired runner is currently online.
create or replace function public.dashboard_enqueue_approved_runner_job (
  p_project_id uuid,
  p_server_id uuid,
  p_raw_name text,
  p_args jsonb,
  p_meta jsonb
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.owns_project (p_project_id) then
    return jsonb_build_object('queued', false, 'reason', 'not_found');
  end if;

  if coalesce(p_raw_name, '') = '' or length(p_raw_name) > 256 then
    return jsonb_build_object('queued', false, 'reason', 'bad_tool');
  end if;

  if not exists (
    select 1 from public.mcp_servers s
    where s.id = p_server_id
      and s.project_id = p_project_id
      and s.transport ->> 'type' = 'stdio'
  ) then
    return jsonb_build_object('queued', false, 'reason', 'unknown_server');
  end if;

  if not exists (
    select 1 from public.catalog_tools ct
    where ct.project_id = p_project_id
      and ct.server_id = p_server_id
      and ct.raw_name = p_raw_name
      and ct.enabled = true
  ) then
    return jsonb_build_object('queued', false, 'reason', 'unknown_tool');
  end if;

  if not exists (
    select 1 from public.runners r
    where r.project_id = p_project_id
      and r.last_seen_at > now () - interval '90 seconds'
  ) then
    return jsonb_build_object('queued', false, 'reason', 'no_runner');
  end if;

  insert into public.runner_jobs (project_id, server_id, raw_name, args, agent, kind, meta)
  values (
    p_project_id, p_server_id, p_raw_name, coalesce(p_args, '{}'::jsonb),
    'approval-execute', 'call', coalesce(p_meta, '{}'::jsonb)
  )
  returning id into v_id;

  return jsonb_build_object('queued', true, 'job_id', v_id);
end;
$$;

-- Narrow replacement for snapshot restore enqueue. The snapshot row is locked
-- and marked restoring in the same RPC that creates the restore job, preventing
-- direct queue insertion and duplicate restore clicks from racing.
create or replace function public.dashboard_enqueue_restore_job (p_snapshot_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_snap record;
  v_id uuid;
begin
  select rs.*
  into v_snap
  from public.runner_snapshots rs
  join public.projects p on p.id = rs.project_id
  where rs.id = p_snapshot_id
    and p.owner_id = auth.uid ()
  for update of rs;

  if not found then
    return jsonb_build_object('queued', false, 'reason', 'not_found');
  end if;

  if v_snap.server_id is null then
    return jsonb_build_object('queued', false, 'reason', 'missing_server');
  end if;

  if v_snap.status <> 'available' then
    return jsonb_build_object('queued', false, 'reason', 'not_available');
  end if;

  if not exists (
    select 1 from public.mcp_servers s
    where s.id = v_snap.server_id
      and s.project_id = v_snap.project_id
      and s.transport ->> 'type' = 'stdio'
  ) then
    return jsonb_build_object('queued', false, 'reason', 'unknown_server');
  end if;

  if not exists (
    select 1 from public.runners r
    where r.project_id = v_snap.project_id
      and r.last_seen_at > now () - interval '90 seconds'
  ) then
    return jsonb_build_object('queued', false, 'reason', 'no_runner');
  end if;

  insert into public.runner_jobs (project_id, server_id, raw_name, args, agent, kind, meta)
  values (
    v_snap.project_id,
    v_snap.server_id,
    '__restore__',
    '{}'::jsonb,
    'snapshot-restore',
    'restore',
    jsonb_build_object('snapshotId', v_snap.id, 'ref', v_snap.ref, 'scopePath', v_snap.scope_path)
  )
  returning id into v_id;

  update public.runner_snapshots
  set status = 'restoring'
  where id = v_snap.id;

  return jsonb_build_object(
    'queued', true,
    'job_id', v_id,
    'server_id', v_snap.server_id,
    'label', v_snap.label
  );
end;
$$;

revoke execute on function public.dashboard_log_admin_event (uuid, uuid, text, text) from public;
revoke execute on function public.dashboard_claim_approval_decision (uuid, text) from public;
revoke execute on function public.dashboard_finish_approval (uuid, jsonb, jsonb, text, text) from public;
revoke execute on function public.dashboard_enqueue_approved_runner_job (uuid, uuid, text, jsonb, jsonb) from public;
revoke execute on function public.dashboard_enqueue_restore_job (uuid) from public;
revoke execute on function public.gateway_create_approval (text, uuid, text, jsonb, text, uuid, uuid, jsonb, text, text, text) from public;
revoke execute on function public.gateway_check_approval (text, uuid) from public;

grant execute on function public.dashboard_log_admin_event (uuid, uuid, text, text) to authenticated;
grant execute on function public.dashboard_claim_approval_decision (uuid, text) to authenticated;
grant execute on function public.dashboard_finish_approval (uuid, jsonb, jsonb, text, text) to authenticated;
grant execute on function public.dashboard_enqueue_approved_runner_job (uuid, uuid, text, jsonb, jsonb) to authenticated;
grant execute on function public.dashboard_enqueue_restore_job (uuid) to authenticated;
grant execute on function public.gateway_create_approval (text, uuid, text, jsonb, text, uuid, uuid, jsonb, text, text, text) to anon, authenticated, service_role;
grant execute on function public.gateway_check_approval (text, uuid) to anon, authenticated, service_role;
