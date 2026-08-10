import { Controller, Get, UseGuards } from "@nestjs/common";
import { CurrentUser } from "./current-user.decorator";
import type { CurrentUser as CurrentUserType } from "./current-user";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { MeService } from "./me.service";

@Controller("me")
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  me(@CurrentUser() user: CurrentUserType) {
    return this.meService.getMe(user);
  }
}
