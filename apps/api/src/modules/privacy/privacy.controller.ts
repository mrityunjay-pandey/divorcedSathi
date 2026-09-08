import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { PrivacyService } from "./privacy.service";
import { UpdatePrivacySettingDto } from "./dto/privacy-setting.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/session.service";

@UseGuards(JwtAuthGuard)
@Controller("privacy-settings")
export class PrivacyController {
  constructor(private readonly privacy: PrivacyService) {}

  @Get("me")
  async get(@CurrentUser() user: AccessTokenPayload) {
    const settings = await this.privacy.getForUser(user.sub);
    return { success: true, data: { settings } };
  }

  @Put("me")
  async update(@CurrentUser() user: AccessTokenPayload, @Body() dto: UpdatePrivacySettingDto) {
    const settings = await this.privacy.updateForUser(user.sub, dto);
    return { success: true, data: { settings } };
  }
}
