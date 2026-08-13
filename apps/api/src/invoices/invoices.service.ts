import { Injectable, NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import type { CurrentUser } from "../auth/current-user";

@Injectable()
export class InvoicesService {
  constructor(private readonly supabase: SupabaseService) {}

  async getInvoices(user: CurrentUser) {
    const db = this.supabase.forUser(user.accessToken);
    const { data: appUser, error } = await db
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!appUser?.tenant_id) {
      throw new NotFoundException("No tenant linked to this user");
    }

    return [
      {
        id: "stub-invoice-1",
        tenant_id: appUser.tenant_id,
        amount: 12500,
        status: "open",
        note: "Stub until QuickBooks (M3)",
      },
    ];
  }
}
