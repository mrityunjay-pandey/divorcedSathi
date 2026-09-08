import { HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.module";
import { AppException } from "@/common/errors/app-exception";
import { ErrorCode } from "@/common/errors/error-codes";
import type { UpdatePrivacySettingDto } from "./dto/privacy-setting.dto";
import { VisibilityLevel, type PrivacySetting } from "@divorcedsathi/db";

/**
 * Mirrors the schema's own @default values (packages/db/prisma/schema.prisma
 * PrivacySetting model) so a user who has never visited Settings → Privacy
 * still sees sensible, non-empty toggle states rather than a blank form —
 * without eagerly creating a database row for every profile at signup.
 */
const DEFAULTS: Omit<PrivacySetting, "id" | "profileId" | "createdAt" | "updatedAt"> = {
  incomeVisibility: VisibilityLevel.MATCHES,
  contactVisibility: VisibilityLevel.NOBODY,
  divorceDetailsVisibility: VisibilityLevel.MATCHES,
  childrenDetailsVisibility: VisibilityLevel.REGISTERED,
  photoVisibility: VisibilityLevel.REGISTERED,
  requirePhotoRequestApproval: false,
  showLastActiveStatus: true,
  showOnlineStatus: true,
};

@Injectable()
export class PrivacyService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireOwnProfileId(userId: string): Promise<string> {
    const profile = await this.prisma.client.profile.findUnique({ where: { userId } });
    if (!profile) {
      throw new AppException(ErrorCode.PROFILE_NOT_FOUND, "Complete the basic info step before setting privacy preferences.", HttpStatus.NOT_FOUND);
    }
    return profile.id;
  }

  async getForUser(userId: string): Promise<typeof DEFAULTS & { profileId: string }> {
    const profileId = await this.requireOwnProfileId(userId);
    const existing = await this.prisma.client.privacySetting.findUnique({ where: { profileId } });
    return existing ?? { ...DEFAULTS, profileId };
  }

  async updateForUser(userId: string, dto: UpdatePrivacySettingDto): Promise<PrivacySetting> {
    const profileId = await this.requireOwnProfileId(userId);
    return this.prisma.client.privacySetting.upsert({
      where: { profileId },
      create: { profileId, ...DEFAULTS, ...dto },
      update: dto,
    });
  }
}
