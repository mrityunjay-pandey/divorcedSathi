import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { LifestyleService } from "./lifestyle.service";
import { UpsertLifestyleDto } from "./dto/lifestyle.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/session.service";

@UseGuards(JwtAuthGuard)
@Controller("profiles/me/lifestyle")
export class LifestyleController {
  constructor(private readonly lifestyle: LifestyleService) {}

  @Get()
  async get(@CurrentUser() user: AccessTokenPayload) {
    const lifestyle = await this.lifestyle.getForUser(user.sub);
    return { success: true, data: { lifestyle } };
  }

  @Put()
  async upsert(@CurrentUser() user: AccessTokenPayload, @Body() dto: UpsertLifestyleDto) {
    const lifestyle = await this.lifestyle.upsertForUser(user.sub, dto);
    return { success: true, data: { lifestyle } };
  }
}
