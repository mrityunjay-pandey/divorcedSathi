import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { PartnerPreferencesService } from "./partner-preferences.service";
import { UpsertPartnerPreferenceDto } from "./dto/partner-preference.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/session.service";

@UseGuards(JwtAuthGuard)
@Controller("profiles/me/partner-preferences")
export class PartnerPreferencesController {
  constructor(private readonly preferences: PartnerPreferencesService) {}

  @Get()
  async get(@CurrentUser() user: AccessTokenPayload) {
    const preferences = await this.preferences.getForUser(user.sub);
    return { success: true, data: { preferences } };
  }

  @Put()
  async upsert(@CurrentUser() user: AccessTokenPayload, @Body() dto: UpsertPartnerPreferenceDto) {
    const preferences = await this.preferences.upsertForUser(user.sub, dto);
    return { success: true, data: { preferences } };
  }
}
