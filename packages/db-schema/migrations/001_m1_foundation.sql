-- M1 schema v0
-- Login/register stay in auth.users (Supabase Auth). This file is app data only.
-- One tenant per user for M1. Nest creates the tenant + public.users row after signup.
-- Extra vs PDF example: projects, persons, organizations, pgvector, RLS on all tenant tables.

-- Required for later RAG / embeddings. No embedding tables in M1.
create extension if not exists vector;

-- Company / workspace. Isolation key for every other table.
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- App profile. Same id as auth.users. tenant_id is null until onboarding creates a tenant.
-- role here is app RBAC, not the JWT "role" claim (that is usually "authenticated").
create table public.users (
  id uuid primary key references auth.users (id),
  tenant_id uuid references public.tenants (id),
  role text not null check (role in (
    'owner',
    'project_manager',
    'operations',
    'finance',
    'field',
    'admin',
    'ai_reviewer'
  )),
  -- Flag only. MFA is enforced later via Supabase Auth / Google.
  mfa_enabled boolean default false
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  name text not null,
  created_at timestamptz default now()
);

-- External companies (vendor, client, etc.). Kind can wait.
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  name text not null,
  created_at timestamptz default now()
);

-- People on a job (not the same as public.users / login accounts).
create table public.persons (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  name text not null,
  created_at timestamptz default now()
);

-- Connected integrations (QuickBooks, WhatsApp, Drive, ...). Tokens live in a vault, not here.
create table public.integration_registry (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants (id),
  provider text not null,
  scopes text[] not null,
  status text default 'disconnected',
  owner_user_id uuid references public.users (id),
  refresh_token_ref text,
  created_at timestamptz default now()
);

-- Append-only. Login events and later mutations write here from Nest, not from RLS.
create table public.audit_log (
  id bigint generated always as identity primary key,
  tenant_id uuid not null,
  actor_id uuid,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz default now()
);

-- audit_log is append-only
revoke update, delete on public.audit_log from anon, authenticated;

alter table public.tenants enable row level security;
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.organizations enable row level security;
alter table public.persons enable row level security;
alter table public.integration_registry enable row level security;
alter table public.audit_log enable row level security;

-- Nest sets app.tenant_id per request after JWT verify.
-- service_role bypasses RLS; these policies matter for authenticated / anon clients.
create policy tenant_isolation on public.tenants
using (id = current_setting('app.tenant_id')::uuid);

create policy tenant_isolation on public.users
using (tenant_id = current_setting('app.tenant_id')::uuid);

create policy tenant_isolation on public.projects
using (tenant_id = current_setting('app.tenant_id')::uuid);

create policy tenant_isolation on public.organizations
using (tenant_id = current_setting('app.tenant_id')::uuid);

create policy tenant_isolation on public.persons
using (tenant_id = current_setting('app.tenant_id')::uuid);

create policy tenant_isolation on public.integration_registry
using (tenant_id = current_setting('app.tenant_id')::uuid);

create policy tenant_isolation on public.audit_log
using (tenant_id = current_setting('app.tenant_id')::uuid);
