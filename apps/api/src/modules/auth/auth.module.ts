import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "@/common/prisma/prisma.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { PasswordService } from "./services/password.service";
import { OtpService } from "./services/otp.service";
import { SessionService } from "./services/session.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { EMAIL_PROVIDER, ConsoleEmailProvider } from "./providers/email-provider";
import { SMS_PROVIDER, ConsoleSmsProvider } from "./providers/sms-provider";

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.AUTH_JWT_SECRET ?? "dev-only-insecure-secret-change-me",
      signOptions: { expiresIn: process.env.AUTH_SESSION_TTL ?? "15m" },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    OtpService,
    SessionService,
    JwtAuthGuard,
    // Adapter pattern (docs/ARCHITECTURE.md §"Authentication Architecture"):
    // swap these for real SES/Twilio/etc. implementations behind the same
    // interface once a vendor is chosen — no call sites change.
    { provide: EMAIL_PROVIDER, useClass: ConsoleEmailProvider },
    { provide: SMS_PROVIDER, useClass: ConsoleSmsProvider },
  ],
  exports: [JwtAuthGuard, SessionService],
})
export class AuthModule {}
