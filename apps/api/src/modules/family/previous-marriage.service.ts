import { HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.module";
import { AppException } from "@/common/errors/app-exception";
import { ErrorCode } from "@/common/errors/error-codes";
import type { UpsertPreviousMarriageDto } from "./dto/family.dto";
import type { PreviousMarriage } from "@divorcedsathi/db";

/**
 * Public summary shape (brief §13): "Previously married • Divorce finalized"
 * and nothing else. This type exists specifically so a future
 * search/discovery/profile-view endpoint can only ever get this narrow
 * shape from getPublicSummary — there is no field on it a careless
 * `...spread` could leak marriedYear, endedYear, or additionalInfo through.
 */
export interface PreviousMarriagePublicSummary {
  previouslyMarried: true;
  divorceFinalized: boolean;
}

@Injectable()
export class PreviousMarriageService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireOwnProfileId(userId: string): Promise<string> {
    const profile = await this.prisma.client.profile.findUnique({ where: { userId } });
    if (!profile) {
      throw new AppException(ErrorCode.PROFILE_NOT_FOUND, "Complete the basic info step before adding previous marriage details.", HttpStatus.NOT_FOUND);
    }
    return profile.id;
  }

  async getForUser(userId: string): Promise<PreviousMarriage | null> {
    const profileId = await this.requireOwnProfileId(userId);
    return this.prisma.client.previousMarriage.findUnique({ where: { profileId } });
  }

  async upsertForUser(userId: string, dto: UpsertPreviousMarriageDto): Promise<PreviousMarriage> {
    if (dto.marriedYear && dto.endedYear && dto.endedYear < dto.marriedYear) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        "The year the marriage ended can't be before the year it started.",
        HttpStatus.BAD_REQUEST,
      );
    }

    const profileId = await this.requireOwnProfileId(userId);
    return this.prisma.client.previousMarriage.upsert({
      where: { profileId },
      create: { profileId, ...dto },
      update: dto,
    });
  }

  /**
   * The only method any future public-facing surface (profile view, search
   * results, compatibility scoring) should ever call for this data. Never
   * exported alongside a method that returns the full row to the same
   * caller path.
   */
  async getPublicSummaryByProfileId(profileId: string): Promise<PreviousMarriagePublicSummary | null> {
    const record = await this.prisma.client.previousMarriage.findUnique({ where: { profileId } });
    if (!record) return null;
    return { previouslyMarried: true, divorceFinalized: record.divorceFinalized };
  }
}
