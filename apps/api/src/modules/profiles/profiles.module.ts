import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "@/common/prisma/prisma.module";
import { ProfilesController } from "./profiles.controller";
import { ProfilesService } from "./profiles.service";
import { LifestyleController } from "./lifestyle.controller";
import { LifestyleService } from "./lifestyle.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Module({
  imports: [
    PrismaModule,
    // JwtAuthGuard needs a JwtService in this module's DI container too,
    // since Nest resolves providers per-module rather than globally.
    JwtModule.register({
      secret: process.env.AUTH_JWT_SECRET ?? "dev-only-insecure-secret-change-me",
      signOptions: { expiresIn: process.env.AUTH_SESSION_TTL ?? "15m" },
    }),
  ],
  controllers: [ProfilesController, LifestyleController],
  providers: [ProfilesService, LifestyleService, JwtAuthGuard],
})
export class ProfilesModule {}
