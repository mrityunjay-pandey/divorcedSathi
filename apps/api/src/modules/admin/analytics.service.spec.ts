import { Test } from "@nestjs/testing";
import { AnalyticsService } from "./analytics.service";
import { PrismaService } from "@/common/prisma/prisma.module";

type MockPrisma = {
  client: {
    user: { count: jest.Mock };
    verification: { count: jest.Mock };
    interest: { count: jest.Mock };
    match: { count: jest.Mock };
    subscription: { count: jest.Mock };
    auditLog: { count: jest.Mock };
  };
};

describe("AnalyticsService", () => {
  let service: AnalyticsService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = {
      client: {
        user: { count: jest.fn() },
        verification: { count: jest.fn() },
        interest: { count: jest.fn() },
        match: { count: jest.fn() },
        subscription: { count: jest.fn() },
        auditLog: { count: jest.fn() },
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [AnalyticsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(AnalyticsService);
  });

  it("computes every ratio correctly from raw counts", async () => {
    prisma.client.user.count
      .mockResolvedValueOnce(100) // totalUsers
      .mockResolvedValueOnce(80); // usersWithProfile
    prisma.client.verification.count
      .mockResolvedValueOnce(30) // approved
      .mockResolvedValueOnce(40); // decided (approved+rejected)
    prisma.client.interest.count
      .mockResolvedValueOnce(50) // accepted
      .mockResolvedValueOnce(100) // decided
      .mockResolvedValueOnce(200); // total
    prisma.client.match.count.mockResolvedValueOnce(50);
    prisma.client.subscription.count.mockResolvedValueOnce(20);
    prisma.client.auditLog.count.mockResolvedValueOnce(15);

    const snapshot = await service.getSnapshot();

    expect(snapshot).toEqual({
      profileCompletionRate: 80, // 80/100
      verificationConversionRate: 75, // 30/40
      interestAcceptanceRate: 50, // 50/100
      connectionRate: 25, // 50/200
      subscriptionConversionRate: 20, // 20/100
      totalModerationActionsTaken: 15,
    });
  });

  it("returns null (not 0) for a rate when the denominator is zero — a brand-new platform has no meaningful rate yet", async () => {
    prisma.client.user.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    prisma.client.verification.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    prisma.client.interest.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    prisma.client.match.count.mockResolvedValueOnce(0);
    prisma.client.subscription.count.mockResolvedValueOnce(0);
    prisma.client.auditLog.count.mockResolvedValueOnce(0);

    const snapshot = await service.getSnapshot();

    expect(snapshot.profileCompletionRate).toBeNull();
    expect(snapshot.verificationConversionRate).toBeNull();
    expect(snapshot.interestAcceptanceRate).toBeNull();
    expect(snapshot.connectionRate).toBeNull();
    expect(snapshot.subscriptionConversionRate).toBeNull();
    expect(snapshot.totalModerationActionsTaken).toBe(0);
  });

  it("excludes still-PENDING interests/verifications from the denominator, not just the numerator", async () => {
    prisma.client.user.count.mockResolvedValueOnce(10).mockResolvedValueOnce(10);
    // 5 approved, 5 decided (i.e. all decided ones are approved) even
    // though there might be many more PENDING ones not counted here at all.
    prisma.client.verification.count.mockResolvedValueOnce(5).mockResolvedValueOnce(5);
    prisma.client.interest.count.mockResolvedValueOnce(5).mockResolvedValueOnce(5).mockResolvedValueOnce(50);
    prisma.client.match.count.mockResolvedValueOnce(5);
    prisma.client.subscription.count.mockResolvedValueOnce(0);
    prisma.client.auditLog.count.mockResolvedValueOnce(0);

    const snapshot = await service.getSnapshot();

    // 100%, not diluted by pending items that were never counted in the denominator query at all.
    expect(snapshot.verificationConversionRate).toBe(100);
    expect(snapshot.interestAcceptanceRate).toBe(100);
  });
});
