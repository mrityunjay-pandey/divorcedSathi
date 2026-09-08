import { HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.module";
import { AppException } from "@/common/errors/app-exception";
import { ErrorCode } from "@/common/errors/error-codes";
import type { UpsertPartnerPreferenceDto } from "./dto/partner-preference.dto";
import type { PartnerPreference } from "@divorcedsathi/db";

@Injectable()
export class PartnerPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireOwnProfileId(userId: string): Promise<string> {
    const profile = await this.prisma.client.profile.findUnique({ where: { userId } });
    if (!profile) {
      throw new AppException(ErrorCode.PROFILE_NOT_FOUND, "Complete the basic info step before setting partner preferences.", HttpStatus.NOT_FOUND);
    }
    return profile.id;
  }

  async getForUser(userId: string): Promise<PartnerPreference | null> {
    const profileId = await this.requireOwnProfileId(userId);
    return this.prisma.client.partnerPreference.findUnique({ where: { profileId } });
  }

  async upsertForUser(userId: string, dto: UpsertPartnerPreferenceDto): Promise<PartnerPreference> {
    if (dto.ageMin !== undefined && dto.ageMax !== undefined && dto.ageMin > dto.ageMax) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, "Minimum age can't be greater than maximum age.", HttpStatus.BAD_REQUEST);
    }

    // "Open to any marriage status" is a meaningful, mutually-exclusive
    // alternative to picking specific statuses — clear the list rather than
    // storing a stale, ignored selection alongside it.
    const data = { ...dto };
    if (data.openToAnyMarriageStatus) {
      data.previousMarriagePreferences = [];
    }

    const profileId = await this.requireOwnProfileId(userId);
    return this.prisma.client.partnerPreference.upsert({
      where: { profileId },
      create: { profileId, ...data },
      update: data,
    });
  }
}
