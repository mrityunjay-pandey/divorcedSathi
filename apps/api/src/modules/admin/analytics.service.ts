import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.module";

export interface AnalyticsSnapshot {
  profileCompletionRate: number | null;
  verificationConversionRate: number | null;
  interestAcceptanceRate: number | null;
  connectionRate: number | null;
  subscriptionConversionRate: number | null;
  totalModerationActionsTaken: number;
}

/** Safe ratio: null (not 0 or NaN) when there's no denominator, so the UI can render "not enough data" instead of a misleading 0%. */
function ratio(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10; // one decimal place
}

/**
 * Deliberately narrow, per brief §46's own instruction: "Do not collect
 * unnecessary analytics data." Everything here is derived from data the
 * app already stores for a functional reason (profiles, verifications,
 * interests, matches, subscriptions, audit logs) — nothing new is
 * tracked solely for analytics purposes. Registration-funnel conversion
 * and retention from brief §46 are NOT included: both need visit/session
 * tracking that doesn't exist and would be new data collection purely
 * for analytics, which the brief's own instruction argues against adding
 * lightly.
 */
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSnapshot(): Promise<AnalyticsSnapshot> {
    const [
      totalUsers,
      usersWithProfile,
      approvedVerifications,
      decidedVerifications,
      acceptedInterests,
      decidedInterests,
      totalInterests,
      totalMatches,
      premiumSubscriptions,
      totalAuditLogEntries,
    ] = await Promise.all([
      this.prisma.client.user.count(),
      this.prisma.client.user.count({ where: { profile: { isNot: null } } }),
      this.prisma.client.verification.count({ where: { status: "APPROVED" } }),
      this.prisma.client.verification.count({ where: { status: { in: ["APPROVED", "REJECTED"] } } }),
      this.prisma.client.interest.count({ where: { status: "ACCEPTED" } }),
      this.prisma.client.interest.count({ where: { status: { in: ["ACCEPTED", "DECLINED"] } } }),
      this.prisma.client.interest.count(),
      this.prisma.client.match.count(),
      this.prisma.client.subscription.count({ where: { plan: "PREMIUM", status: "ACTIVE" } }),
      this.prisma.client.auditLog.count(),
    ]);

    return {
      profileCompletionRate: ratio(usersWithProfile, totalUsers),
      verificationConversionRate: ratio(approvedVerifications, decidedVerifications),
      interestAcceptanceRate: ratio(acceptedInterests, decidedInterests),
      connectionRate: ratio(totalMatches, totalInterests),
      subscriptionConversionRate: ratio(premiumSubscriptions, totalUsers),
      totalModerationActionsTaken: totalAuditLogEntries,
    };
  }
}
