import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { VerificationService } from "./verification.service";
import { RejectVerificationDto, SubmitIdVerificationDto } from "./dto/verification.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AdminGuard } from "../auth/guards/admin.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/session.service";

@UseGuards(JwtAuthGuard)
@Controller("verification")
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Post("identity")
  async submit(@CurrentUser() user: AccessTokenPayload, @Body() dto: SubmitIdVerificationDto) {
    const verification = await this.verification.submitIdVerification(user.sub, dto.documentStorageKey);
    return { success: true, data: { verification } };
  }

  @Get("me")
  async me(@CurrentUser() user: AccessTokenPayload) {
    const badges = await this.verification.getBadgesForUser(user.sub);
    return { success: true, data: badges };
  }
}

/** Admin-only review queue. No dashboard UI yet — API surface only until Module 15. */
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller("admin/verification")
export class AdminVerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Get("pending")
  async pending() {
    const verifications = await this.verification.listPendingForAdmin();
    return { success: true, data: { verifications } };
  }

  @Post(":id/approve")
  async approve(@CurrentUser() admin: AccessTokenPayload, @Param("id") id: string) {
    const verification = await this.verification.approve(id, admin.sub);
    return { success: true, data: { verification } };
  }

  @Post(":id/reject")
  async reject(@CurrentUser() admin: AccessTokenPayload, @Param("id") id: string, @Body() dto: RejectVerificationDto) {
    const verification = await this.verification.reject(id, admin.sub, dto.reason);
    return { success: true, data: { verification } };
  }
}
