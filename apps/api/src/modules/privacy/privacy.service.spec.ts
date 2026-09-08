import { Test } from "@nestjs/testing";
import { PrivacyService } from "./privacy.service";
import { PrismaService } from "@/common/prisma/prisma.module";
import { ErrorCode } from "@/common/errors/error-codes";
import { VisibilityLevel, type PrivacySetting, type Profile } from "@divorcedsathi/db";

type MockPrisma = {
  client: {
    profile: { findUnique: jest.Mock };
    privacySetting: { findUnique: jest.Mock; upsert: jest.Mock };
  };
};

function baseProfile(): Profile {
  return { id: "profile-1", userId: "user-1" } as Profile;
}

describe("PrivacyService", () => {
  let service: PrivacyService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = { client: { profile: { findUnique: jest.fn() }, privacySetting: { findUnique: jest.fn(), upsert: jest.fn() } } };
    const moduleRef = await Test.createTestingModule({
      providers: [PrivacyService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(PrivacyService);
  });

  it("requires a profile before reading privacy settings", async () => {
    prisma.client.profile.findUnique.mockResolvedValueOnce(null);

    await expect(service.getForUser("user-without-profile")).rejects.toMatchObject({ code: ErrorCode.PROFILE_NOT_FOUND });
  });

  it("returns sensible schema-matching defaults when no row has been saved yet", async () => {
    prisma.client.profile.findUnique.mockResolvedValueOnce(baseProfile());
    prisma.client.privacySetting.findUnique.mockResolvedValueOnce(null);

    const settings = await service.getForUser("user-1");

    expect(settings).toEqual({
      profileId: "profile-1",
      incomeVisibility: VisibilityLevel.MATCHES,
      contactVisibility: VisibilityLevel.NOBODY,
      divorceDetailsVisibility: VisibilityLevel.MATCHES,
      childrenDetailsVisibility: VisibilityLevel.REGISTERED,
      photoVisibility: VisibilityLevel.REGISTERED,
      requirePhotoRequestApproval: false,
      showLastActiveStatus: true,
      showOnlineStatus: true,
    });
  });

  it("returns the saved row once one exists, not the defaults", async () => {
    prisma.client.profile.findUnique.mockResolvedValueOnce(baseProfile());
    const saved = { profileId: "profile-1", incomeVisibility: VisibilityLevel.NOBODY } as unknown as PrivacySetting;
    prisma.client.privacySetting.findUnique.mockResolvedValueOnce(saved);

    const settings = await service.getForUser("user-1");

    expect(settings).toBe(saved);
  });

  it("upserts scoped to the caller's own resolved profileId, merging defaults on first create", async () => {
    prisma.client.profile.findUnique.mockResolvedValueOnce(baseProfile());
    prisma.client.privacySetting.upsert.mockResolvedValueOnce({} as PrivacySetting);

    await service.updateForUser("user-1", { incomeVisibility: "NOBODY" as const });

    const call = prisma.client.privacySetting.upsert.mock.calls[0][0];
    expect(call.where).toEqual({ profileId: "profile-1" });
    expect(call.create).toMatchObject({ profileId: "profile-1", incomeVisibility: "NOBODY", contactVisibility: VisibilityLevel.NOBODY });
    expect(call.update).toEqual({ incomeVisibility: "NOBODY" as const });
  });
});
