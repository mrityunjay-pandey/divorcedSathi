import { HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.module";
import { AppException } from "@/common/errors/app-exception";
import { ErrorCode } from "@/common/errors/error-codes";
import type { AddPhotoDto } from "./dto/photo.dto";
import type { ProfilePhoto } from "@divorcedsathi/db";

const MAX_PHOTOS_PER_PROFILE = 10;

@Injectable()
export class PhotosService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireOwnProfileId(userId: string): Promise<string> {
    const profile = await this.prisma.client.profile.findUnique({ where: { userId } });
    if (!profile) {
      throw new AppException(ErrorCode.PROFILE_NOT_FOUND, "Complete the basic info step before adding photos.", HttpStatus.NOT_FOUND);
    }
    return profile.id;
  }

  async list(userId: string): Promise<ProfilePhoto[]> {
    const profileId = await this.requireOwnProfileId(userId);
    return this.prisma.client.profilePhoto.findMany({ where: { profileId }, orderBy: { order: "asc" } });
  }

  async add(userId: string, dto: AddPhotoDto): Promise<ProfilePhoto> {
    const profileId = await this.requireOwnProfileId(userId);

    const existing = await this.prisma.client.profilePhoto.findMany({ where: { profileId } });
    if (existing.length >= MAX_PHOTOS_PER_PROFILE) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        `You can have at most ${MAX_PHOTOS_PER_PROFILE} photos.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // The first photo added is automatically primary — a profile with any
    // photos always has exactly one primary, no separate "pick one" step.
    const isPrimary = existing.length === 0;

    return this.prisma.client.profilePhoto.create({
      data: { profileId, storageKey: dto.storageKey, caption: dto.caption, isPrimary, order: existing.length },
    });
  }

  private async requireOwnPhoto(userId: string, photoId: string): Promise<ProfilePhoto & { profileId: string }> {
    const profileId = await this.requireOwnProfileId(userId);
    const photo = await this.prisma.client.profilePhoto.findUnique({ where: { id: photoId } });
    if (!photo || photo.profileId !== profileId) {
      // Same rationale as InterestsService's block-check: don't distinguish
      // "doesn't exist" from "exists but isn't yours" in the response.
      throw new AppException(ErrorCode.PHOTO_NOT_FOUND, "Photo not found.", HttpStatus.NOT_FOUND);
    }
    return photo;
  }

  async remove(userId: string, photoId: string): Promise<void> {
    const photo = await this.requireOwnPhoto(userId, photoId);
    await this.prisma.client.profilePhoto.delete({ where: { id: photoId } });

    // Deleting the primary photo promotes the next one in order, so a
    // profile with remaining photos is never left with zero primaries.
    if (photo.isPrimary) {
      const next = await this.prisma.client.profilePhoto.findFirst({
        where: { profileId: photo.profileId },
        orderBy: { order: "asc" },
      });
      if (next) {
        await this.prisma.client.profilePhoto.update({ where: { id: next.id }, data: { isPrimary: true } });
      }
    }
  }

  async setPrimary(userId: string, photoId: string): Promise<ProfilePhoto> {
    const photo = await this.requireOwnPhoto(userId, photoId);

    // Exactly one primary per profile — demote whichever one currently
    // holds it before promoting the new one, in the same transaction so
    // a crash between the two can't leave two primaries or zero.
    const [, updated] = await this.prisma.client.$transaction([
      this.prisma.client.profilePhoto.updateMany({ where: { profileId: photo.profileId, isPrimary: true }, data: { isPrimary: false } }),
      this.prisma.client.profilePhoto.update({ where: { id: photoId }, data: { isPrimary: true } }),
    ]);

    return updated;
  }
}
