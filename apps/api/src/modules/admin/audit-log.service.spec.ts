import { Test } from "@nestjs/testing";
import { AuditLogService } from "./audit-log.service";
import { PrismaService } from "@/common/prisma/prisma.module";

type MockPrisma = {
  client: {
    auditLog: { create: jest.Mock; findMany: jest.Mock };
  };
};

describe("AuditLogService", () => {
  let service: AuditLogService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = { client: { auditLog: { create: jest.fn(), findMany: jest.fn() } } };
    const moduleRef = await Test.createTestingModule({
      providers: [AuditLogService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(AuditLogService);
  });

  it("record() persists actor, action, target, and optional metadata", async () => {
    prisma.client.auditLog.create.mockResolvedValueOnce({});

    await service.record("admin-1", "USER_SUSPENDED", "User", "user-2", { reason: "spam" });

    expect(prisma.client.auditLog.create).toHaveBeenCalledWith({
      data: { adminId: "admin-1", action: "USER_SUSPENDED", targetType: "User", targetId: "user-2", metadata: { reason: "spam" } },
    });
  });

  it("record() works without metadata", async () => {
    prisma.client.auditLog.create.mockResolvedValueOnce({});

    await service.record("admin-1", "USER_REACTIVATED", "User", "user-2");

    expect(prisma.client.auditLog.create).toHaveBeenCalledWith({
      data: { adminId: "admin-1", action: "USER_REACTIVATED", targetType: "User", targetId: "user-2", metadata: undefined },
    });
  });

  it("listForTarget() scopes by targetType and targetId", async () => {
    prisma.client.auditLog.findMany.mockResolvedValueOnce([]);

    await service.listForTarget("User", "user-2");

    expect(prisma.client.auditLog.findMany).toHaveBeenCalledWith({
      where: { targetType: "User", targetId: "user-2" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("listForAdmin() scopes by adminId", async () => {
    prisma.client.auditLog.findMany.mockResolvedValueOnce([]);

    await service.listForAdmin("admin-1");

    expect(prisma.client.auditLog.findMany).toHaveBeenCalledWith({
      where: { adminId: "admin-1" },
      orderBy: { createdAt: "desc" },
    });
  });
});
