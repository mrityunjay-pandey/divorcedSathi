import { Test } from "@nestjs/testing";
import { AdminService } from "./admin.service";
import { PrismaService } from "@/common/prisma/prisma.module";
import { AuditLogService } from "./audit-log.service";
import { ErrorCode } from "@/common/errors/error-codes";
import type { User } from "@divorcedsathi/db";

type MockPrisma = {
  client: {
    user: { count: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    verification: { count: jest.Mock };
    report: { count: jest.Mock };
    interest: { count: jest.Mock };
    match: { count: jest.Mock };
  };
};

function baseUser(overrides: Partial<User> = {}): User {
  return { id: "user-1", firstName: "Test", status: "ACTIVE" as User["status"], ...overrides } as User;
}

describe("AdminService", () => {
  let service: AdminService;
  let prisma: MockPrisma;
  let auditLog: { record: jest.Mock };

  beforeEach(async () => {
    prisma = {
      client: {
        user: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
        verification: { count: jest.fn() },
        report: { count: jest.fn() },
        interest: { count: jest.fn() },
        match: { count: jest.fn() },
      },
    };
    auditLog = { record: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [AdminService, { provide: PrismaService, useValue: prisma }, { provide: AuditLogService, useValue: auditLog }],
    }).compile();

    service = moduleRef.get(AdminService);
  });

  describe("getDashboardStats", () => {
    it("composes counts from every relevant table into one object", async () => {
      prisma.client.user.count
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(5) // newRegistrations7d
        .mockResolvedValueOnce(3); // suspendedAccounts
      prisma.client.verification.count.mockResolvedValueOnce(40).mockResolvedValueOnce(2); // verified, pending
      prisma.client.report.count.mockResolvedValueOnce(7);
      prisma.client.interest.count.mockResolvedValueOnce(200);
      prisma.client.match.count.mockResolvedValueOnce(50);

      const stats = await service.getDashboardStats();

      expect(stats).toEqual({
        totalUsers: 100,
        newRegistrations7d: 5,
        verifiedUsers: 40,
        suspendedAccounts: 3,
        pendingVerifications: 2,
        pendingReports: 7,
        interestsSent: 200,
        connections: 50,
      });
    });
  });

  describe("getUserDetail", () => {
    it("throws for a nonexistent user", async () => {
      prisma.client.user.findUnique.mockResolvedValueOnce(null);

      await expect(service.getUserDetail("nonexistent")).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
    });
  });

  describe("account status actions — every one is audit-logged", () => {
    it("suspendUser() updates status and logs the action with the reason", async () => {
      prisma.client.user.update.mockResolvedValueOnce(baseUser({ status: "SUSPENDED" as User["status"] }));

      await service.suspendUser("admin-1", "user-2", "Multiple reports");

      expect(prisma.client.user.update).toHaveBeenCalledWith({ where: { id: "user-2" }, data: { status: "SUSPENDED" } });
      expect(auditLog.record).toHaveBeenCalledWith("admin-1", "USER_SUSPENDED", "User", "user-2", { reason: "Multiple reports" });
    });

    it("banUser() updates status and logs the action", async () => {
      prisma.client.user.update.mockResolvedValueOnce(baseUser({ status: "BANNED" as User["status"] }));

      await service.banUser("admin-1", "user-2", "Confirmed scam");

      expect(prisma.client.user.update).toHaveBeenCalledWith({ where: { id: "user-2" }, data: { status: "BANNED" } });
      expect(auditLog.record).toHaveBeenCalledWith("admin-1", "USER_BANNED", "User", "user-2", { reason: "Confirmed scam" });
    });

    it("reactivateUser() restores ACTIVE status and logs the action without requiring a reason", async () => {
      prisma.client.user.update.mockResolvedValueOnce(baseUser({ status: "ACTIVE" as User["status"] }));

      await service.reactivateUser("admin-1", "user-2");

      expect(prisma.client.user.update).toHaveBeenCalledWith({ where: { id: "user-2" }, data: { status: "ACTIVE" } });
      expect(auditLog.record).toHaveBeenCalledWith("admin-1", "USER_REACTIVATED", "User", "user-2");
    });
  });
});
