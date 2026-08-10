import { Injectable, NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import type { CurrentUser } from "./current-user";

@Injectable()
export class MeService {
  constructor(private readonly supabase: SupabaseService) {}

  async getMe(user: CurrentUser) {
    const { data, error } = await this.supabase.client
      .from("users")
      .select("id, tenant_id, role, mfa_enabled")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      throw new NotFoundException("App user not found");
    }

    if (data.tenant_id) {
      const { error: auditError } = await this.supabase.client
        .from("audit_log")
        .insert({
          tenant_id: data.tenant_id,
          actor_id: user.id,
          action: "login",
          target_type: "user",
          target_id: user.id,
          metadata: { email: user.email },
        });

      if (auditError) {
        throw auditError;
      }
    }

    return {
      id: data.id,
      email: user.email,
      tenant_id: data.tenant_id,
      role: data.role,
      mfa_enabled: data.mfa_enabled,
    };
  }
}
