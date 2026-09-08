import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "@/common/prisma/prisma.module";
import { InterestsController } from "./interests.controller";
import { InterestsService } from "./interests.service";
import { ShortlistController, ShortlistService } from "./shortlist.controller";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.AUTH_JWT_SECRET ?? "dev-only-insecure-secret-change-me",
      signOptions: { expiresIn: process.env.AUTH_SESSION_TTL ?? "15m" },
    }),
  ],
  controllers: [InterestsController, ShortlistController],
  providers: [InterestsService, ShortlistService, JwtAuthGuard],
})
export class InterestsModule {}
