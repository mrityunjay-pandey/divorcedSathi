import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ProfileDetailService } from "./profile-detail.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/session.service";

/**
 * Deliberately a separate route from ProfilesController's GET /profiles/:id
 * (Module 3), which still returns the raw, unfiltered row and is now
 * effectively superseded by this one for any cross-user read. Left in
 * place rather than removed to avoid an unannounced breaking change;
 * frontend code should call this endpoint, not the old one, for viewing
 * anyone other than yourself.
 */
@UseGuards(JwtAuthGuard)
@Controller("profile-view")
export class ProfileDetailController {
  constructor(private readonly profileDetail: ProfileDetailService) {}

  @Get(":profileId")
  async get(@CurrentUser() user: AccessTokenPayload, @Param("profileId") profileId: string) {
    const profile = await this.profileDetail.getPublicProfile(user.sub, profileId);
    return { success: true, data: { profile } };
  }
}
