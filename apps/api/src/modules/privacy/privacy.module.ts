import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "@/common/prisma/prisma.module";
import { PrivacyController } from "./privacy.controller";
import { PrivacyService } from "./privacy.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.AUTH_JWT_SECRET ?? "dev-only-insecure-secret-change-me",
      signOptions: { expiresIn: process.env.AUTH_SESSION_TTL ?? "15m" },
    }),
  ],
  controllers: [PrivacyController],
  providers: [PrivacyService, JwtAuthGuard],
})
export class PrivacyModule {}
