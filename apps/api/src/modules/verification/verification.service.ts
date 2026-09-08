import { HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.module";
import { AppException } from "@/common/errors/app-exception";
import { ErrorCode } from "@/common/errors/error-codes";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType, type Verification } from "@divorcedsathi/db";

export interface VerificationBadges {
  mobileVerified: boolean;
  emailVerified: boolean;
  identityVerified: boolean;
  identityStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
}

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async latestFor(userId: string): Promise<Verification | null> {
    return this.prisma.client.verification.findFirst({
      where: { userId },
      orderBy: { submittedAt: "desc" },
    });
  }

  async submitIdVerification(userId: string, documentStorageKey: string): Promise<Verification> {
    const latest = await this.latestFor(userId);

    if (latest?.status === "PENDING") {
      throw new AppException(ErrorCode.VERIFICATION_ALREADY_PENDING, "Your identity verification is already under review.", HttpStatus.CONFLICT);
    }
    if (latest?.status === "APPROVED") {
      throw new AppException(ErrorCode.VERIFICATION_ALREADY_APPROVED, "Your identity is already verified.", HttpStatus.CONFLICT);
    }

    // A REJECTED (or no prior) record allows a fresh submission — this
    // intentionally creates a new row rather than updating the rejected
    // one, preserving the rejection as history for admin review context.
    return this.prisma.client.verification.create({ data: { userId, documentStorageKey } });
  }

  async getBadgesForUser(userId: string): Promise<VerificationBadges> {
    const [user, latest] = await Promise.all([
      this.prisma.client.user.findUnique({ where: { id: userId } }),
      this.latestFor(userId),
    ]);

    return {
      mobileVerified: !!user?.mobileVerifiedAt,
      emailVerified: !!user?.emailVerifiedAt,
      identityVerified: latest?.status === "APPROVED",
      identityStatus: latest?.status ?? "NONE",
    };
  }

  async listPendingForAdmin(): Promise<Verification[]> {
    return this.prisma.client.verification.findMany({ where: { status: "PENDING" }, orderBy: { submittedAt: "asc" } });
  }

  async approve(verificationId: string, adminId: string): Promise<Verification> {
    const verification = await this.requirePending(verificationId);
    const updated = await this.prisma.client.verification.update({
      where: { id: verificationId },
      data: { status: "APPROVED", reviewedAt: new Date(), reviewedByAdminId: adminId },
    });
    await this.notifications.create(verification.userId, NotificationType.VERIFICATION_COMPLETED, { verificationId, result: "APPROVED" });
    return updated;
  }

  async reject(verificationId: string, adminId: string, reason?: string): Promise<Verification> {
    const verification = await this.requirePending(verificationId);
    const updated = await this.prisma.client.verification.update({
      where: { id: verificationId },
      data: { status: "REJECTED", reviewedAt: new Date(), reviewedByAdminId: adminId, rejectionReason: reason },
    });
    await this.notifications.create(verification.userId, NotificationType.VERIFICATION_COMPLETED, { verificationId, result: "REJECTED" });
    return updated;
  }

  private async requirePending(verificationId: string): Promise<Verification> {
    const verification = await this.prisma.client.verification.findUnique({ where: { id: verificationId } });
    if (!verification) {
      throw new AppException(ErrorCode.VERIFICATION_NOT_FOUND, "Verification request not found.", HttpStatus.NOT_FOUND);
    }
    if (verification.status !== "PENDING") {
      throw new AppException(ErrorCode.VERIFICATION_NOT_PENDING, "This verification has already been reviewed.", HttpStatus.CONFLICT);
    }
    return verification;
  }
}
