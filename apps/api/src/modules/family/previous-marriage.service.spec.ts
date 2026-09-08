import { Test } from "@nestjs/testing";
import { PreviousMarriageService } from "./previous-marriage.service";
import { PrismaService } from "@/common/prisma/prisma.module";
import { ErrorCode } from "@/common/errors/error-codes";
import type { PreviousMarriage, Profile } from "@divorcedsathi/db";

type MockPrisma = {
  client: {
    profile: { findUnique: jest.Mock };
    previousMarriage: { findUnique: jest.Mock; upsert: jest.Mock };
  };
};

function baseProfile(): Profile {
  return { id: "profile-1", userId: "user-1" } as Profile;
}

function baseRecord(overrides: Partial<PreviousMarriage> = {}): PreviousMarriage {
  return {
    id: "pm-1",
    profileId: "profile-1",
    marriedYear: 2010,
    endedYear: 2020,
    divorceFinalized: true,
    additionalInfo: "Court case #12345 — private notes never meant for other members.",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("PreviousMarriageService", () => {
  let service: PreviousMarriageService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = {
      client: {
        profile: { findUnique: jest.fn() },
        previousMarriage: { findUnique: jest.fn(), upsert: jest.fn() },
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [PreviousMarriageService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(PreviousMarriageService);
  });

  describe("getPublicSummaryByProfileId — the core privacy guarantee (brief §13)", () => {
    it("never includes marriedYear, endedYear, or additionalInfo, even though the underlying row has them", async () => {
      prisma.client.previousMarriage.findUnique.mockResolvedValueOnce(baseRecord());

      const summary = await service.getPublicSummaryByProfileId("profile-1");

      expect(summary).toEqual({ previouslyMarried: true, divorceFinalized: true });
      // Explicitly assert the sensitive keys are absent, not just unequal —
      // guards against a future '...spread' regression silently widening this.
      expect(summary).not.toHaveProperty("marriedYear");
      expect(summary).not.toHaveProperty("endedYear");
      expect(summary).not.toHaveProperty("additionalInfo");
    });

    it("returns null rather than throwing when there is no record yet", async () => {
      prisma.client.previousMarriage.findUnique.mockResolvedValueOnce(null);

      const summary = await service.getPublicSummaryByProfileId("profile-without-marriage-history");

      expect(summary).toBeNull();
    });

    it("reflects an unfinalized divorce accurately rather than defaulting to true", async () => {
      prisma.client.previousMarriage.findUnique.mockResolvedValueOnce(baseRecord({ divorceFinalized: false }));

      const summary = await service.getPublicSummaryByProfileId("profile-1");

      expect(summary?.divorceFinalized).toBe(false);
    });
  });

  describe("upsertForUser", () => {
    it("rejects an endedYear before marriedYear", async () => {
      await expect(
        service.upsertForUser("user-1", { marriedYear: 2020, endedYear: 2015 }),
      ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_FAILED });

      expect(prisma.client.profile.findUnique).not.toHaveBeenCalled();
      expect(prisma.client.previousMarriage.upsert).not.toHaveBeenCalled();
    });

    it("requires a profile to exist first", async () => {
      prisma.client.profile.findUnique.mockResolvedValueOnce(null);

      await expect(service.upsertForUser("user-without-profile", { divorceFinalized: true })).rejects.toMatchObject({
        code: ErrorCode.PROFILE_NOT_FOUND,
      });
    });

    it("scopes the write to the caller's own resolved profileId", async () => {
      prisma.client.profile.findUnique.mockResolvedValueOnce(baseProfile());
      prisma.client.previousMarriage.upsert.mockResolvedValueOnce(baseRecord());

      await service.upsertForUser("user-1", { divorceFinalized: true, additionalInfo: "private note" });

      expect(prisma.client.previousMarriage.upsert).toHaveBeenCalledWith({
        where: { profileId: "profile-1" },
        create: { profileId: "profile-1", divorceFinalized: true, additionalInfo: "private note" },
        update: { divorceFinalized: true, additionalInfo: "private note" },
      });
    });
  });

  describe("getForUser", () => {
    it("returns the full private record to the owner (this is the /me endpoint, not the public one)", async () => {
      prisma.client.profile.findUnique.mockResolvedValueOnce(baseProfile());
      prisma.client.previousMarriage.findUnique.mockResolvedValueOnce(baseRecord());

      const result = await service.getForUser("user-1");

      expect(result?.additionalInfo).toContain("private notes");
    });
  });
});
