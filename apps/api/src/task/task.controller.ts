import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { CurrentUser as CurrentUserType } from "../auth/current-user";
import { TaskService } from "./task.service";
import { TaskDTO } from "./taskDTO";

@Controller("tasks")
@UseGuards(JwtAuthGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}


  @Get()
  getTasks(@CurrentUser() user: CurrentUserType) {
    return this.taskService.getTasks(user);
  }
  @Post()
  createTask(
    @CurrentUser() user: CurrentUserType,
    @Body() taskDTO: TaskDTO,
  ) {
    return this.taskService.createTask(user, taskDTO);
  }
}
