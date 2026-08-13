import { Module } from "@nestjs/common";
import { FinancialGuard } from "./financial.guard";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { JwtService } from "./jwt.service";
import { MeController } from "./me.controller";
import { MeService } from "./me.service";

@Module({
  controllers: [MeController],
  providers: [JwtService, JwtAuthGuard, FinancialGuard, MeService],
  exports: [JwtService, JwtAuthGuard, FinancialGuard],
})
export class AuthModule {}
