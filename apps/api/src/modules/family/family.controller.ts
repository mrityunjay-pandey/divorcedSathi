import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { PreviousMarriageService } from "./previous-marriage.service";
import { FamilyDetailsService } from "./family-details.service";
import { UpsertFamilyDetailsDto, UpsertPreviousMarriageDto } from "./dto/family.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/session.service";

@UseGuards(JwtAuthGuard)
@Controller("profiles/me/previous-marriage")
export class PreviousMarriageController {
  constructor(private readonly previousMarriage: PreviousMarriageService) {}

  @Get()
  async get(@CurrentUser() user: AccessTokenPayload) {
    const previousMarriage = await this.previousMarriage.getForUser(user.sub);
    return { success: true, data: { previousMarriage } };
  }

  @Put()
  async upsert(@CurrentUser() user: AccessTokenPayload, @Body() dto: UpsertPreviousMarriageDto) {
    const previousMarriage = await this.previousMarriage.upsertForUser(user.sub, dto);
    return { success: true, data: { previousMarriage } };
  }
}

@UseGuards(JwtAuthGuard)
@Controller("profiles/me/family")
export class FamilyDetailsController {
  constructor(private readonly familyDetails: FamilyDetailsService) {}

  @Get()
  async get(@CurrentUser() user: AccessTokenPayload) {
    const familyDetails = await this.familyDetails.getForUser(user.sub);
    return { success: true, data: { familyDetails } };
  }

  @Put()
  async upsert(@CurrentUser() user: AccessTokenPayload, @Body() dto: UpsertFamilyDetailsDto) {
    const familyDetails = await this.familyDetails.upsertForUser(user.sub, dto);
    return { success: true, data: { familyDetails } };
  }
}
