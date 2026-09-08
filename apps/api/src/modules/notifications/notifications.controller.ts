import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/session.service";

@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async list(@CurrentUser() user: AccessTokenPayload) {
    const notifications = await this.notifications.listForUser(user.sub);
    return { success: true, data: { notifications } };
  }

  @Post(":id/read")
  async markRead(@CurrentUser() user: AccessTokenPayload, @Param("id") id: string) {
    const result = await this.notifications.markRead(id, user.sub);
    return { success: true, data: result };
  }

  @Post("read-all")
  async markAllRead(@CurrentUser() user: AccessTokenPayload) {
    const result = await this.notifications.markAllRead(user.sub);
    return { success: true, data: result };
  }
}
