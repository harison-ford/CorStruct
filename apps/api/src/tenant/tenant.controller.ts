import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { CurrentUser as CurrentUserType } from "../auth/current-user";
import { TenantService } from "./tenant.service";

@Controller("tenants")
@UseGuards(JwtAuthGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get("me")
  getMyTenant(@CurrentUser() user: CurrentUserType) {
    return this.tenantService.getMyTenant(user);
  }

  @Post()
  createTenant(
    @CurrentUser() user: CurrentUserType,
    @Body() body: { name?: string },
  ) {
    return this.tenantService.createTenant(user, body?.name ?? "");
  }
}
