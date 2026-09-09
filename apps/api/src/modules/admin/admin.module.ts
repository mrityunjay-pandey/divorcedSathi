import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "@/common/prisma/prisma.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AuditLogService } from "./audit-log.service";
import { AnalyticsService } from "./analytics.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AdminGuard } from "../auth/guards/admin.guard";

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.AUTH_JWT_SECRET ?? "dev-only-insecure-secret-change-me",
      signOptions: { expiresIn: process.env.AUTH_SESSION_TTL ?? "15m" },
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, AuditLogService, AnalyticsService, JwtAuthGuard, AdminGuard],
  exports: [AuditLogService],
})
export class AdminModule {}
