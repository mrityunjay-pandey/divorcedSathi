import { Injectable } from "@nestjs/common";
import { createHash, randomInt } from "node:crypto";
import { PrismaService } from "@/common/prisma/prisma.module";
import { AppException } from "@/common/errors/app-exception";
import { ErrorCode } from "@/common/errors/error-codes";
import { HttpStatus } from "@nestjs/common";
import { AuthIdentifierType, OtpPurpose } from "@divorcedsathi/db";

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

/**
 * OTP codes are short-lived, single-use, and rate-limited by attempt count —
 * SHA-256 (not argon2) is intentional here: these are high-volume,
 * low-entropy (6 digits), short-TTL secrets, so a fast hash plus attempt
 * limiting is the appropriate control, not a slow KDF meant for
 * long-lived passwords.
 */
@Injectable()
export class OtpService {
  constructor(private readonly prisma: PrismaService) {}

  private hashCode(code: string): string {
    return createHash("sha256").update(code).digest("hex");
  }

  private generateCode(): string {
    return randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
  }

  async issue(params: {
    identifier: string;
    identifierType: AuthIdentifierType;
    purpose: OtpPurpose;
    userId?: string;
  }): Promise<string> {
    const code = this.generateCode();
    await this.prisma.client.otpCode.create({
      data: {
        identifier: params.identifier,
        identifierType: params.identifierType,
        purpose: params.purpose,
        userId: params.userId,
        codeHash: this.hashCode(code),
        maxAttempts: MAX_ATTEMPTS,
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000),
      },
    });
    return code;
  }

  async verify(params: {
    identifier: string;
    purpose: OtpPurpose;
    code: string;
  }): Promise<void> {
    const record = await this.prisma.client.otpCode.findFirst({
      where: {
        identifier: params.identifier,
        purpose: params.purpose,
        consumedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      throw new AppException(ErrorCode.OTP_INVALID, "This code is invalid. Request a new one.", HttpStatus.BAD_REQUEST);
    }

    if (record.expiresAt.getTime() < Date.now()) {
      throw new AppException(ErrorCode.OTP_EXPIRED, "This code has expired. Request a new one.", HttpStatus.BAD_REQUEST);
    }

    if (record.attempts >= record.maxAttempts) {
      throw new AppException(
        ErrorCode.OTP_MAX_ATTEMPTS,
        "Too many incorrect attempts. Request a new code.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const isMatch = record.codeHash === this.hashCode(params.code);

    if (!isMatch) {
      await this.prisma.client.otpCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new AppException(ErrorCode.OTP_INVALID, "That code doesn't match. Please try again.", HttpStatus.BAD_REQUEST);
    }

    await this.prisma.client.otpCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
  }
}
