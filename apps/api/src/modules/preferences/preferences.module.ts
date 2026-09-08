import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "@/common/prisma/prisma.module";
import { PartnerPreferencesController } from "./partner-preferences.controller";
import { PartnerPreferencesService } from "./partner-preferences.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.AUTH_JWT_SECRET ?? "dev-only-insecure-secret-change-me",
      signOptions: { expiresIn: process.env.AUTH_SESSION_TTL ?? "15m" },
    }),
  ],
  controllers: [PartnerPreferencesController],
  providers: [PartnerPreferencesService, JwtAuthGuard],
  exports: [PartnerPreferencesService],
})
export class PreferencesModule {}
