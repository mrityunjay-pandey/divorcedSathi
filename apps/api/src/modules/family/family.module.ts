import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "@/common/prisma/prisma.module";
import { PreviousMarriageController, FamilyDetailsController } from "./family.controller";
import { PreviousMarriageService } from "./previous-marriage.service";
import { FamilyDetailsService } from "./family-details.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.AUTH_JWT_SECRET ?? "dev-only-insecure-secret-change-me",
      signOptions: { expiresIn: process.env.AUTH_SESSION_TTL ?? "15m" },
    }),
  ],
  controllers: [PreviousMarriageController, FamilyDetailsController],
  providers: [PreviousMarriageService, FamilyDetailsService, JwtAuthGuard],
  exports: [PreviousMarriageService, FamilyDetailsService],
})
export class FamilyModule {}
