import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "@/common/prisma/prisma.module";
import { VerificationController, AdminVerificationController } from "./verification.controller";
import { VerificationService } from "./verification.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AdminGuard } from "../auth/guards/admin.guard";
import { NotificationsModule } from "../notifications/notifications.module";
import { AdminModule } from "../admin/admin.module";

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    AdminModule,
    JwtModule.register({
      secret: process.env.AUTH_JWT_SECRET ?? "dev-only-insecure-secret-change-me",
      signOptions: { expiresIn: process.env.AUTH_SESSION_TTL ?? "15m" },
    }),
  ],
  controllers: [VerificationController, AdminVerificationController],
  providers: [VerificationService, JwtAuthGuard, AdminGuard],
})
export class VerificationModule {}
