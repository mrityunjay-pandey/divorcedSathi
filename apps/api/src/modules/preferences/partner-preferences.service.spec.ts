import { Test } from "@nestjs/testing";
import { PartnerPreferencesService } from "./partner-preferences.service";
import { PrismaService } from "@/common/prisma/prisma.module";
import { ErrorCode } from "@/common/errors/error-codes";
import type { PartnerPreference, Profile } from "@divorcedsathi/db";

type MockPrisma = {
  client: {
    profile: { findUnique: jest.Mock };
    partnerPreference: { findUnique: jest.Mock; upsert: jest.Mock };
  };
};

function baseProfile(): Profile {
  return { id: "profile-1", userId: "user-1" } as Profile;
}

function basePreference(overrides: Partial<PartnerPreference> = {}): PartnerPreference {
  return {
    id: "pref-1",
    profileId: "profile-1",
    ageMin: 30,
    ageMax: 45,
    preferredCities: [],
    preferredStates: [],
    preferredCountries: [],
    willingToRelocate: null,
    preferredEducation: [],
    preferredProfessions: [],
    minIncomeRange: null,
    previousMarriagePreferences: [],
    openToAnyMarriageStatus: false,
    childrenPreference: "OPEN_TO_EITHER" as PartnerPreference["childrenPreference"],
    lifestylePreferences: null,
    otherPreferences: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("PartnerPreferencesService", () => {
  let service: PartnerPreferencesService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = {
      client: {
        profile: { findUnique: jest.fn() },
        partnerPreference: { findUnique: jest.fn(), upsert: jest.fn() },
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [PartnerPreferencesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(PartnerPreferencesService);
  });

  it("rejects ageMin greater than ageMax", async () => {
    await expect(service.upsertForUser("user-1", { ageMin: 50, ageMax: 30 })).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_FAILED,
    });
    expect(prisma.client.profile.findUnique).not.toHaveBeenCalled();
  });

  it("requires a profile before setting preferences", async () => {
    prisma.client.profile.findUnique.mockResolvedValueOnce(null);

    await expect(service.upsertForUser("user-without-profile", { ageMin: 30 })).rejects.toMatchObject({
      code: ErrorCode.PROFILE_NOT_FOUND,
    });
  });

  it("scopes the write to the caller's own resolved profileId", async () => {
    prisma.client.profile.findUnique.mockResolvedValueOnce(baseProfile());
    prisma.client.partnerPreference.upsert.mockResolvedValueOnce(basePreference());

    await service.upsertForUser("user-1", { ageMin: 30, ageMax: 45 });

    expect(prisma.client.partnerPreference.upsert).toHaveBeenCalledWith({
      where: { profileId: "profile-1" },
      create: { profileId: "profile-1", ageMin: 30, ageMax: 45 },
      update: { ageMin: 30, ageMax: 45 },
    });
  });

  it("clears previousMarriagePreferences when openToAnyMarriageStatus is set, rather than keeping a stale ignored list", async () => {
    prisma.client.profile.findUnique.mockResolvedValueOnce(baseProfile());
    prisma.client.partnerPreference.upsert.mockResolvedValueOnce(basePreference({ openToAnyMarriageStatus: true }));

    await service.upsertForUser("user-1", {
      openToAnyMarriageStatus: true,
      previousMarriagePreferences: ["DIVORCED"],
    });

    expect(prisma.client.partnerPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ openToAnyMarriageStatus: true, previousMarriagePreferences: [] }),
      }),
    );
  });
});
