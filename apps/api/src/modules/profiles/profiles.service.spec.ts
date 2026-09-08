import { Test } from "@nestjs/testing";
import { ProfilesService } from "./profiles.service";
import { PrismaService } from "@/common/prisma/prisma.module";
import { ErrorCode } from "@/common/errors/error-codes";
import type { Profile } from "@divorcedsathi/db";

type MockPrisma = {
  client: {
    profile: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
};

function baseProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "profile-1",
    userId: "user-1",
    heightCm: 165,
    city: "Pune",
    state: null,
    country: "India",
    motherTongue: null,
    religion: null,
    community: null,
    education: null,
    profession: null,
    employmentType: null,
    incomeRange: null,
    aboutMe: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("ProfilesService", () => {
  let service: ProfilesService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = {
      client: {
        profile: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [ProfilesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(ProfilesService);
  });

  describe("createForUser", () => {
    it("creates a profile scoped to the given userId", async () => {
      prisma.client.profile.findUnique.mockResolvedValueOnce(null);
      prisma.client.profile.create.mockResolvedValueOnce(baseProfile());

      await service.createForUser("user-1", { city: "Pune" });

      expect(prisma.client.profile.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: "user-1" }) }),
      );
    });

    it("rejects a second profile for the same user", async () => {
      prisma.client.profile.findUnique.mockResolvedValueOnce(baseProfile());

      await expect(service.createForUser("user-1", { city: "Pune" })).rejects.toMatchObject({
        code: ErrorCode.PROFILE_ALREADY_EXISTS,
      });
      expect(prisma.client.profile.create).not.toHaveBeenCalled();
    });
  });

  describe("updateForUser — ownership guarantee", () => {
    it("scopes the update to the acting user's own row via a userId where-clause, not a client-supplied id", async () => {
      prisma.client.profile.findUnique.mockResolvedValueOnce(baseProfile({ userId: "user-1" }));
      prisma.client.profile.update.mockResolvedValueOnce(baseProfile({ userId: "user-1", city: "Mumbai" }));

      // Simulates: User A (userId "user-1") sends an update request. Even if
      // an attacker tried to smuggle a different profile/user id into the
      // body, UpdateProfileDto has no id field, and the where-clause below
      // is built from the authenticated userId, not from anything in dto —
      // so there is no field through which User A could target User B's row.
      await service.updateForUser("user-1", { city: "Mumbai" });

      expect(prisma.client.profile.update).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        data: { city: "Mumbai" },
      });
    });

    it("returns PROFILE_NOT_FOUND rather than creating one implicitly when updating before creation", async () => {
      prisma.client.profile.findUnique.mockResolvedValueOnce(null);

      await expect(service.updateForUser("user-2", { city: "Mumbai" })).rejects.toMatchObject({
        code: ErrorCode.PROFILE_NOT_FOUND,
      });
      expect(prisma.client.profile.update).not.toHaveBeenCalled();
    });
  });

  describe("getForUser", () => {
    it("returns only the profile belonging to the requested userId", async () => {
      prisma.client.profile.findUnique.mockResolvedValueOnce(baseProfile({ userId: "user-1" }));

      const result = await service.getForUser("user-1");

      expect(prisma.client.profile.findUnique).toHaveBeenCalledWith({ where: { userId: "user-1" } });
      expect(result.userId).toBe("user-1");
    });

    it("throws PROFILE_NOT_FOUND when the user has no profile yet", async () => {
      prisma.client.profile.findUnique.mockResolvedValueOnce(null);

      await expect(service.getForUser("user-3")).rejects.toMatchObject({ code: ErrorCode.PROFILE_NOT_FOUND });
    });
  });
});
