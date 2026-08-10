import { join } from "node:path";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { SupabaseModule } from "./supabase/supabase.module";
import { TenantModule } from "./tenant/tenant.module";
import { UsersModule } from "./users/users.module";
import { ProjectsModule } from "./projects/projects.module";
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(__dirname, "../../.env"),
        join(__dirname, "../../../.env"),
        ".env",
      ],
    }),
    SupabaseModule,
    HealthModule,
    AuthModule,
    TenantModule,
    UsersModule,
    ProjectsModule
  ],
})
export class AppModule {}
