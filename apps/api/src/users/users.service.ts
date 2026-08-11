import { Injectable, NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import type { CurrentUser } from "../auth/current-user";

@Injectable()
export class UsersService {
  constructor(private readonly supabase: SupabaseService) {}

  async getUsers(user: CurrentUser) {
    const db = this.supabase.forUser(user.accessToken);

    const { data: appUser, error: appUserError } = await db
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .maybeSingle();

    if (appUserError) {
      throw appUserError;
    }
    if (!appUser) {
      throw new NotFoundException("User not found");
    }
    if (!appUser.tenant_id) {
      throw new NotFoundException("No tenant linked to this user");
    }

    const { data: users, error: usersError } = await db
      .from("users")
      .select("id, tenant_id, role, mfa_enabled")
      .eq("tenant_id", appUser.tenant_id);

    if (usersError) {
      throw usersError;
    }

    return users ?? [];
  }
}
