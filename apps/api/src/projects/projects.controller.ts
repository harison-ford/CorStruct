import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { CurrentUser as CurrentUserType } from "../auth/current-user";
import { ProjectsService } from "./projects.service";

@Controller("projects")
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  getProjects(@CurrentUser() user: CurrentUserType) {
    return this.projectsService.getProjects(user);
  }

  @Post()
  createProject(
    @CurrentUser() user: CurrentUserType,
    @Body() body: { name?: string },
  ) {
    return this.projectsService.createProject(user, body.name ?? "");
  }
}
