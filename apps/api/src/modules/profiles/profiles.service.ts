import { HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.module";
import { AppException } from "@/common/errors/app-exception";
import { ErrorCode } from "@/common/errors/error-codes";
import type { CreateProfileDto, UpdateProfileDto } from "./dto/profile.dto";
import type { Profile } from "@divorcedsathi/db";

/**
 * Every mutating method here is keyed off a userId taken from the verified
 * JWT (see ProfilesController), never off an id supplied in the request
 * body/params. That's what makes "User A can't modify User B's profile by
 * changing an id" true by construction rather than by an extra check that
 * could be forgotten (brief §52).
 */
@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async createForUser(userId: string, dto: CreateProfileDto): Promise<Profile> {
    const existing = await this.prisma.client.profile.findUnique({ where: { userId } });
    if (existing) {
      throw new AppException(ErrorCode.PROFILE_ALREADY_EXISTS, "A profile already exists for this account.", HttpStatus.CONFLICT);
    }

    return this.prisma.client.profile.create({
      data: {
        userId,
        heightCm: dto.heightCm,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        motherTongue: dto.motherTongue,
        religion: dto.religion,
        community: dto.community,
        education: dto.education,
        profession: dto.profession,
        employmentType: dto.employmentType,
        incomeRange: dto.incomeRange,
      },
    });
  }

  async getForUser(userId: string): Promise<Profile> {
    const profile = await this.prisma.client.profile.findUnique({ where: { userId } });
    if (!profile) {
      throw new AppException(ErrorCode.PROFILE_NOT_FOUND, "No profile found for this account yet.", HttpStatus.NOT_FOUND);
    }
    return profile;
  }

  async updateForUser(userId: string, dto: UpdateProfileDto): Promise<Profile> {
    const existing = await this.prisma.client.profile.findUnique({ where: { userId } });
    if (!existing) {
      throw new AppException(ErrorCode.PROFILE_NOT_FOUND, "Create a profile before updating it.", HttpStatus.NOT_FOUND);
    }

    return this.prisma.client.profile.update({
      where: { userId },
      data: dto,
    });
  }

  /**
   * Public-ish read by profile id, for future search/discovery (Module 7/8).
   * Field-level privacy filtering (brief §17) is layered on in the Privacy
   * Controls module — this returns the full row for now since there is no
   * search/discovery surface yet that would expose it to other users.
   */
  async getById(profileId: string): Promise<Profile> {
    const profile = await this.prisma.client.profile.findUnique({ where: { id: profileId } });
    if (!profile) {
      throw new AppException(ErrorCode.PROFILE_NOT_FOUND, "Profile not found.", HttpStatus.NOT_FOUND);
    }
    return profile;
  }
}
