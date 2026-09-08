import { Test } from "@nestjs/testing";
import { SearchService } from "./search.service";
import { PrismaService } from "@/common/prisma/prisma.module";
import { PreviousMarriageService } from "../family/previous-marriage.service";
import type { Profile, User } from "@divorcedsathi/db";

type MockPrisma = {
  client: {
    user: { findMany: jest.Mock; count: jest.Mock };
  };
};

function userWithProfile(overrides: Partial<User & { profile: Profile }> = {}): User & { profile: Profile } {
  const dateOfBirth = overrides.dateOfBirth ?? new Date(new Date().getFullYear() - 35, 0, 1);
  return {
    id: "user-2",
    firstName: "Ananya",
    lastName: null,
    email: "ananya@example.com",
    mobileNumber: null,
    passwordHash: "irrelevant",
    dateOfBirth,
    gender: "FEMALE" as User["gender"],
    city: "Mumbai",
    marriageStatus: "DIVORCED" as User["marriageStatus"],
    emailVerifiedAt: new Date(),
    mobileVerifiedAt: null,
    role: "USER" as User["role"],
    status: "ACTIVE" as User["status"],
    createdAt: new Date(),
    updatedAt: new Date(),
    profile: {
      id: "profile-2",
      userId: "user-2",
      heightCm: 160,
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      motherTongue: null,
      religion: "Hindu",
      community: null,
      education: "MBA",
      profession: "Product Manager",
      employmentType: null,
      incomeRange: null,
      aboutMe: "should never appear in search results",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ...overrides,
  } as User & { profile: Profile };
}

describe("SearchService", () => {
  let service: SearchService;
  let prisma: MockPrisma;
  let previousMarriage: { getPublicSummaryByProfileId: jest.Mock };

  beforeEach(async () => {
    prisma = { client: { user: { findMany: jest.fn(), count: jest.fn() } } };
    previousMarriage = { getPublicSummaryByProfileId: jest.fn().mockResolvedValue({ previouslyMarried: true, divorceFinalized: true }) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: prisma },
        { provide: PreviousMarriageService, useValue: previousMarriage },
      ],
    }).compile();

    service = moduleRef.get(SearchService);
  });

  it("always excludes the caller's own id from the where-clause", async () => {
    prisma.client.user.findMany.mockResolvedValueOnce([]);
    prisma.client.user.count.mockResolvedValueOnce(0);

    await service.search("user-1", {});

    const whereArg = prisma.client.user.findMany.mock.calls[0][0].where;
    expect(whereArg.id).toEqual({ not: "user-1" });
  });

  it("only ever queries ACTIVE users, never suspended/banned/deleted ones", async () => {
    prisma.client.user.findMany.mockResolvedValueOnce([]);
    prisma.client.user.count.mockResolvedValueOnce(0);

    await service.search("user-1", {});

    expect(prisma.client.user.findMany.mock.calls[0][0].where.status).toBe("ACTIVE");
  });

  it("projects results to a narrow shape that never includes aboutMe or other sensitive fields", async () => {
    prisma.client.user.findMany.mockResolvedValueOnce([userWithProfile()]);
    prisma.client.user.count.mockResolvedValueOnce(1);

    const result = await service.search("user-1", {});

    expect(result.results).toHaveLength(1);
    const [profile] = result.results;
    expect(profile).not.toHaveProperty("aboutMe");
    expect(profile).toEqual({
      profileId: "profile-2",
      firstName: "Ananya",
      age: 35,
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      education: "MBA",
      profession: "Product Manager",
      heightCm: 160,
      religion: "Hindu",
      previousMarriage: { previouslyMarried: true, divorceFinalized: true },
    });
  });

  it("computes an inclusive age-range dateOfBirth filter from minAge/maxAge", async () => {
    prisma.client.user.findMany.mockResolvedValueOnce([]);
    prisma.client.user.count.mockResolvedValueOnce(0);

    await service.search("user-1", { minAge: 30, maxAge: 40 });

    const dobFilter = prisma.client.user.findMany.mock.calls[0][0].where.dateOfBirth;
    const now = new Date();
    expect(dobFilter.lte.getFullYear()).toBe(now.getFullYear() - 30);
    expect(dobFilter.gte.getFullYear()).toBe(now.getFullYear() - 41);
  });

  it("paginates using page/pageSize, defaulting sensibly when omitted", async () => {
    prisma.client.user.findMany.mockResolvedValueOnce([]);
    prisma.client.user.count.mockResolvedValueOnce(0);

    const result = await service.search("user-1", { page: 2, pageSize: 10 });

    expect(prisma.client.user.findMany.mock.calls[0][0].skip).toBe(10);
    expect(prisma.client.user.findMany.mock.calls[0][0].take).toBe(10);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
  });

  it("filters by city case-insensitively via the nested profile.is clause", async () => {
    prisma.client.user.findMany.mockResolvedValueOnce([]);
    prisma.client.user.count.mockResolvedValueOnce(0);

    await service.search("user-1", { city: "Pune" });

    const profileFilter = prisma.client.user.findMany.mock.calls[0][0].where.profile.is;
    expect(profileFilter.city).toEqual({ equals: "Pune", mode: "insensitive" });
  });
});
