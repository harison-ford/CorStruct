import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import type { CurrentUser } from "../auth/current-user";

@Injectable()
export class TenantService {
  constructor(private readonly supabase: SupabaseService) {}

  async getMyTenant(user: CurrentUser) {
    // RLS-scoped: relies on tenants_select policy (id = current_tenant_id()),
    // not just this .eq() filter.
    const db = this.supabase.forUser(user.accessToken);

    const { data: appUser, error: userError } = await db
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .maybeSingle();

    if (userError) {
      throw userError;
    }
    if (!appUser?.tenant_id) {
      throw new NotFoundException("No tenant linked to this user");
    }

    const { data: tenant, error: tenantError } = await db
      .from("tenants")
      .select("id, name, created_at")
      .eq("id", appUser.tenant_id)
      .maybeSingle();

    if (tenantError) {
      throw tenantError;
    }
    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }

    return tenant;
  }

  // Bootstrap only — deliberately uses service_role. The caller has no
  // tenant yet, so no authenticated-role policy grants tenant/user inserts
  // (see 002_rls_enforce_auth_uid.sql). This is the one privileged path.
  async createTenant(user: CurrentUser, tenantName: string) {
    const name = tenantName.trim();
    if (!name) {
      throw new BadRequestException("name is required");
    }

    const { data: appUser, error: appUserError } = await this.supabase.client
      .from("users")
      .select("id, tenant_id")
      .eq("id", user.id)
      .maybeSingle();

    if (appUserError) {
      throw appUserError;
    }
    if (appUser?.tenant_id) {
      throw new ConflictException("User already belongs to a tenant");
    }

    const { data: tenant, error: tenantError } = await this.supabase.client
      .from("tenants")
      .insert({ name })
      .select("id, name, created_at")
      .single();

    if (tenantError) {
      throw tenantError;
    }
    if (!tenant) {
      throw new BadRequestException("Tenant not created");
    }

    if (appUser) {
      const { error: linkError } = await this.supabase.client
        .from("users")
        .update({
          tenant_id: tenant.id,
          role: "owner",
          financial_data_visible: true,
        })
        .eq("id", user.id);

      if (linkError) {
        throw linkError;
      }
    } else {
      const { error: insertUserError } = await this.supabase.client
        .from("users")
        .insert({
          id: user.id,
          tenant_id: tenant.id,
          role: "owner",
          financial_data_visible: true,
          mfa_enabled: false,
        });

      if (insertUserError) {
        throw insertUserError;
      }
    }

    const { error: auditError } = await this.supabase.client
      .from("audit_log")
      .insert({
        tenant_id: tenant.id,
        actor_id: user.id,
        action: "tenant.created",
        target_type: "tenant",
        target_id: tenant.id,
        metadata: { name: tenant.name },
      });

    if (auditError) {
      throw auditError;
    }

    return tenant;
  }
}
