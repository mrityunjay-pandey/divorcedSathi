import { HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.module";
import { AppException } from "@/common/errors/app-exception";
import { ErrorCode } from "@/common/errors/error-codes";
import { AuditLogService } from "./audit-log.service";
import type { User } from "@divorcedsathi/db";

export interface DashboardStats {
  totalUsers: number;
  newRegistrations7d: number;
  verifiedUsers: number;
  suspendedAccounts: number;
  pendingVerifications: number;
  pendingReports: number;
  interestsSent: number;
  connections: number;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * Deliberately omits "Active users", "Premium users", and "Revenue" from
   * brief §29's list — active-user tracking (last-active) doesn't exist
   * yet (same gap noted in Module 8's Discovery commit), and premium/
   * revenue need Module 16 (Subscriptions & Payments) to exist first.
   * Every number here reflects a feature that's actually been built.
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60_000);

    const [
      totalUsers,
      newRegistrations7d,
      verifiedUsers,
      suspendedAccounts,
      pendingVerifications,
      pendingReports,
      interestsSent,
      connections,
    ] = await Promise.all([
      this.prisma.client.user.count(),
      this.prisma.client.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.client.verification.count({ where: { status: "APPROVED" } }),
      this.prisma.client.user.count({ where: { status: "SUSPENDED" } }),
      this.prisma.client.verification.count({ where: { status: "PENDING" } }),
      this.prisma.client.report.count({ where: { status: "PENDING" } }),
      this.prisma.client.interest.count(),
      this.prisma.client.match.count(),
    ]);

    return {
      totalUsers,
      newRegistrations7d,
      verifiedUsers,
      suspendedAccounts,
      pendingVerifications,
      pendingReports,
      interestsSent,
      connections,
    };
  }

  /** Simple substring match on name/email/mobile — a real search index is a post-MVP concern. */
  async searchUsers(query: string): Promise<User[]> {
    return this.prisma.client.user.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { mobileNumber: { contains: query } },
        ],
      },
      take: 50,
    });
  }

  async getUserDetail(userId: string): Promise<User> {
    const user = await this.prisma.client.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppException(ErrorCode.NOT_FOUND, "User not found.", HttpStatus.NOT_FOUND);
    }
    return user;
  }

  async suspendUser(adminId: string, userId: string, reason?: string): Promise<User> {
    const updated = await this.prisma.client.user.update({ where: { id: userId }, data: { status: "SUSPENDED" } });
    await this.auditLog.record(adminId, "USER_SUSPENDED", "User", userId, { reason });
    return updated;
  }

  async banUser(adminId: string, userId: string, reason?: string): Promise<User> {
    const updated = await this.prisma.client.user.update({ where: { id: userId }, data: { status: "BANNED" } });
    await this.auditLog.record(adminId, "USER_BANNED", "User", userId, { reason });
    return updated;
  }

  /** Reverses a suspension or ban — deliberately named apart from "unban" since it's the same action either way. */
  async reactivateUser(adminId: string, userId: string): Promise<User> {
    const updated = await this.prisma.client.user.update({ where: { id: userId }, data: { status: "ACTIVE" } });
    await this.auditLog.record(adminId, "USER_REACTIVATED", "User", userId);
    return updated;
  }
}
