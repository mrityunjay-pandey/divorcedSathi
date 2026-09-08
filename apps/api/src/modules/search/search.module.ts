import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "@/common/prisma/prisma.module";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { FamilyModule } from "../family/family.module";

@Module({
  imports: [
    PrismaModule,
    FamilyModule, // for PreviousMarriageService.getPublicSummaryByProfileId
    JwtModule.register({
      secret: process.env.AUTH_JWT_SECRET ?? "dev-only-insecure-secret-change-me",
      signOptions: { expiresIn: process.env.AUTH_SESSION_TTL ?? "15m" },
    }),
  ],
  controllers: [SearchController],
  providers: [SearchService, JwtAuthGuard],
})
export class SearchModule {}
