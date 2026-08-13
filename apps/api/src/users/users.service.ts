import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import type { CurrentUser } from "../auth/current-user";
import type { UpdateFinanceDTO, UserDTO } from "./userDTO";

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
      .select("id, tenant_id, role, financial_data_visible, mfa_enabled")
      .eq("tenant_id", appUser.tenant_id);

    if (usersError) {
      throw usersError;
    }

    return users ?? [];
  }

  async createUser(user: CurrentUser, dto: UserDTO) {
    const email = dto.email?.trim() ?? "";
    const password = dto.password ?? "";
    if (!email) {
      throw new BadRequestException("email is required");
    }
    if (!password) {
      throw new BadRequestException("password is required");
    }

    const db = this.supabase.forUser(user.accessToken);

    const { data: owner, error: ownerError } = await db
      .from("users")
      .select("id, tenant_id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (ownerError) {
      throw ownerError;
    }
    if (!owner) {
      throw new NotFoundException("User not found");
    }
    if (!owner.tenant_id) {
      throw new NotFoundException("No tenant linked to this user");
    }
    if (owner.role !== "owner") {
      throw new ForbiddenException("Only an owner can create assistants");
    }

    const { data: created, error: authError } =
      await this.supabase.client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError || !created.user) {
      const message = authError?.message ?? "Auth user not created";
      if (/already/i.test(message) || /registered/i.test(message)) {
        throw new ConflictException("A user with this email already exists");
      }
      throw new BadRequestException(message);
    }

    const authUserId = created.user.id;

    const { data: assistant, error: insertError } = await db
      .from("users")
      .insert({
        id: authUserId,
        tenant_id: owner.tenant_id,
        role: "assistant",
        financial_data_visible: false,
        mfa_enabled: false,
      })
      .select("id, tenant_id, role, financial_data_visible, mfa_enabled")
      .single();

    if (insertError || !assistant) {
      await this.supabase.client.auth.admin.deleteUser(authUserId);
      throw insertError ?? new BadRequestException("Assistant not created");
    }

    const { error: auditError } = await db.from("audit_log").insert({
      tenant_id: owner.tenant_id,
      actor_id: user.id,
      action: "user.created",
      target_type: "user",
      target_id: assistant.id,
      metadata: { email, role: "assistant" },
    });

    if (auditError) {
      throw auditError;
    }

    return { ...assistant, email };
  }

  async updateFinancialVisibility(
    user: CurrentUser,
    targetId: string,
    dto: UpdateFinanceDTO,
  ) {
    if (typeof dto.financial_data_visible !== "boolean") {
      throw new BadRequestException("financial_data_visible must be a boolean");
    }

    const id = targetId?.trim() ?? "";
    if (!id) {
      throw new BadRequestException("id is required");
    }

    const db = this.supabase.forUser(user.accessToken);

    const { data: owner, error: ownerError } = await db
      .from("users")
      .select("id, tenant_id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (ownerError) {
      throw ownerError;
    }
    if (!owner) {
      throw new NotFoundException("User not found");
    }
    if (!owner.tenant_id) {
      throw new NotFoundException("No tenant linked to this user");
    }
    if (owner.role !== "owner") {
      throw new ForbiddenException(
        "Only an owner can change financial visibility",
      );
    }

    const { data: target, error: targetError } = await db
      .from("users")
      .select("id, tenant_id, role, financial_data_visible")
      .eq("id", id)
      .maybeSingle();

    if (targetError) {
      throw targetError;
    }
    if (!target || target.tenant_id !== owner.tenant_id) {
      throw new NotFoundException("User not found in this tenant");
    }
    if (target.role !== "assistant") {
      throw new BadRequestException(
        "Financial visibility can only be changed for assistants",
      );
    }

    const { data: updated, error: updateError } = await db
      .from("users")
      .update({ financial_data_visible: dto.financial_data_visible })
      .eq("id", target.id)
      .select("id, tenant_id, role, financial_data_visible, mfa_enabled")
      .single();

    if (updateError) {
      throw updateError;
    }
    if (!updated) {
      throw new BadRequestException("Financial visibility not updated");
    }

    const { error: auditError } = await db.from("audit_log").insert({
      tenant_id: owner.tenant_id,
      actor_id: user.id,
      action: "user.financial_visibility.updated",
      target_type: "user",
      target_id: updated.id,
      metadata: { financial_data_visible: updated.financial_data_visible },
    });

    if (auditError) {
      throw auditError;
    }

    return updated;
  }
}
