import { Controller, Get, UseGuards } from "@nestjs/common";
import { DiscoveryService } from "./discovery.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/session.service";

@UseGuards(JwtAuthGuard)
@Controller("discover")
export class DiscoveryController {
  constructor(private readonly discovery: DiscoveryService) {}

  @Get()
  async getDashboard(@CurrentUser() user: AccessTokenPayload) {
    const dashboard = await this.discovery.getDashboard(user.sub);
    return { success: true, data: dashboard };
  }
}
