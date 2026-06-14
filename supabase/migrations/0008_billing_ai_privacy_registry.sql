-- Polyshield 0008 — monetization + trust surface.
--   billing (Stripe) fields, AI usage metering with a hard daily cap,
--   offline/privacy mode, per-tool poisoning-scan risk flags, registry origin.
-- All additive so a live session keeps working.

-- ---------- billing ----------
alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists plan_status text not null default 'active',
  add column if not exists current_period_end timestamptz;

-- ---------- offline / privacy mode + slack ----------
-- privacy_mode: the gateway stores only redacted metadata (sizes, not values)
-- for tool args/results, so code and tool output never leave the machine in
-- readable form — only policy metadata reaches the cloud.
alter table public.projects
  add column if not exists privacy_mode boolean not null default false,
  add column if not exists slack_webhook_ciphertext text;

-- ---------- tool-poisoning scan ----------
-- Risk of the tool DEFINITION itself (name/description/schema), scanned at
-- discovery — distinct from the shield which scans tool RESULTS.
alter table public.catalog_tools
  add column if not exists risk text not null default 'none', -- none | low | high
  add column if not exists risk_detail text;

-- ---------- registry origin ----------
alter table public.mcp_servers
  add column if not exists origin text not null default 'custom', -- custom | registry
  add column if not exists registry_id text;

-- ---------- AI usage metering ----------
create table if not exists public.ai_usage (
  project_id uuid not null references public.projects (id) on delete cascade,
  day date not null,
  calls int not null default 0,
  output_tokens bigint not null default 0,
  primary key (project_id, day)
);
alter table public.ai_usage enable row level security;
create policy "own ai usage" on public.ai_usage
  for all using (public.owns_project (project_id))
  with check (public.owns_project (project_id));

-- Atomic check-and-consume against a daily cap. Called from the user's
-- authenticated session (gated by owns_project). Returns whether the call is
-- allowed plus the remaining budget, and reserves the estimated output.
create or replace function public.ai_consume (
  p_project_id uuid,
  p_daily_call_cap int,
  p_daily_token_cap bigint,
  p_est_output int
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_calls int;
  v_tokens bigint;
begin
  if not public.owns_project (p_project_id) then
    return jsonb_build_object('allowed', false, 'reason', 'forbidden');
  end if;

  insert into ai_usage (project_id, day, calls, output_tokens)
  values (p_project_id, v_today, 0, 0)
  on conflict (project_id, day) do nothing;

  select calls, output_tokens into v_calls, v_tokens
  from ai_usage where project_id = p_project_id and day = v_today
  for update;

  if v_calls >= p_daily_call_cap then
    return jsonb_build_object('allowed', false, 'reason', 'daily_call_cap', 'calls', v_calls);
  end if;
  if v_tokens + coalesce(p_est_output, 0) > p_daily_token_cap then
    return jsonb_build_object('allowed', false, 'reason', 'daily_token_cap', 'tokens', v_tokens);
  end if;

  update ai_usage
  set calls = calls + 1, output_tokens = output_tokens + coalesce(p_est_output, 0)
  where project_id = p_project_id and day = v_today;

  return jsonb_build_object('allowed', true, 'calls', v_calls + 1);
end;
$$;

-- Reconcile reserved vs actual output tokens after a call completes.
create or replace function public.ai_settle (
  p_project_id uuid,
  p_est_output int,
  p_actual_output int
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
begin
  if not public.owns_project (p_project_id) then
    return;
  end if;
  update ai_usage
  set output_tokens = greatest(0, output_tokens - coalesce(p_est_output, 0) + coalesce(p_actual_output, 0))
  where project_id = p_project_id and day = v_today;
end;
$$;

-- ---------- gateway_call_context: + privacy_mode ----------
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
  v_project record;
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

  select exists (
    select 1 from taint_events te
    where te.project_id = v_agent.project_id
      and te.agent = v_agent.name
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

revoke execute on function public.ai_consume (uuid, int, bigint, int) from public;
revoke execute on function public.ai_settle (uuid, int, int) from public;
grant execute on function public.ai_consume (uuid, int, bigint, int) to authenticated, service_role;
grant execute on function public.ai_settle (uuid, int, int) to authenticated, service_role;
