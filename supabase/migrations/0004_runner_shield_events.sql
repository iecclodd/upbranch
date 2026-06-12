-- Polyshield 0004 — local runner, live catalog revision, prompt-injection
-- shield mode, and admin audit events.
--
-- Runner model: a daemon on the user's machine pairs with a token (hash
-- stored, same as agent keys), dials OUT over HTTPS, and is the only thing
-- that ever launches local stdio MCPs. The cloud never connects in. Tool
-- calls for stdio servers become runner_jobs rows the runner claims,
-- executes locally, and completes; the gateway awaits the result.

-- ---------- runners ----------

create table public.runners (
  id uuid primary key default gen_random_uuid (),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  token_hash text not null,
  hostname text,
  version text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now ()
);
create unique index runners_token_hash_idx on public.runners (token_hash);
create index runners_project_idx on public.runners (project_id);

alter table public.runners enable row level security;
create policy "own runners" on public.runners
  for all using (public.owns_project (project_id))
  with check (public.owns_project (project_id));

-- ---------- runner jobs ----------
-- One row per stdio tool call in flight. The dashboard (user session) may
-- also insert rows directly via RLS when executing an approved stdio call.

create table public.runner_jobs (
  id uuid primary key default gen_random_uuid (),
  project_id uuid not null references public.projects (id) on delete cascade,
  server_id uuid not null references public.mcp_servers (id) on delete cascade,
  runner_id uuid references public.runners (id) on delete set null,
  raw_name text not null,
  args jsonb not null default '{}'::jsonb,
  agent text not null default '',
  status text not null default 'pending', -- pending|running|done|error|expired
  result jsonb,
  error text,
  created_at timestamptz not null default now (),
  claimed_at timestamptz,
  finished_at timestamptz
);
create index runner_jobs_pending_idx on public.runner_jobs (project_id, status, created_at);

alter table public.runner_jobs enable row level security;
create policy "own runner jobs" on public.runner_jobs
  for all using (public.owns_project (project_id))
  with check (public.owns_project (project_id));

-- ---------- live catalog revision ----------
-- Bumped on every catalog change; the gateway's SSE stream polls it and
-- pushes notifications/tools/list_changed so agents refresh without restart.

alter table public.projects
  add column if not exists catalog_revision bigint not null default 0;

create or replace function public.bump_catalog_revision ()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  update projects
  set catalog_revision = catalog_revision + 1
  where id = coalesce(new.project_id, old.project_id);
  return coalesce(new, old);
end;
$$;

create trigger catalog_tools_revision
  after insert or update or delete on public.catalog_tools
  for each row execute function public.bump_catalog_revision ();

-- ---------- prompt-injection shield ----------
-- off: pass results through untouched. flag (default): prepend a warning
-- block when a downstream result matches injection heuristics. block:
-- replace the result entirely.

alter table public.mcp_servers
  add column if not exists shield_mode text not null default 'flag';

-- ---------- admin audit events ----------
-- The audit log now also records control-plane changes (server added,
-- tool toggled, policy edited, ...) with event_type='admin'.

alter table public.audit_log
  add column if not exists event_type text not null default 'tool_call';

-- Re-discovery upserts need a stable conflict target.
create unique index if not exists catalog_tools_server_raw_idx
  on public.catalog_tools (server_id, raw_name);

-- ---------- gateway_call_context: include shield_mode ----------

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
      'transport', v_server.transport,
      'shield_mode', v_server.shield_mode
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

-- ---------- runner RPCs ----------
-- Same trust model as the gateway RPCs: the control-plane route holds only
-- the anon key; a valid runner token hash scopes every operation to exactly
-- that runner's project.

create or replace function public.runner_handshake (
  p_token_hash text,
  p_hostname text,
  p_version text
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v record;
begin
  select id, name, project_id into v from runners where token_hash = p_token_hash;
  if not found then
    return null;
  end if;
  update runners
  set last_seen_at = now (),
      hostname = coalesce(p_hostname, hostname),
      version = coalesce(p_version, version)
  where id = v.id;
  return jsonb_build_object(
    'runner_id', v.id,
    'runner_name', v.name,
    'project_id', v.project_id
  );
end;
$$;

-- Stdio server configs for this runner's project. transport.env is masked in
-- the DB; real values live in server_secrets as 'env:KEY' ciphertext, which
-- the control-plane route decrypts before handing to the paired runner.
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

-- Replace a stdio server's discovered catalog. p_tools is
-- [{name, description, input_schema, risky}] with risky computed by the
-- control plane. Existing enabled flags are preserved; vanished tools (and
-- their policies) are dropped; new risky tools are auto-gated.
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

  -- Tools the server no longer reports disappear, along with their policies.
  delete from policies p
  where p.server_id = v_server.id
    and p.exposed_tool not in (
      select v_server.prefix || '.' || (e ->> 'name')
      from jsonb_array_elements(coalesce(p_tools, '[]'::jsonb)) e
    );
  delete from catalog_tools ct
  where ct.server_id = v_server.id
    and ct.raw_name not in (
      select e ->> 'name'
      from jsonb_array_elements(coalesce(p_tools, '[]'::jsonb)) e
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

-- Runner-side health reporting (spawn failures, shutdown).
create or replace function public.runner_set_server_status (
  p_token_hash text,
  p_server_id uuid,
  p_status text,
  p_detail text
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
  if p_status not in ('connected', 'pending', 'error') then
    return false;
  end if;
  update mcp_servers
  set status = p_status,
      description = coalesce(nullif(p_detail, ''), description)
  where id = p_server_id
    and project_id = v.project_id
    and transport ->> 'type' = 'stdio';
  get diagnostics v_count = row_count;
  update runners set last_seen_at = now () where id = v.id;
  return v_count > 0;
end;
$$;

-- Claim up to p_max pending jobs atomically; expire stale ones first so a
-- runner that was offline doesn't replay minutes-old calls.
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
    and created_at < now () - interval '2 minutes';

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
  v_count int;
begin
  select r.id, r.project_id into v from runners r where r.token_hash = p_token_hash;
  if not found then
    return false;
  end if;
  update runner_jobs
  set status = case when p_error is null or p_error = '' then 'done' else 'error' end,
      result = p_result,
      error = nullif(p_error, ''),
      finished_at = now ()
  where id = p_job_id
    and project_id = v.project_id
    and runner_id = v.id
    and status = 'running';
  get diagnostics v_count = row_count;
  update runners set last_seen_at = now () where id = v.id;
  return v_count > 0;
end;
$$;

-- ---------- gateway-side job RPCs ----------

create or replace function public.gateway_enqueue_job (
  p_key_hash text,
  p_server_id uuid,
  p_raw_name text,
  p_args jsonb
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_agent record;
  v_id uuid;
begin
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

create or replace function public.gateway_job_status (p_key_hash text, p_job_id uuid)
returns jsonb
language sql security definer stable
set search_path = public
as $$
  select jsonb_build_object(
    'status', j.status,
    'result', j.result,
    'error', j.error
  )
  from runner_jobs j
  join agents a on a.project_id = j.project_id
  where a.key_hash = p_key_hash and j.id = p_job_id;
$$;

create or replace function public.gateway_catalog_revision (p_key_hash text)
returns bigint
language sql security definer stable
set search_path = public
as $$
  select p.catalog_revision
  from projects p
  join agents a on a.project_id = p.id
  where a.key_hash = p_key_hash;
$$;

-- ---------- execution surface ----------

revoke execute on function public.runner_handshake (text, text, text) from public;
revoke execute on function public.runner_get_config (text) from public;
revoke execute on function public.runner_report_tools (text, uuid, jsonb) from public;
revoke execute on function public.runner_set_server_status (text, uuid, text, text) from public;
revoke execute on function public.runner_claim_jobs (text, int) from public;
revoke execute on function public.runner_complete_job (text, uuid, jsonb, text) from public;
revoke execute on function public.gateway_enqueue_job (text, uuid, text, jsonb) from public;
revoke execute on function public.gateway_job_status (text, uuid) from public;
revoke execute on function public.gateway_catalog_revision (text) from public;

grant execute on function public.runner_handshake (text, text, text) to anon, authenticated, service_role;
grant execute on function public.runner_get_config (text) to anon, authenticated, service_role;
grant execute on function public.runner_report_tools (text, uuid, jsonb) to anon, authenticated, service_role;
grant execute on function public.runner_set_server_status (text, uuid, text, text) to anon, authenticated, service_role;
grant execute on function public.runner_claim_jobs (text, int) to anon, authenticated, service_role;
grant execute on function public.runner_complete_job (text, uuid, jsonb, text) to anon, authenticated, service_role;
grant execute on function public.gateway_enqueue_job (text, uuid, text, jsonb) to anon, authenticated, service_role;
grant execute on function public.gateway_job_status (text, uuid) to anon, authenticated, service_role;
grant execute on function public.gateway_catalog_revision (text) to anon, authenticated, service_role;
