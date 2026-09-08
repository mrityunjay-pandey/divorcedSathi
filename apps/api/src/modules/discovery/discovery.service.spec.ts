import { Test } from "@nestjs/testing";
import { DiscoveryService } from "./discovery.service";
import { PrismaService } from "@/common/prisma/prisma.module";
import { PreviousMarriageService } from "../family/previous-marriage.service";
import type { PartnerPreference, Profile, User } from "@divorcedsathi/db";

type MockPrisma = {
  client: {
    partnerPreference: { findFirst: jest.Mock };
    user: { findMany: jest.Mock };
  };
};

function candidateUser(
  id: string,
  overrides: Partial<User> & { profile?: Partial<Profile> & { familyDetails?: unknown } } = {},
): User & { profile: Profile & { familyDetails: unknown } } {
  const { profile: profileOverrides, ...userOverrides } = overrides;
  return {
    id,
    firstName: `Candidate-${id}`,
    lastName: null,
    email: `${id}@example.com`,
    mobileNumber: null,
    passwordHash: "irrelevant",
    dateOfBirth: new Date(new Date().getFullYear() - 35, 0, 1),
    gender: "FEMALE" as User["gender"],
    city: "Pune",
    marriageStatus: "DIVORCED" as User["marriageStatus"],
    emailVerifiedAt: new Date(),
    mobileVerifiedAt: null,
    role: "USER" as User["role"],
    status: "ACTIVE" as User["status"],
    createdAt: new Date(),
    updatedAt: new Date(),
    profile: {
      id: `profile-${id}`,
      userId: id,
      heightCm: null,
      city: "Pune",
      state: "Maharashtra",
      country: "India",
      motherTongue: null,
      religion: null,
      community: null,
      education: "MBA",
      profession: "Engineer",
      employmentType: null,
      incomeRange: null,
      aboutMe: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      familyDetails: null,
      ...profileOverrides,
    },
    ...userOverrides,
  } as User & { profile: Profile & { familyDetails: unknown } };
}

describe("DiscoveryService", () => {
  let service: DiscoveryService;
  let prisma: MockPrisma;
  let previousMarriage: { getPublicSummaryByProfileId: jest.Mock };

  beforeEach(async () => {
    prisma = { client: { partnerPreference: { findFirst: jest.fn() }, user: { findMany: jest.fn() } } };
    previousMarriage = { getPublicSummaryByProfileId: jest.fn().mockResolvedValue(null) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DiscoveryService,
        { provide: PrismaService, useValue: prisma },
        { provide: PreviousMarriageService, useValue: previousMarriage },
      ],
    }).compile();

    service = moduleRef.get(DiscoveryService);
  });

  it("gives every candidate a null compatibility score when the viewer has no PartnerPreference yet", async () => {
    prisma.client.partnerPreference.findFirst.mockResolvedValue(null);
    prisma.client.user.findMany.mockResolvedValue([candidateUser("a"), candidateUser("b")]);

    const dashboard = await service.getDashboard("viewer-1");

    expect(dashboard.recommended.every((c) => c.compatibility === null)).toBe(true);
    expect(dashboard.recommended).toHaveLength(2);
  });

  it("sorts recommended candidates by compatibility score, highest first", async () => {
    const preference: Partial<PartnerPreference> = {
      ageMin: 30,
      ageMax: 40,
      preferredCities: ["Pune"],
      preferredStates: [],
      preferredCountries: [],
      preferredEducation: [],
      preferredProfessions: [],
      previousMarriagePreferences: [],
      openToAnyMarriageStatus: true,
      childrenPreference: "OPEN_TO_EITHER" as PartnerPreference["childrenPreference"],
    };
    prisma.client.partnerPreference.findFirst.mockResolvedValue(preference);

    // Candidate "far" is outside the age range (scores lower on age);
    // candidate "close" matches everything.
    const close = candidateUser("close");
    const far = candidateUser("far", { dateOfBirth: new Date(new Date().getFullYear() - 60, 0, 1) });
    prisma.client.user.findMany.mockResolvedValue([far, close]);

    const dashboard = await service.getDashboard("viewer-1");

    expect(dashboard.recommended[0]?.profileId).toBe("profile-close");
    expect((dashboard.recommended[0]?.compatibility?.total ?? 0)).toBeGreaterThan(
      dashboard.recommended[1]?.compatibility?.total ?? 0,
    );
  });

  it("excludes the viewer's own id from both the candidate pool query and never double-counts them", async () => {
    prisma.client.partnerPreference.findFirst.mockResolvedValue(null);
    prisma.client.user.findMany.mockResolvedValue([]);

    await service.getDashboard("viewer-1");

    const recommendedWhere = prisma.client.user.findMany.mock.calls[0][0].where;
    expect(recommendedWhere.id).toEqual({ not: "viewer-1" });
  });

  it("new-profiles section never carries a compatibility score, by construction", async () => {
    prisma.client.partnerPreference.findFirst.mockResolvedValue(null);
    prisma.client.user.findMany.mockResolvedValue([candidateUser("a")]);

    const dashboard = await service.getDashboard("viewer-1");

    expect(dashboard.newProfiles.every((c) => c.compatibility === null)).toBe(true);
  });
});
