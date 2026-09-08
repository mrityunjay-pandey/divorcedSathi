import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "@/common/prisma/prisma.module";
import { AppException } from "@/common/errors/app-exception";
import { ErrorCode } from "@/common/errors/error-codes";
import { HttpStatus } from "@nestjs/common";
import type { UserRole } from "@divorcedsathi/db";

const REFRESH_TOKEN_TTL_DAYS = 30;

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Access tokens are short-lived JWTs (stateless, verified by signature).
 * Refresh tokens are opaque random strings; only their hash is persisted,
 * so a database read alone can never yield a usable refresh token — and
 * revoking a row (or all of a user's rows, for "log out everywhere")
 * takes effect immediately, unlike a stateless token.
 */
@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async issueSession(
    userId: string,
    role: UserRole,
    meta: { userAgent?: string; ipAddress?: string } = {},
  ): Promise<IssuedSession> {
    const payload: AccessTokenPayload = { sub: userId, role };
    const accessToken = await this.jwt.signAsync(payload);

    const refreshToken = randomBytes(48).toString("base64url");
    await this.prisma.client.refreshSession.create({
      data: {
        userId,
        tokenHash: hashToken(refreshToken),
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60_000),
      },
    });

    return { accessToken, refreshToken, expiresIn: 15 * 60 };
  }

  /** Rotates the refresh token: the old one is revoked the moment a new one is issued. */
  async rotate(refreshToken: string, meta: { userAgent?: string; ipAddress?: string } = {}): Promise<IssuedSession> {
    const record = await this.prisma.client.refreshSession.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: true },
    });

    if (!record || record.revokedAt || record.expiresAt.getTime() < Date.now()) {
      throw new AppException(ErrorCode.REFRESH_TOKEN_INVALID, "Please log in again.", HttpStatus.UNAUTHORIZED);
    }

    await this.prisma.client.refreshSession.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    return this.issueSession(record.userId, record.user.role, meta);
  }

  async revoke(refreshToken: string): Promise<void> {
    await this.prisma.client.refreshSession.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** "Log out everywhere" — revokes every active session for the user. */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.client.refreshSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
