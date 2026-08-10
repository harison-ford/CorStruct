import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import type { CurrentUser } from "../auth/current-user";

@Injectable()
export class ProjectsService {
  constructor(private readonly supabase: SupabaseService) {}

  private async requireTenantId(user: CurrentUser): Promise<string> {
    const { data: appUser, error: appUserError } = await this.supabase.client
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

    return appUser.tenant_id;
  }

  async getProjects(user: CurrentUser) {
    const tenantId = await this.requireTenantId(user);

    const { data: projects, error: projectsError } = await this.supabase.client
      .from("projects")
      .select("id, tenant_id, name, created_at")
      .eq("tenant_id", tenantId);

    if (projectsError) {
      throw projectsError;
    }

    return projects ?? [];
  }

  async createProject(user: CurrentUser, projectName: string) {
    const name = projectName.trim();
    if (!name) {
      throw new BadRequestException("name is required");
    }

    const tenantId = await this.requireTenantId(user);

    const { data: project, error: projectError } = await this.supabase.client
      .from("projects")
      .insert({ name, tenant_id: tenantId })
      .select("id, tenant_id, name, created_at")
      .single();

    if (projectError) {
      throw projectError;
    }
    if (!project) {
      throw new BadRequestException("Project not created");
    }

    const { error: auditError } = await this.supabase.client
      .from("audit_log")
      .insert({
        tenant_id: tenantId,
        actor_id: user.id,
        action: "project.created",
        target_type: "project",
        target_id: project.id,
        metadata: { name: project.name },
      });

    if (auditError) {
      throw auditError;
    }

    return project;
  }
}
