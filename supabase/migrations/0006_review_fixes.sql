-- Polyshield 0006 — fixes from the adversarial review.
--   1. runner_report_tools no longer deletes owner policies for tools a
--      downstream server omits from a discovery report (fail-open downgrade:
--      a compromised/flaky stdio MCP could erase the deny gating it).
--   2. stdio job lifecycle: the gateway can atomically abandon a job it timed
--      out on, and the claim window is tightened, so a job the gateway gave
--      up on can't still execute later (double-execution / "told failed but
--      it ran").

-- ---------- 1. keep policies across re-discovery ----------

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

  -- Tools the server no longer reports stop being exposed (fail-closed: a
  -- vanished tool can't be called). Their POLICIES are intentionally kept:
  -- deleting them would let a downstream server erase the gating on a tool
  -- simply by omitting it from one report, then re-introduce the tool at a
  -- weaker default. A kept policy re-applies the moment the tool returns and
  -- is otherwise inert (it keys on the exposed_name string).
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
      coalesce((e ->> 'risky')::boolean, false) as risky
    from jsonb_array_elements(coalesce(p_tools, '[]'::jsonb)) e
    where coalesce(e ->> 'name', '') <> ''
  loop
    v_exposed := v_server.prefix || '.' || t.name;

    insert into catalog_tools (project_id, server_id, raw_name, raw_description, input_schema, exposed_name, enabled)
    values (v.project_id, v_server.id, t.name, t.description, t.input_schema, v_exposed, true)
    on conflict (server_id, raw_name) do update
      set raw_description = excluded.raw_description,
          input_schema = excluded.input_schema,
          exposed_name = excluded.exposed_name;

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

-- ---------- 2. tighten the stdio job lifecycle ----------
-- Claim now (a) expires pending jobs older than 70s — just past the gateway's
-- 55s wait, so a job the gateway already abandoned can't be picked up — and
-- (b) reaps jobs stuck "running" for >5m so they can't execute indefinitely
-- after the gateway gave up.

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
    returning j.id, j.server_id, j.raw_name, j.args
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', u.id,
    'server_id', u.server_id,
    'raw_name', u.raw_name,
    'args', u.args
  )), '[]'::jsonb) into v_jobs
  from updated u;

  return coalesce(v_jobs, '[]'::jsonb);
end;
$$;

-- Atomically abandon a job the gateway timed out on. Returns the FINAL state
-- so the gateway can tell the agent the truth: if we flipped pending→expired
-- the side effect never ran (safe); if it was already running/done the action
-- may have happened and must not be retried.
create or replace function public.gateway_abandon_job (
  p_key_hash text,
  p_job_id uuid,
  p_proof text
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_agent record;
  v_abandoned int;
  v_row record;
begin
  if not gateway_proof_ok (p_proof) then
    return null;
  end if;
  select a.project_id into v_agent from agents a where a.key_hash = p_key_hash;
  if not found then
    return null;
  end if;

  update runner_jobs
  set status = 'expired', finished_at = now ()
  where id = p_job_id and project_id = v_agent.project_id and status = 'pending';
  get diagnostics v_abandoned = row_count;

  select status, result, error into v_row
  from runner_jobs
  where id = p_job_id and project_id = v_agent.project_id;

  return jsonb_build_object(
    'abandoned', v_abandoned > 0,
    'status', v_row.status,
    'result', v_row.result,
    'error', v_row.error
  );
end;
$$;

revoke execute on function public.gateway_abandon_job (text, uuid, text) from public;
grant execute on function public.gateway_abandon_job (text, uuid, text) to anon, authenticated, service_role;
