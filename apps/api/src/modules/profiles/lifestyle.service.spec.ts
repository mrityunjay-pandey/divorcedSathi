import { Test } from "@nestjs/testing";
import { LifestyleService } from "./lifestyle.service";
import { PrismaService } from "@/common/prisma/prisma.module";
import { ErrorCode } from "@/common/errors/error-codes";
import type { Lifestyle, Profile } from "@divorcedsathi/db";

type MockPrisma = {
  client: {
    profile: { findUnique: jest.Mock };
    lifestyle: { findUnique: jest.Mock; upsert: jest.Mock };
  };
};

function baseProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "profile-1",
    userId: "user-1",
    heightCm: null,
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
  } as Profile;
}

function baseLifestyle(overrides: Partial<Lifestyle> = {}): Lifestyle {
  return {
    id: "lifestyle-1",
    profileId: "profile-1",
    diet: null,
    smoking: null,
    drinking: null,
    fitnessRoutine: null,
    hobbies: null,
    pets: null,
    travelFrequency: null,
    sleepSchedule: null,
    socialLifestyle: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Lifestyle;
}

describe("LifestyleService", () => {
  let service: LifestyleService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = {
      client: {
        profile: { findUnique: jest.fn() },
        lifestyle: { findUnique: jest.fn(), upsert: jest.fn() },
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [LifestyleService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(LifestyleService);
  });

  it("requires a profile to exist before reading lifestyle", async () => {
    prisma.client.profile.findUnique.mockResolvedValueOnce(null);

    await expect(service.getForUser("user-without-profile")).rejects.toMatchObject({
      code: ErrorCode.PROFILE_NOT_FOUND,
    });
    expect(prisma.client.lifestyle.findUnique).not.toHaveBeenCalled();
  });

  it("scopes the lifestyle lookup to the caller's own profile id, resolved server-side from the JWT userId", async () => {
    prisma.client.profile.findUnique.mockResolvedValueOnce(baseProfile({ id: "profile-1", userId: "user-1" }));
    prisma.client.lifestyle.findUnique.mockResolvedValueOnce(baseLifestyle());

    await service.getForUser("user-1");

    expect(prisma.client.profile.findUnique).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(prisma.client.lifestyle.findUnique).toHaveBeenCalledWith({ where: { profileId: "profile-1" } });
  });

  it("upserts using the resolved profileId, not any client-supplied id", async () => {
    prisma.client.profile.findUnique.mockResolvedValueOnce(baseProfile({ id: "profile-1", userId: "user-1" }));
    prisma.client.lifestyle.upsert.mockResolvedValueOnce(baseLifestyle({ diet: "VEGETARIAN" as Lifestyle["diet"] }));

    const result = await service.upsertForUser("user-1", { diet: "VEGETARIAN" });

    expect(prisma.client.lifestyle.upsert).toHaveBeenCalledWith({
      where: { profileId: "profile-1" },
      create: { profileId: "profile-1", diet: "VEGETARIAN" },
      update: { diet: "VEGETARIAN" },
    });
    expect(result.diet).toBe("VEGETARIAN");
  });

  it("rejects upsert when the user has no profile yet, rather than creating an orphaned lifestyle row", async () => {
    prisma.client.profile.findUnique.mockResolvedValueOnce(null);

    await expect(service.upsertForUser("user-2", { diet: "VEGAN" })).rejects.toMatchObject({
      code: ErrorCode.PROFILE_NOT_FOUND,
    });
    expect(prisma.client.lifestyle.upsert).not.toHaveBeenCalled();
  });
});
