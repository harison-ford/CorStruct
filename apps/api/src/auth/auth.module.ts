import { Module } from "@nestjs/common";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { JwtService } from "./jwt.service";
import { MeController } from "./me.controller";
import { MeService } from "./me.service";

@Module({
  controllers: [MeController],
  providers: [JwtService, JwtAuthGuard, MeService],
  exports: [JwtService, JwtAuthGuard],
})
export class AuthModule {}
