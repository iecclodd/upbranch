-- Polyshield schema — run once in the Supabase SQL editor.
-- Every row is scoped to a project owned by a user; RLS enforces isolation.

create extension if not exists pgcrypto;

-- Mirror of auth.users we can join and attach a plan to.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid (),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index projects_owner_idx on public.projects (owner_id);

create table public.agents (
  id uuid primary key default gen_random_uuid (),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  status text not null default 'inactive',
  -- Only the hash is stored; the raw key is shown once at creation.
  key_hash text,
  key_preview text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);
create index agents_project_idx on public.agents (project_id);

create table public.mcp_servers (
  id uuid primary key default gen_random_uuid (),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  prefix text not null,
  kind text not null default 'remote',
  status text not null default 'connecting',
  -- { type:'stdio'|'http', ... } with secrets stored masked for now.
  transport jsonb not null,
  description text not null default '',
  last_action_at timestamptz,
  created_at timestamptz not null default now()
);
create index mcp_servers_project_idx on public.mcp_servers (project_id);

create table public.catalog_tools (
  id uuid primary key default gen_random_uuid (),
  project_id uuid not null references public.projects (id) on delete cascade,
  server_id uuid not null references public.mcp_servers (id) on delete cascade,
  raw_name text not null,
  raw_description text not null default '',
  input_schema jsonb not null default '{}'::jsonb,
  exposed_name text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create index catalog_tools_project_idx on public.catalog_tools (project_id);
create index catalog_tools_server_idx on public.catalog_tools (server_id);

create table public.policies (
  id uuid primary key default gen_random_uuid (),
  project_id uuid not null references public.projects (id) on delete cascade,
  server_id uuid references public.mcp_servers (id) on delete cascade,
  exposed_tool text not null,
  decision text not null default 'allow',
  condition text,
  description text not null default '',
  created_at timestamptz not null default now()
);
create index policies_project_idx on public.policies (project_id);

create table public.audit_log (
  id uuid primary key default gen_random_uuid (),
  project_id uuid not null references public.projects (id) on delete cascade,
  server_id uuid references public.mcp_servers (id) on delete set null,
  agent text not null,
  exposed_tool text not null,
  decision text not null,
  status text not null,
  approver text,
  decided_via text,
  reason text,
  created_at timestamptz not null default now()
);
create index audit_log_project_idx on public.audit_log (project_id, created_at desc);

create table public.approvals (
  id uuid primary key default gen_random_uuid (),
  project_id uuid not null references public.projects (id) on delete cascade,
  server_id uuid references public.mcp_servers (id) on delete set null,
  audit_id uuid references public.audit_log (id) on delete set null,
  agent text not null,
  exposed_tool text not null,
  args jsonb not null default '{}'::jsonb,
  reason text not null default '',
  status text not null default 'pending',
  approver text,
  decided_via text,
  requested_at timestamptz not null default now(),
  decided_at timestamptz
);
create index approvals_project_idx on public.approvals (project_id);

-- Row-level security: a user can touch a row only if they own its project
-- (profiles/projects keyed directly on auth.uid()).
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.agents enable row level security;
alter table public.mcp_servers enable row level security;
alter table public.catalog_tools enable row level security;
alter table public.policies enable row level security;
alter table public.audit_log enable row level security;
alter table public.approvals enable row level security;

create policy "own profile" on public.profiles
  for all using (id = auth.uid ()) with check (id = auth.uid ());

create policy "own projects" on public.projects
  for all using (owner_id = auth.uid ()) with check (owner_id = auth.uid ());

-- Helper: is the current user the owner of this project?
create or replace function public.owns_project (pid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.projects p
    where p.id = pid and p.owner_id = auth.uid ()
  );
$$;

create policy "own agents" on public.agents
  for all using (public.owns_project (project_id))
  with check (public.owns_project (project_id));
create policy "own servers" on public.mcp_servers
  for all using (public.owns_project (project_id))
  with check (public.owns_project (project_id));
create policy "own tools" on public.catalog_tools
  for all using (public.owns_project (project_id))
  with check (public.owns_project (project_id));
create policy "own policies" on public.policies
  for all using (public.owns_project (project_id))
  with check (public.owns_project (project_id));
create policy "own audit" on public.audit_log
  for all using (public.owns_project (project_id))
  with check (public.owns_project (project_id));
create policy "own approvals" on public.approvals
  for all using (public.owns_project (project_id))
  with check (public.owns_project (project_id));

-- Auto-create a profile row when someone signs up.
create or replace function public.handle_new_user ()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user ();

-- Backfill profiles for accounts created before this migration ran.
insert into public.profiles (id, email, full_name, avatar_url)
select
  id,
  email,
  raw_user_meta_data ->> 'full_name',
  raw_user_meta_data ->> 'avatar_url'
from auth.users
on conflict (id) do nothing;
