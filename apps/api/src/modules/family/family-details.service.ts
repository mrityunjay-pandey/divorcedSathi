import { HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.module";
import { AppException } from "@/common/errors/app-exception";
import { ErrorCode } from "@/common/errors/error-codes";
import type { UpsertFamilyDetailsDto } from "./dto/family.dto";
import type { FamilyDetails } from "@divorcedsathi/db";

/**
 * Neutral by construction: there is no field here that reads as a judgment
 * (brief §14 — "do NOT make users feel judged"). childrenLivingArrangement
 * is optional because it only makes sense once childrenCount is non-NONE;
 * the service doesn't force it, the wizard UI just hides that field when
 * childrenCount is NONE.
 */
@Injectable()
export class FamilyDetailsService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireOwnProfileId(userId: string): Promise<string> {
    const profile = await this.prisma.client.profile.findUnique({ where: { userId } });
    if (!profile) {
      throw new AppException(ErrorCode.PROFILE_NOT_FOUND, "Complete the basic info step before adding family details.", HttpStatus.NOT_FOUND);
    }
    return profile.id;
  }

  async getForUser(userId: string): Promise<FamilyDetails | null> {
    const profileId = await this.requireOwnProfileId(userId);
    return this.prisma.client.familyDetails.findUnique({ where: { profileId } });
  }

  async upsertForUser(userId: string, dto: UpsertFamilyDetailsDto): Promise<FamilyDetails> {
    const profileId = await this.requireOwnProfileId(userId);
    return this.prisma.client.familyDetails.upsert({
      where: { profileId },
      create: { profileId, ...dto },
      update: dto,
    });
  }
}
