import { Test } from "@nestjs/testing";
import { VerificationService } from "./verification.service";
import { PrismaService } from "@/common/prisma/prisma.module";
import { NotificationsService } from "../notifications/notifications.service";
import { AuditLogService } from "../admin/audit-log.service";
import { ErrorCode } from "@/common/errors/error-codes";
import { NotificationType, type User, type Verification } from "@divorcedsathi/db";

type MockPrisma = {
  client: {
    user: { findUnique: jest.Mock };
    verification: { findFirst: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; findMany: jest.Mock };
  };
};

function baseVerification(overrides: Partial<Verification> = {}): Verification {
  return {
    id: "ver-1",
    userId: "user-1",
    status: "PENDING" as Verification["status"],
    documentStorageKey: "s3://bucket/key",
    submittedAt: new Date(),
    reviewedAt: null,
    reviewedByAdminId: null,
    rejectionReason: null,
    ...overrides,
  };
}

describe("VerificationService", () => {
  let service: VerificationService;
  let prisma: MockPrisma;
  let notifications: { create: jest.Mock };
  let auditLog: { record: jest.Mock };

  beforeEach(async () => {
    prisma = {
      client: {
        user: { findUnique: jest.fn() },
        verification: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
      },
    };
    notifications = { create: jest.fn() };
    auditLog = { record: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        VerificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: AuditLogService, useValue: auditLog },
      ],
    }).compile();

    service = moduleRef.get(VerificationService);
  });

  describe("submitIdVerification", () => {
    it("allows a first-time submission", async () => {
      prisma.client.verification.findFirst.mockResolvedValueOnce(null);
      prisma.client.verification.create.mockResolvedValueOnce(baseVerification());

      await service.submitIdVerification("user-1", "s3://key");

      expect(prisma.client.verification.create).toHaveBeenCalledWith({ data: { userId: "user-1", documentStorageKey: "s3://key" } });
    });

    it("rejects a second submission while one is still PENDING", async () => {
      prisma.client.verification.findFirst.mockResolvedValueOnce(baseVerification({ status: "PENDING" as Verification["status"] }));

      await expect(service.submitIdVerification("user-1", "s3://key")).rejects.toMatchObject({
        code: ErrorCode.VERIFICATION_ALREADY_PENDING,
      });
      expect(prisma.client.verification.create).not.toHaveBeenCalled();
    });

    it("rejects a submission once already APPROVED", async () => {
      prisma.client.verification.findFirst.mockResolvedValueOnce(baseVerification({ status: "APPROVED" as Verification["status"] }));

      await expect(service.submitIdVerification("user-1", "s3://key")).rejects.toMatchObject({
        code: ErrorCode.VERIFICATION_ALREADY_APPROVED,
      });
    });

    it("allows resubmission after a REJECTED verification", async () => {
      prisma.client.verification.findFirst.mockResolvedValueOnce(baseVerification({ status: "REJECTED" as Verification["status"] }));
      prisma.client.verification.create.mockResolvedValueOnce(baseVerification());

      await service.submitIdVerification("user-1", "s3://new-key");

      expect(prisma.client.verification.create).toHaveBeenCalledWith({ data: { userId: "user-1", documentStorageKey: "s3://new-key" } });
    });
  });

  describe("getBadgesForUser", () => {
    it("reflects mobile/email from User and identity from the latest Verification", async () => {
      prisma.client.user.findUnique.mockResolvedValueOnce({ mobileVerifiedAt: new Date(), emailVerifiedAt: null } as User);
      prisma.client.verification.findFirst.mockResolvedValueOnce(baseVerification({ status: "APPROVED" as Verification["status"] }));

      const badges = await service.getBadgesForUser("user-1");

      expect(badges).toEqual({
        mobileVerified: true,
        emailVerified: false,
        identityVerified: true,
        identityStatus: "APPROVED",
      });
    });

    it("reports identityStatus NONE when no verification has ever been submitted", async () => {
      prisma.client.user.findUnique.mockResolvedValueOnce({ mobileVerifiedAt: null, emailVerifiedAt: null } as User);
      prisma.client.verification.findFirst.mockResolvedValueOnce(null);

      const badges = await service.getBadgesForUser("user-1");

      expect(badges.identityStatus).toBe("NONE");
      expect(badges.identityVerified).toBe(false);
    });
  });

  describe("admin review", () => {
    it("approve() throws for a nonexistent verification", async () => {
      prisma.client.verification.findUnique.mockResolvedValueOnce(null);

      await expect(service.approve("nonexistent", "admin-1")).rejects.toMatchObject({ code: ErrorCode.VERIFICATION_NOT_FOUND });
    });

    it("rejects reviewing a verification that's already been decided", async () => {
      prisma.client.verification.findUnique.mockResolvedValueOnce(baseVerification({ status: "APPROVED" as Verification["status"] }));

      await expect(service.approve("ver-1", "admin-1")).rejects.toMatchObject({ code: ErrorCode.VERIFICATION_NOT_PENDING });
    });

    it("approve() records the reviewing admin and notifies the subject", async () => {
      prisma.client.verification.findUnique.mockResolvedValueOnce(baseVerification());
      prisma.client.verification.update.mockResolvedValueOnce(baseVerification({ status: "APPROVED" as Verification["status"] }));

      await service.approve("ver-1", "admin-1");

      expect(prisma.client.verification.update).toHaveBeenCalledWith({
        where: { id: "ver-1" },
        data: { status: "APPROVED", reviewedAt: expect.any(Date), reviewedByAdminId: "admin-1" },
      });
      expect(notifications.create).toHaveBeenCalledWith(
        "user-1",
        NotificationType.VERIFICATION_COMPLETED,
        expect.objectContaining({ result: "APPROVED" }),
      );
      expect(auditLog.record).toHaveBeenCalledWith("admin-1", "VERIFICATION_APPROVED", "Verification", "ver-1");
    });

    it("reject() stores the rejection reason and notifies the subject", async () => {
      prisma.client.verification.findUnique.mockResolvedValueOnce(baseVerification());
      prisma.client.verification.update.mockResolvedValueOnce(baseVerification({ status: "REJECTED" as Verification["status"] }));

      await service.reject("ver-1", "admin-1", "Document was blurry");

      expect(prisma.client.verification.update).toHaveBeenCalledWith({
        where: { id: "ver-1" },
        data: { status: "REJECTED", reviewedAt: expect.any(Date), reviewedByAdminId: "admin-1", rejectionReason: "Document was blurry" },
      });
      expect(auditLog.record).toHaveBeenCalledWith("admin-1", "VERIFICATION_REJECTED", "Verification", "ver-1", { reason: "Document was blurry" });
    });
  });
});
