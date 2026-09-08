import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ProfilesService } from "./profiles.service";
import { CreateProfileDto, UpdateProfileDto } from "./dto/profile.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/session.service";

@Controller("profiles")
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @UseGuards(JwtAuthGuard)
  @Post("me")
  async create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateProfileDto) {
    const profile = await this.profiles.createForUser(user.sub, dto);
    return { success: true, data: { profile } };
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async getMine(@CurrentUser() user: AccessTokenPayload) {
    const profile = await this.profiles.getForUser(user.sub);
    return { success: true, data: { profile } };
  }

  @UseGuards(JwtAuthGuard)
  @Patch("me")
  async updateMine(@CurrentUser() user: AccessTokenPayload, @Body() dto: UpdateProfileDto) {
    const profile = await this.profiles.updateForUser(user.sub, dto);
    return { success: true, data: { profile } };
  }

  // Public-ish lookup by profile id — no auth guard, but also no PII beyond
  // what's already stored unfiltered (see ProfilesService.getById doc comment).
  // Real per-field privacy enforcement lands with the Privacy Controls module.
  @Get(":id")
  async getById(@Param("id") id: string) {
    const profile = await this.profiles.getById(id);
    return { success: true, data: { profile } };
  }
}
