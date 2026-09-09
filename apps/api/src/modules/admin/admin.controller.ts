import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { SearchUsersQueryDto, SuspendUserDto } from "./dto/admin.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AdminGuard } from "../auth/guards/admin.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/session.service";

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("dashboard")
  async dashboard() {
    const stats = await this.admin.getDashboardStats();
    return { success: true, data: stats };
  }

  @Get("users")
  async searchUsers(@Query() query: SearchUsersQueryDto) {
    const users = await this.admin.searchUsers(query.q);
    return { success: true, data: { users } };
  }

  @Get("users/:id")
  async getUser(@Param("id") id: string) {
    const user = await this.admin.getUserDetail(id);
    return { success: true, data: { user } };
  }

  @Post("users/:id/suspend")
  async suspend(@CurrentUser() admin: AccessTokenPayload, @Param("id") id: string, @Body() dto: SuspendUserDto) {
    const user = await this.admin.suspendUser(admin.sub, id, dto.reason);
    return { success: true, data: { user } };
  }

  @Post("users/:id/ban")
  async ban(@CurrentUser() admin: AccessTokenPayload, @Param("id") id: string, @Body() dto: SuspendUserDto) {
    const user = await this.admin.banUser(admin.sub, id, dto.reason);
    return { success: true, data: { user } };
  }

  @Post("users/:id/reactivate")
  async reactivate(@CurrentUser() admin: AccessTokenPayload, @Param("id") id: string) {
    const user = await this.admin.reactivateUser(admin.sub, id);
    return { success: true, data: { user } };
  }
}
