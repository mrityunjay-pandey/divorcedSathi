import { Test } from "@nestjs/testing";
import { PhotosService } from "./photos.service";
import { PrismaService } from "@/common/prisma/prisma.module";
import { ErrorCode } from "@/common/errors/error-codes";
import type { Profile, ProfilePhoto } from "@divorcedsathi/db";

type MockPrisma = {
  client: {
    profile: { findUnique: jest.Mock };
    profilePhoto: { findMany: jest.Mock; findUnique: jest.Mock; findFirst: jest.Mock; create: jest.Mock; delete: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
    $transaction: jest.Mock;
  };
};

function baseProfile(): Profile {
  return { id: "profile-1", userId: "user-1" } as Profile;
}

function basePhoto(overrides: Partial<ProfilePhoto> = {}): ProfilePhoto {
  return {
    id: "photo-1",
    profileId: "profile-1",
    storageKey: "s3://bucket/photo1.jpg",
    caption: null,
    isPrimary: false,
    order: 0,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("PhotosService", () => {
  let service: PhotosService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = {
      client: {
        profile: { findUnique: jest.fn() },
        profilePhoto: {
          findMany: jest.fn(),
          findUnique: jest.fn(),
          findFirst: jest.fn(),
          create: jest.fn(),
          delete: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn(),
        },
        $transaction: jest.fn(),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [PhotosService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(PhotosService);
  });

  describe("add", () => {
    it("requires a profile to exist first", async () => {
      prisma.client.profile.findUnique.mockResolvedValueOnce(null);

      await expect(service.add("user-without-profile", { storageKey: "s3://key" })).rejects.toMatchObject({
        code: ErrorCode.PROFILE_NOT_FOUND,
      });
    });

    it("makes the first photo added automatically primary", async () => {
      prisma.client.profile.findUnique.mockResolvedValueOnce(baseProfile());
      prisma.client.profilePhoto.findMany.mockResolvedValueOnce([]);
      prisma.client.profilePhoto.create.mockResolvedValueOnce(basePhoto({ isPrimary: true }));

      await service.add("user-1", { storageKey: "s3://key" });

      expect(prisma.client.profilePhoto.create).toHaveBeenCalledWith({
        data: { profileId: "profile-1", storageKey: "s3://key", caption: undefined, isPrimary: true, order: 0 },
      });
    });

    it("does not make a second photo primary", async () => {
      prisma.client.profile.findUnique.mockResolvedValueOnce(baseProfile());
      prisma.client.profilePhoto.findMany.mockResolvedValueOnce([basePhoto({ isPrimary: true })]);
      prisma.client.profilePhoto.create.mockResolvedValueOnce(basePhoto({ id: "photo-2", isPrimary: false, order: 1 }));

      await service.add("user-1", { storageKey: "s3://key2" });

      const call = prisma.client.profilePhoto.create.mock.calls[0][0];
      expect(call.data.isPrimary).toBe(false);
      expect(call.data.order).toBe(1);
    });

    it("rejects adding beyond the max photo count", async () => {
      prisma.client.profile.findUnique.mockResolvedValueOnce(baseProfile());
      prisma.client.profilePhoto.findMany.mockResolvedValueOnce(Array.from({ length: 10 }, (_, i) => basePhoto({ id: `photo-${i}` })));

      await expect(service.add("user-1", { storageKey: "s3://key" })).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_FAILED,
      });
      expect(prisma.client.profilePhoto.create).not.toHaveBeenCalled();
    });
  });

  describe("ownership — a photo belonging to another profile is treated as not found", () => {
    it("remove() rejects a photo that belongs to a different profile", async () => {
      prisma.client.profile.findUnique.mockResolvedValueOnce(baseProfile());
      prisma.client.profilePhoto.findUnique.mockResolvedValueOnce(basePhoto({ profileId: "someone-elses-profile" }));

      await expect(service.remove("user-1", "photo-1")).rejects.toMatchObject({ code: ErrorCode.PHOTO_NOT_FOUND });
      expect(prisma.client.profilePhoto.delete).not.toHaveBeenCalled();
    });

    it("setPrimary() rejects a photo that belongs to a different profile", async () => {
      prisma.client.profile.findUnique.mockResolvedValueOnce(baseProfile());
      prisma.client.profilePhoto.findUnique.mockResolvedValueOnce(basePhoto({ profileId: "someone-elses-profile" }));

      await expect(service.setPrimary("user-1", "photo-1")).rejects.toMatchObject({ code: ErrorCode.PHOTO_NOT_FOUND });
      expect(prisma.client.$transaction).not.toHaveBeenCalled();
    });

    it("throws PHOTO_NOT_FOUND (not a generic error) for a nonexistent photo id", async () => {
      prisma.client.profile.findUnique.mockResolvedValueOnce(baseProfile());
      prisma.client.profilePhoto.findUnique.mockResolvedValueOnce(null);

      await expect(service.remove("user-1", "nonexistent")).rejects.toMatchObject({ code: ErrorCode.PHOTO_NOT_FOUND });
    });
  });

  describe("primary-photo invariant", () => {
    it("remove() promotes the next photo to primary when the primary is deleted", async () => {
      prisma.client.profile.findUnique.mockResolvedValueOnce(baseProfile());
      prisma.client.profilePhoto.findUnique.mockResolvedValueOnce(basePhoto({ isPrimary: true }));
      prisma.client.profilePhoto.findFirst.mockResolvedValueOnce(basePhoto({ id: "photo-2", order: 1 }));

      await service.remove("user-1", "photo-1");

      expect(prisma.client.profilePhoto.update).toHaveBeenCalledWith({ where: { id: "photo-2" }, data: { isPrimary: true } });
    });

    it("remove() does nothing extra when a non-primary photo is deleted", async () => {
      prisma.client.profile.findUnique.mockResolvedValueOnce(baseProfile());
      prisma.client.profilePhoto.findUnique.mockResolvedValueOnce(basePhoto({ isPrimary: false }));

      await service.remove("user-1", "photo-1");

      expect(prisma.client.profilePhoto.findFirst).not.toHaveBeenCalled();
      expect(prisma.client.profilePhoto.update).not.toHaveBeenCalled();
    });

    it("setPrimary() demotes the current primary and promotes the new one atomically", async () => {
      prisma.client.profile.findUnique.mockResolvedValueOnce(baseProfile());
      prisma.client.profilePhoto.findUnique.mockResolvedValueOnce(basePhoto({ id: "photo-2", isPrimary: false }));
      prisma.client.$transaction.mockResolvedValueOnce([{ count: 1 }, basePhoto({ id: "photo-2", isPrimary: true })]);

      await service.setPrimary("user-1", "photo-2");

      expect(prisma.client.$transaction).toHaveBeenCalledTimes(1);
      const [ops] = prisma.client.$transaction.mock.calls[0];
      expect(ops).toHaveLength(2);
    });
  });
});
