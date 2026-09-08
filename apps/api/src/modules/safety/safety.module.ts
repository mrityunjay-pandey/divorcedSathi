import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "@/common/prisma/prisma.module";
import { ReportsController, AdminReportsController, BlocksController } from "./safety.controller";
import { ReportService } from "./report.service";
import { BlockService } from "./block.service";
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
  controllers: [ReportsController, AdminReportsController, BlocksController],
  providers: [ReportService, BlockService, JwtAuthGuard, AdminGuard],
  exports: [BlockService],
})
export class SafetyModule {}
