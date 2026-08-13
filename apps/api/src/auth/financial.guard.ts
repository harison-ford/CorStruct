import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import type { CurrentUser } from "./current-user";

@Injectable()
export class FinancialGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user?.id || !user.accessToken) {
      throw new UnauthorizedException("Missing authenticated user");
    }

    const db = this.supabase.forUser(user.accessToken);
    const { data: appUser, error } = await db
      .from("users")
      .select("role, financial_data_visible")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!appUser) {
      throw new ForbiddenException("Permission denied");
    }
    if (appUser.role === "owner") {
      return true;
    }
    if (appUser.role === "assistant" && appUser.financial_data_visible === true) {
      return true;
    }

    throw new ForbiddenException("Permission denied");
  }
}
