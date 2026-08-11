-- M1 — Option A: make RLS actually enforce, not just exist on paper.
--
-- Problems this fixes vs 001:
-- 1. Old policies used current_setting('app.tenant_id')::uuid, but nothing ever
--    called set_config() — Nest only used the service_role key, which bypasses
--    RLS entirely, so the policies never ran.
-- 2. current_setting() without the missing_ok flag throws if the GUC was never
--    set, so even a non-bypass role would have errored on every query.
--
-- Fix: derive tenant from the caller's own JWT (auth.uid()) via a
-- security-definer helper, the standard Supabase multi-tenant RLS pattern.
-- Nest now queries tenant-scoped tables using a client authenticated as the
-- caller (role "authenticated"), so these policies are the real enforcement,
-- not just a backup. service_role is kept only for the tenant bootstrap step
-- (creating a tenant + linking the first user), which has no tenant yet.

drop policy if exists tenant_isolation on public.tenants;
drop policy if exists tenant_isolation on public.users;
drop policy if exists tenant_isolation on public.projects;
drop policy if exists tenant_isolation on public.organizations;
drop policy if exists tenant_isolation on public.persons;
drop policy if exists tenant_isolation on public.integration_registry;
drop policy if exists tenant_isolation on public.audit_log;

-- security definer + owned by the migration role (table owner) => bypasses RLS
-- internally, so looking up public.users here does not recurse into the
-- users_select policy below.
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.users where id = auth.uid()
$$;

grant execute on function public.current_tenant_id() to authenticated;

-- tenants: caller may only see their own company. No insert policy for
-- authenticated — tenant creation stays a service_role bootstrap operation.
create policy tenants_select on public.tenants
for select
using (id = public.current_tenant_id());

-- users: read own row (even before a tenant is linked) or any row in own tenant.
create policy users_select on public.users
for select
using (id = auth.uid() or tenant_id = public.current_tenant_id());

-- projects
create policy projects_select on public.projects
for select
using (tenant_id = public.current_tenant_id());

create policy projects_insert on public.projects
for insert
with check (tenant_id = public.current_tenant_id());

-- organizations
create policy organizations_select on public.organizations
for select
using (tenant_id = public.current_tenant_id());

create policy organizations_insert on public.organizations
for insert
with check (tenant_id = public.current_tenant_id());

-- persons
create policy persons_select on public.persons
for select
using (tenant_id = public.current_tenant_id());

create policy persons_insert on public.persons
for insert
with check (tenant_id = public.current_tenant_id());

-- integration_registry
create policy integration_registry_select on public.integration_registry
for select
using (tenant_id = public.current_tenant_id());

create policy integration_registry_insert on public.integration_registry
for insert
with check (tenant_id = public.current_tenant_id());

-- audit_log: append-only (update/delete already revoked in 001).
create policy audit_log_select on public.audit_log
for select
using (tenant_id = public.current_tenant_id());

create policy audit_log_insert on public.audit_log
for insert
with check (tenant_id = public.current_tenant_id());
