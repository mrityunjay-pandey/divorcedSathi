import { HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.module";
import { AppException } from "@/common/errors/app-exception";
import { ErrorCode } from "@/common/errors/error-codes";
import type { UpsertLifestyleDto } from "./dto/lifestyle.dto";
import type { Lifestyle } from "@divorcedsathi/db";

/**
 * Lifestyle hangs off Profile, not User directly (see ARCHITECTURE.md's
 * entity relations) — so every method here first resolves the caller's own
 * Profile by userId, then scopes the Lifestyle row to that profileId. A
 * user with no profile yet gets a clear PROFILE_NOT_FOUND rather than a
 * confusing lifestyle-specific error, since profile creation (Module 3/
 * wizard step 1) is a hard prerequisite.
 */
@Injectable()
export class LifestyleService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireOwnProfileId(userId: string): Promise<string> {
    const profile = await this.prisma.client.profile.findUnique({ where: { userId } });
    if (!profile) {
      throw new AppException(ErrorCode.PROFILE_NOT_FOUND, "Complete the basic info step before adding lifestyle details.", HttpStatus.NOT_FOUND);
    }
    return profile.id;
  }

  async getForUser(userId: string): Promise<Lifestyle | null> {
    const profileId = await this.requireOwnProfileId(userId);
    return this.prisma.client.lifestyle.findUnique({ where: { profileId } });
  }

  /** Upsert: the wizard step can be saved and revisited any number of times before submission. */
  async upsertForUser(userId: string, dto: UpsertLifestyleDto): Promise<Lifestyle> {
    const profileId = await this.requireOwnProfileId(userId);
    return this.prisma.client.lifestyle.upsert({
      where: { profileId },
      create: { profileId, ...dto },
      update: dto,
    });
  }
}
