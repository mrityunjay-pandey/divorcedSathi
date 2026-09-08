import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ReportService } from "./report.service";
import { BlockService } from "./block.service";
import { CreateReportDto, BlockUserDto } from "./dto/safety.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AdminGuard } from "../auth/guards/admin.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/session.service";

@UseGuards(JwtAuthGuard)
@Controller("reports")
export class ReportsController {
  constructor(private readonly reports: ReportService) {}

  @Post()
  async create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateReportDto) {
    const report = await this.reports.create(user.sub, dto);
    return { success: true, data: { report } };
  }
}

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller("admin/reports")
export class AdminReportsController {
  constructor(private readonly reports: ReportService) {}

  @Get("pending")
  async pending() {
    const reports = await this.reports.listForAdmin();
    return { success: true, data: { reports } };
  }

  @Post(":id/dismiss")
  async dismiss(@CurrentUser() admin: AccessTokenPayload, @Param("id") id: string) {
    const report = await this.reports.updateStatus(id, admin.sub, "DISMISSED");
    return { success: true, data: { report } };
  }

  @Post(":id/action-taken")
  async actionTaken(@CurrentUser() admin: AccessTokenPayload, @Param("id") id: string) {
    const report = await this.reports.updateStatus(id, admin.sub, "ACTION_TAKEN");
    return { success: true, data: { report } };
  }
}

@UseGuards(JwtAuthGuard)
@Controller("blocks")
export class BlocksController {
  constructor(private readonly blocks: BlockService) {}

  @Get()
  async list(@CurrentUser() user: AccessTokenPayload) {
    const blocks = await this.blocks.listBlockedByUser(user.sub);
    return { success: true, data: { blocks } };
  }

  @Post()
  async block(@CurrentUser() user: AccessTokenPayload, @Body() dto: BlockUserDto) {
    const block = await this.blocks.block(user.sub, dto.targetUserId);
    return { success: true, data: { block } };
  }

  @Delete(":targetUserId")
  async unblock(@CurrentUser() user: AccessTokenPayload, @Param("targetUserId") targetUserId: string) {
    await this.blocks.unblock(user.sub, targetUserId);
    return { success: true, data: null };
  }
}
