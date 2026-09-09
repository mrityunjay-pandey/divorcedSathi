import { Test } from "@nestjs/testing";
import { ProfileDetailService } from "./profile-detail.service";
import { PrismaService } from "@/common/prisma/prisma.module";
import { BlockService } from "../safety/block.service";
import { PreviousMarriageService } from "../family/previous-marriage.service";
import { ErrorCode } from "@/common/errors/error-codes";
import type { FamilyDetails, PreviousMarriage, ProfilePhoto, PrivacySetting, User } from "@divorcedsathi/db";

type MockPrisma = {
  client: {
    profile: { findUnique: jest.Mock };
    match: { findUnique: jest.Mock };
  };
};

function baseUser(): User {
  return { id: "owner-1", firstName: "Ananya", dateOfBirth: new Date(new Date().getFullYear() - 35, 0, 1) } as User;
}

function basePrivacy(overrides: Partial<PrivacySetting> = {}): PrivacySetting {
  return {
    id: "priv-1",
    profileId: "profile-1",
    incomeVisibility: "MATCHES" as PrivacySetting["incomeVisibility"],
    contactVisibility: "NOBODY" as PrivacySetting["contactVisibility"],
    divorceDetailsVisibility: "MATCHES" as PrivacySetting["divorceDetailsVisibility"],
    childrenDetailsVisibility: "REGISTERED" as PrivacySetting["childrenDetailsVisibility"],
    photoVisibility: "REGISTERED" as PrivacySetting["photoVisibility"],
    requirePhotoRequestApproval: false,
    showLastActiveStatus: true,
    showOnlineStatus: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function baseProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: "profile-1",
    userId: "owner-1",
    heightCm: 165,
    city: "Pune",
    state: "Maharashtra",
    country: "India",
    motherTongue: null,
    religion: "Hindu",
    community: null,
    education: "MBA",
    profession: "Product Manager",
    employmentType: null,
    incomeRange: "L10_TO_20L",
    aboutMe: "Looking for a genuine connection.",
    createdAt: new Date(),
    updatedAt: new Date(),
    user: baseUser(),
    lifestyle: null,
    previousMarriage: {
      id: "pm-1",
      profileId: "profile-1",
      marriedYear: 2010,
      endedYear: 2020,
      divorceFinalized: true,
      additionalInfo: "private note",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as PreviousMarriage,
    familyDetails: {
      id: "fd-1",
      profileId: "profile-1",
      childrenCount: "TWO",
      childrenLivingArrangement: "SHARED",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as FamilyDetails,
    privacySetting: basePrivacy(),
    photos: [{ id: "photo-1", profileId: "profile-1", storageKey: "s3://key1", caption: null, isPrimary: true, order: 0, createdAt: new Date() } as ProfilePhoto],
    ...overrides,
  };
}

describe("ProfileDetailService — the privacy-enforcement point", () => {
  let service: ProfileDetailService;
  let prisma: MockPrisma;
  let blocks: { isBlockedEitherDirection: jest.Mock };
  let previousMarriage: { getPublicSummaryByProfileId: jest.Mock };

  beforeEach(async () => {
    prisma = { client: { profile: { findUnique: jest.fn() }, match: { findUnique: jest.fn() } } };
    blocks = { isBlockedEitherDirection: jest.fn().mockResolvedValue(false) };
    previousMarriage = { getPublicSummaryByProfileId: jest.fn().mockResolvedValue({ previouslyMarried: true, divorceFinalized: true }) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProfileDetailService,
        { provide: PrismaService, useValue: prisma },
        { provide: BlockService, useValue: blocks },
        { provide: PreviousMarriageService, useValue: previousMarriage },
      ],
    }).compile();

    service = moduleRef.get(ProfileDetailService);
  });

  it("throws PROFILE_NOT_FOUND for a nonexistent profile", async () => {
    prisma.client.profile.findUnique.mockResolvedValueOnce(null);

    await expect(service.getPublicProfile("viewer-1", "nonexistent")).rejects.toMatchObject({ code: ErrorCode.PROFILE_NOT_FOUND });
  });

  it("treats a blocked relationship exactly like a nonexistent profile — never a distinguishable 'blocked' error", async () => {
    prisma.client.profile.findUnique.mockResolvedValueOnce(baseProfile());
    blocks.isBlockedEitherDirection.mockResolvedValueOnce(true);

    await expect(service.getPublicProfile("viewer-1", "profile-1")).rejects.toMatchObject({ code: ErrorCode.PROFILE_NOT_FOUND });
  });

  it("the owner viewing their own profile (SELF) sees everything regardless of privacy settings", async () => {
    prisma.client.profile.findUnique.mockResolvedValueOnce(
      baseProfile({ privacySetting: basePrivacy({ incomeVisibility: "NOBODY" as PrivacySetting["incomeVisibility"] }) }),
    );

    const result = await service.getPublicProfile("owner-1", "profile-1");

    expect(result.viewerRelation).toBe("SELF");
    expect(result.incomeRange).toBe("L10_TO_20L");
    expect(result.familyDetails).not.toBeNull();
    expect(result.photoStorageKeys).toEqual(["s3://key1"]);
  });

  describe("a stranger (REGISTERED, no match) — the default relation for any other logged-in user", () => {
    it("cannot see income (MATCHES-gated) but can see family details (REGISTERED-gated)", async () => {
      prisma.client.profile.findUnique.mockResolvedValueOnce(baseProfile());
      prisma.client.match.findUnique.mockResolvedValueOnce(null);

      const result = await service.getPublicProfile("stranger-1", "profile-1");

      expect(result.viewerRelation).toBe("REGISTERED");
      expect(result.incomeRange).toBeNull();
      expect(result.familyDetails).toEqual({ childrenCount: "TWO", childrenLivingArrangement: "SHARED" });
    });

    it("never sees previousMarriageDetails (marriedYear/endedYear/additionalInfo) — only the always-public summary", async () => {
      prisma.client.profile.findUnique.mockResolvedValueOnce(baseProfile());
      prisma.client.match.findUnique.mockResolvedValueOnce(null);

      const result = await service.getPublicProfile("stranger-1", "profile-1");

      expect(result.previousMarriageDetails).toBeNull();
      expect(result.previousMarriage).toEqual({ previouslyMarried: true, divorceFinalized: true });
    });

    it("aboutMe, education, and profession are never privacy-gated — always visible to any viewer", async () => {
      prisma.client.profile.findUnique.mockResolvedValueOnce(baseProfile());
      prisma.client.match.findUnique.mockResolvedValueOnce(null);

      const result = await service.getPublicProfile("stranger-1", "profile-1");

      expect(result.aboutMe).toBe("Looking for a genuine connection.");
      expect(result.education).toBe("MBA");
      expect(result.profession).toBe("Product Manager");
    });
  });

  it("a MATCH can see MATCHES-gated income and divorce details that a stranger cannot", async () => {
    prisma.client.profile.findUnique.mockResolvedValueOnce(baseProfile());
    prisma.client.match.findUnique.mockResolvedValueOnce({ id: "match-1", userAId: "profile-1-owner-sorted-a", userBId: "b" });

    const result = await service.getPublicProfile("matched-viewer-1", "profile-1");

    expect(result.viewerRelation).toBe("MATCH");
    expect(result.incomeRange).toBe("L10_TO_20L");
    expect(result.previousMarriageDetails).toEqual({ marriedYear: 2010, endedYear: 2020, additionalInfo: "private note" });
  });

  it("respects PrivacySetting defaults (Module 13's DEFAULTS) when no row has been saved yet", async () => {
    prisma.client.profile.findUnique.mockResolvedValueOnce(baseProfile({ privacySetting: null }));
    prisma.client.match.findUnique.mockResolvedValueOnce(null);

    const result = await service.getPublicProfile("stranger-1", "profile-1");

    // Default incomeVisibility is MATCHES, so a stranger (not a match) can't see it —
    // same outcome as when a PrivacySetting row exists with the default value.
    expect(result.incomeRange).toBeNull();
    // Default childrenDetailsVisibility is REGISTERED, so a stranger CAN see it.
    expect(result.familyDetails).not.toBeNull();
  });

  it("hides photoStorageKeys entirely (not just individual photos) when photoVisibility disallows the viewer", async () => {
    prisma.client.profile.findUnique.mockResolvedValueOnce(
      baseProfile({ privacySetting: basePrivacy({ photoVisibility: "NOBODY" as PrivacySetting["photoVisibility"] }) }),
    );
    prisma.client.match.findUnique.mockResolvedValueOnce(null);

    const result = await service.getPublicProfile("stranger-1", "profile-1");

    expect(result.photoStorageKeys).toBeNull();
  });
});
