import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "@/common/prisma/prisma.module";
import { DiscoveryController } from "./discovery.controller";
import { DiscoveryService } from "./discovery.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { FamilyModule } from "../family/family.module";
import { SafetyModule } from "../safety/safety.module";

@Module({
  imports: [
    PrismaModule,
    FamilyModule,
    SafetyModule,
    JwtModule.register({
      secret: process.env.AUTH_JWT_SECRET ?? "dev-only-insecure-secret-change-me",
      signOptions: { expiresIn: process.env.AUTH_SESSION_TTL ?? "15m" },
    }),
  ],
  controllers: [DiscoveryController],
  providers: [DiscoveryService, JwtAuthGuard],
})
export class DiscoveryModule {}
