import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import type { CurrentUser } from "../auth/current-user";
import type { TaskDTO } from "./taskDTO";

@Injectable()
export class TaskService {
  constructor(private readonly supabase: SupabaseService) {}


  async getTasks(user: CurrentUser) {
    const db = this.supabase.forUser(user.accessToken);

    const { data: appUser, error: appUserError } = await db
      .from("users")
      .select("id, tenant_id, role")
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

    const columns =
      "id, tenant_id, title, description, status, assignee_id, assigned_by, due_at, created_by, created_at, updated_at";

    let query = db
      .from("tasks")
      .select(columns)
      .eq("tenant_id", appUser.tenant_id);

    if (appUser.role === "assistant") {
      query = query.eq("assignee_id", appUser.id);
    } else if (appUser.role !== "owner") {
      throw new ForbiddenException("Unrecognized role");
    }

    const { data: tasks, error: tasksError } = await query;

    if (tasksError) {
      throw tasksError;
    }

    return tasks ?? [];
  }

  async createTask(user: CurrentUser, dto: TaskDTO) {
    const title = dto.title?.trim() ?? "";
    if (!title) {
      throw new BadRequestException("title is required");
    }

    const assigneeId = dto.assignee_id?.trim() ?? "";
    if (!assigneeId) {
      throw new BadRequestException("assignee_id is required");
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
      throw new ForbiddenException("Only an owner can assign tasks");
    }

    const { data: assignee, error: assigneeError } = await db
      .from("users")
      .select("id, tenant_id, role")
      .eq("id", assigneeId)
      .maybeSingle();

    if (assigneeError) {
      throw assigneeError;
    }
    if (!assignee || assignee.tenant_id !== owner.tenant_id) {
      throw new NotFoundException("Assignee not found in this tenant");
    }
    if (assignee.role !== "assistant") {
      throw new BadRequestException("Assignee must be an assistant");
    }

    const { data: task, error: taskError } = await db
      .from("tasks")
      .insert({
        tenant_id: owner.tenant_id,
        title,
        description: dto.description?.trim() || null,
        due_at: dto.due_at?.trim() || null,
        assignee_id: assignee.id,
        assigned_by: owner.id,
        status: "open",
        created_by: "human",
      })
      .select(
        "id, tenant_id, title, description, status, assignee_id, assigned_by, due_at, created_by, created_at, updated_at",
      )
      .single();

    if (taskError) {
      throw taskError;
    }
    if (!task) {
      throw new BadRequestException("Task not created");
    }

    const { error: auditError } = await db.from("audit_log").insert({
      tenant_id: owner.tenant_id,
      actor_id: user.id,
      action: "task.created",
      target_type: "task",
      target_id: task.id,
      metadata: { title: task.title, assignee_id: assignee.id },
    });

    if (auditError) {
      throw auditError;
    }

    return task;
  }
}
