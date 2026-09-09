import { HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.module";
import { AppException } from "@/common/errors/app-exception";
import { ErrorCode } from "@/common/errors/error-codes";
import { AuditLogService } from "../admin/audit-log.service";
import type { CreateReportDto } from "./dto/safety.dto";
import type { Report } from "@divorcedsathi/db";

@Injectable()
export class ReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(reporterId: string, dto: CreateReportDto): Promise<Report> {
    if (reporterId === dto.reportedUserId) {
      throw new AppException(ErrorCode.CANNOT_TARGET_SELF, "You can't report yourself.", HttpStatus.BAD_REQUEST);
    }
    return this.prisma.client.report.create({
      data: { reporterId, reportedUserId: dto.reportedUserId, reason: dto.reason, description: dto.description },
    });
  }

  async listForAdmin(): Promise<Report[]> {
    return this.prisma.client.report.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" } });
  }

  async updateStatus(reportId: string, adminId: string, status: "REVIEWED" | "ACTION_TAKEN" | "DISMISSED"): Promise<Report> {
    const report = await this.prisma.client.report.findUnique({ where: { id: reportId } });
    if (!report) {
      throw new AppException(ErrorCode.REPORT_NOT_FOUND, "Report not found.", HttpStatus.NOT_FOUND);
    }
    const updated = await this.prisma.client.report.update({
      where: { id: reportId },
      data: { status, reviewedAt: new Date(), reviewedByAdminId: adminId },
    });
    await this.auditLog.record(adminId, `REPORT_${status}`, "Report", reportId);
    return updated;
  }
}
