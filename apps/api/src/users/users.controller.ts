import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { CurrentUser as CurrentUserType } from "../auth/current-user";
import { UsersService } from "./users.service";
import { UserDTO } from "./userDTO";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getUsers(@CurrentUser() user: CurrentUserType) {
    return this.usersService.getUsers(user);
  }

  @Post()
  createUser(
    @CurrentUser() user: CurrentUserType,
    @Body() userDTO: UserDTO,
  ) {
    return this.usersService.createUser(user, userDTO);
  }
}
