-- M1 + M2 identity: owner | assistant only, permission flags, tasks.
-- Idempotent — safe on DBs that already ran 001/002, and on fresh installs
-- after the updated 001 (IF NOT EXISTS / DROP IF EXISTS throughout).
--
-- Product roles (CorStruct intent, not doc "admin" naming):
--   • owner     — seeded in DB + Auth credentials handed off; full tenant authority
--   • assistant — created by owner; financial visibility grant/revoke by owner
--   • users.financial_data_visible (default false for assistants)
--   • tenants.risk_review_bypass (default false)
--   • tasks — owner → assistant assignment; created_by ready for M6

-- ---------------------------------------------------------------------------
-- tenants
-- ---------------------------------------------------------------------------
alter table public.tenants
  add column if not exists risk_review_bypass boolean not null default false;

-- ---------------------------------------------------------------------------
-- users: financial flag + role narrow
-- ---------------------------------------------------------------------------
alter table public.users
  add column if not exists financial_data_visible boolean not null default false;

-- Map any legacy / doc-named roles onto owner | assistant.
update public.users
set role = 'owner'
where role in ('owner', 'admin');

update public.users
set role = 'assistant'
where role in (
  'project_manager',
  'operations',
  'finance',
  'field',
  'ai_reviewer',
  'assistant'
);

update public.users
set role = 'assistant'
where role is distinct from 'owner'
  and role is distinct from 'assistant';

alter table public.users drop constraint if exists users_role_check;

alter table public.users
  add constraint users_role_check
  check (role in ('owner', 'assistant'));

-- Owners always see finances; assistants stay hidden until owner grants.
update public.users
set financial_data_visible = true
where role = 'owner';

update public.users
set financial_data_visible = false
where role = 'assistant'
  and financial_data_visible is distinct from false;

-- ---------------------------------------------------------------------------
-- tasks (owner assigns to assistant; AI origins reserved for M6)
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  title text not null,
  description text,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'done', 'cancelled')),
  assignee_id uuid not null references public.users (id),
  assigned_by uuid not null references public.users (id),
  due_at timestamptz,
  -- Cross-cutting standard: origin of the row (human | ai_*). M2 writes 'human'.
  created_by text not null default 'human'
    check (created_by in ('human', 'ai_auto', 'ai_suggested')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_tenant_id_idx on public.tasks (tenant_id);
create index if not exists tasks_assignee_id_idx on public.tasks (assignee_id);

alter table public.tasks enable row level security;

-- Drop v1-style GUC policy if a revised 001 created it.
drop policy if exists tenant_isolation on public.tasks;

-- ---------------------------------------------------------------------------
-- Helpers for RBAC inside RLS
-- ---------------------------------------------------------------------------
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid()
$$;

grant execute on function public.current_app_role() to authenticated;

-- ---------------------------------------------------------------------------
-- Extra RLS: tenant settings + user permission edits + tasks
-- (002 already covers select/insert on the original tables.)
-- ---------------------------------------------------------------------------

-- Owner can update own tenant (e.g. risk_review_bypass).
drop policy if exists tenants_update on public.tenants;
create policy tenants_update on public.tenants
for update
using (
  id = public.current_tenant_id()
  and public.current_app_role() = 'owner'
)
with check (
  id = public.current_tenant_id()
  and public.current_app_role() = 'owner'
);

-- Owner can insert assistant app profiles in their tenant (after Auth invite/create).
drop policy if exists users_insert on public.users;
create policy users_insert on public.users
for insert
with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'owner'
);

-- Owner can update users in tenant (financial_data_visible, mfa_enabled, etc.).
-- Assistants cannot promote themselves to owner via this policy (role changes
-- should stay owner-only in Nest as well).
drop policy if exists users_update on public.users;
create policy users_update on public.users
for update
using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'owner'
)
with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'owner'
);

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
for select
using (tenant_id = public.current_tenant_id());

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
for insert
with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'owner'
);

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
for update
using (
  tenant_id = public.current_tenant_id()
  and (
    public.current_app_role() = 'owner'
    or assignee_id = auth.uid()
  )
)
with check (tenant_id = public.current_tenant_id());

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks
for delete
using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'owner'
);
