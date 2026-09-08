import { Body, Controller, Delete, Get, HttpStatus, Injectable, Param, Post, UseGuards } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.module";
import { AppException } from "@/common/errors/app-exception";
import { ErrorCode } from "@/common/errors/error-codes";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/session.service";
import { IsString } from "class-validator";
import type { Shortlist } from "@divorcedsathi/db";

export class ShortlistTargetDto {
  @IsString()
  targetUserId!: string;
}

@Injectable()
export class ShortlistService {
  constructor(private readonly prisma: PrismaService) {}

  async add(userId: string, targetUserId: string): Promise<Shortlist> {
    if (userId === targetUserId) {
      throw new AppException(ErrorCode.CANNOT_TARGET_SELF, "You can't shortlist yourself.", HttpStatus.BAD_REQUEST);
    }
    const existing = await this.prisma.client.shortlist.findUnique({
      where: { userId_targetUserId: { userId, targetUserId } },
    });
    if (existing) {
      throw new AppException(ErrorCode.ALREADY_SHORTLISTED, "This profile is already on your shortlist.", HttpStatus.CONFLICT);
    }
    return this.prisma.client.shortlist.create({ data: { userId, targetUserId } });
  }

  async remove(userId: string, targetUserId: string): Promise<void> {
    // Idempotent by design — removing something already removed is a no-op,
    // not an error, so the frontend never has to special-case double-clicks.
    await this.prisma.client.shortlist.deleteMany({ where: { userId, targetUserId } });
  }

  async list(userId: string): Promise<Shortlist[]> {
    return this.prisma.client.shortlist.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  }
}

@UseGuards(JwtAuthGuard)
@Controller("shortlist")
export class ShortlistController {
  constructor(private readonly shortlist: ShortlistService) {}

  @Get()
  async list(@CurrentUser() user: AccessTokenPayload) {
    const shortlist = await this.shortlist.list(user.sub);
    return { success: true, data: { shortlist } };
  }

  @Post()
  async add(@CurrentUser() user: AccessTokenPayload, @Body() dto: ShortlistTargetDto) {
    const entry = await this.shortlist.add(user.sub, dto.targetUserId);
    return { success: true, data: { entry } };
  }

  @Delete(":targetUserId")
  async remove(@CurrentUser() user: AccessTokenPayload, @Param("targetUserId") targetUserId: string) {
    await this.shortlist.remove(user.sub, targetUserId);
    return { success: true, data: null };
  }
}
