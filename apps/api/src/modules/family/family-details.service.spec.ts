import { Test } from "@nestjs/testing";
import { FamilyDetailsService } from "./family-details.service";
import { PrismaService } from "@/common/prisma/prisma.module";
import { ErrorCode } from "@/common/errors/error-codes";
import type { FamilyDetails, Profile } from "@divorcedsathi/db";

type MockPrisma = {
  client: {
    profile: { findUnique: jest.Mock };
    familyDetails: { findUnique: jest.Mock; upsert: jest.Mock };
  };
};

function baseProfile(): Profile {
  return { id: "profile-1", userId: "user-1" } as Profile;
}

function baseFamilyDetails(overrides: Partial<FamilyDetails> = {}): FamilyDetails {
  return {
    id: "fd-1",
    profileId: "profile-1",
    childrenCount: "TWO" as FamilyDetails["childrenCount"],
    childrenLivingArrangement: "SHARED" as FamilyDetails["childrenLivingArrangement"],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("FamilyDetailsService", () => {
  let service: FamilyDetailsService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = {
      client: {
        profile: { findUnique: jest.fn() },
        familyDetails: { findUnique: jest.fn(), upsert: jest.fn() },
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [FamilyDetailsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(FamilyDetailsService);
  });

  it("requires a profile before reading family details", async () => {
    prisma.client.profile.findUnique.mockResolvedValueOnce(null);

    await expect(service.getForUser("user-without-profile")).rejects.toMatchObject({
      code: ErrorCode.PROFILE_NOT_FOUND,
    });
  });

  it("scopes the upsert to the caller's own resolved profileId", async () => {
    prisma.client.profile.findUnique.mockResolvedValueOnce(baseProfile());
    prisma.client.familyDetails.upsert.mockResolvedValueOnce(baseFamilyDetails());

    await service.upsertForUser("user-1", { childrenCount: "TWO", childrenLivingArrangement: "SHARED" });

    expect(prisma.client.familyDetails.upsert).toHaveBeenCalledWith({
      where: { profileId: "profile-1" },
      create: { profileId: "profile-1", childrenCount: "TWO", childrenLivingArrangement: "SHARED" },
      update: { childrenCount: "TWO", childrenLivingArrangement: "SHARED" },
    });
  });

  it("allows childrenCount NONE with no living arrangement — not forced to answer an inapplicable question", async () => {
    prisma.client.profile.findUnique.mockResolvedValueOnce(baseProfile());
    prisma.client.familyDetails.upsert.mockResolvedValueOnce(baseFamilyDetails({ childrenCount: "NONE" as FamilyDetails["childrenCount"], childrenLivingArrangement: null }));

    const result = await service.upsertForUser("user-1", { childrenCount: "NONE" });

    expect(result.childrenLivingArrangement).toBeNull();
  });
});
