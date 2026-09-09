import { Test } from "@nestjs/testing";
import { ReportService } from "./report.service";
import { PrismaService } from "@/common/prisma/prisma.module";
import { AuditLogService } from "../admin/audit-log.service";
import { ErrorCode } from "@/common/errors/error-codes";
import type { Report } from "@divorcedsathi/db";

type MockPrisma = {
  client: {
    report: { create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
  };
};

function baseReport(overrides: Partial<Report> = {}): Report {
  return {
    id: "report-1",
    reporterId: "user-1",
    reportedUserId: "user-2",
    reason: "HARASSMENT" as Report["reason"],
    description: null,
    status: "PENDING" as Report["status"],
    createdAt: new Date(),
    reviewedAt: null,
    reviewedByAdminId: null,
    ...overrides,
  };
}

describe("ReportService", () => {
  let service: ReportService;
  let prisma: MockPrisma;
  let auditLog: { record: jest.Mock };

  beforeEach(async () => {
    prisma = { client: { report: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() } } };
    auditLog = { record: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [ReportService, { provide: PrismaService, useValue: prisma }, { provide: AuditLogService, useValue: auditLog }],
    }).compile();
    service = moduleRef.get(ReportService);
  });

  it("rejects reporting yourself", async () => {
    await expect(service.create("user-1", { reportedUserId: "user-1", reason: "OTHER" })).rejects.toMatchObject({
      code: ErrorCode.CANNOT_TARGET_SELF,
    });
    expect(prisma.client.report.create).not.toHaveBeenCalled();
  });

  it("creates a report with the given reason and optional description", async () => {
    prisma.client.report.create.mockResolvedValueOnce(baseReport());

    await service.create("user-1", { reportedUserId: "user-2", reason: "SCAM", description: "Asked for money" });

    expect(prisma.client.report.create).toHaveBeenCalledWith({
      data: { reporterId: "user-1", reportedUserId: "user-2", reason: "SCAM", description: "Asked for money" },
    });
  });

  it("updateStatus() throws for a nonexistent report", async () => {
    prisma.client.report.findUnique.mockResolvedValueOnce(null);

    await expect(service.updateStatus("nonexistent", "admin-1", "DISMISSED")).rejects.toMatchObject({
      code: ErrorCode.REPORT_NOT_FOUND,
    });
  });

  it("updateStatus() records the reviewing admin and timestamp", async () => {
    prisma.client.report.findUnique.mockResolvedValueOnce(baseReport());
    prisma.client.report.update.mockResolvedValueOnce(baseReport({ status: "ACTION_TAKEN" as Report["status"] }));

    await service.updateStatus("report-1", "admin-1", "ACTION_TAKEN");

    expect(prisma.client.report.update).toHaveBeenCalledWith({
      where: { id: "report-1" },
      data: { status: "ACTION_TAKEN", reviewedAt: expect.any(Date), reviewedByAdminId: "admin-1" },
    });
    expect(auditLog.record).toHaveBeenCalledWith("admin-1", "REPORT_ACTION_TAKEN", "Report", "report-1");
  });

  it("listForAdmin() only returns PENDING reports, oldest first for FIFO triage", async () => {
    prisma.client.report.findMany.mockResolvedValueOnce([]);

    await service.listForAdmin();

    expect(prisma.client.report.findMany).toHaveBeenCalledWith({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" } });
  });
});
