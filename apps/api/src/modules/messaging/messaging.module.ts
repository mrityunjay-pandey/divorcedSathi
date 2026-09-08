import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "@/common/prisma/prisma.module";
import { MessagingController } from "./messaging.controller";
import { MessagingService } from "./messaging.service";
import { MatchesController, MatchesService } from "./matches.controller";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.AUTH_JWT_SECRET ?? "dev-only-insecure-secret-change-me",
      signOptions: { expiresIn: process.env.AUTH_SESSION_TTL ?? "15m" },
    }),
  ],
  controllers: [MessagingController, MatchesController],
  providers: [MessagingService, MatchesService, JwtAuthGuard],
})
export class MessagingModule {}
