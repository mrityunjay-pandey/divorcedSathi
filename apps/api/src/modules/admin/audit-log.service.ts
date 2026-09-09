import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.module";
import type { AuditLog, Prisma } from "@divorcedsathi/db";

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(adminId: string, action: string, targetType: string, targetId: string, metadata?: Prisma.InputJsonValue): Promise<AuditLog> {
    return this.prisma.client.auditLog.create({ data: { adminId, action, targetType, targetId, metadata } });
  }

  async listForTarget(targetType: string, targetId: string): Promise<AuditLog[]> {
    return this.prisma.client.auditLog.findMany({ where: { targetType, targetId }, orderBy: { createdAt: "desc" } });
  }

  async listForAdmin(adminId: string): Promise<AuditLog[]> {
    return this.prisma.client.auditLog.findMany({ where: { adminId }, orderBy: { createdAt: "desc" } });
  }
}