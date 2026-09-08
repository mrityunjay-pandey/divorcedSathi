import { HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.module";
import { AppException } from "@/common/errors/app-exception";
import { ErrorCode } from "@/common/errors/error-codes";
import type { Block } from "@divorcedsathi/db";

@Injectable()
export class BlockService {
  constructor(private readonly prisma: PrismaService) {}

  async block(blockerId: string, blockedUserId: string): Promise<Block> {
    if (blockerId === blockedUserId) {
      throw new AppException(ErrorCode.CANNOT_TARGET_SELF, "You can't block yourself.", HttpStatus.BAD_REQUEST);
    }
    const existing = await this.prisma.client.block.findUnique({
      where: { blockerId_blockedUserId: { blockerId, blockedUserId } },
    });
    if (existing) {
      throw new AppException(ErrorCode.ALREADY_BLOCKED, "You've already blocked this user.", HttpStatus.CONFLICT);
    }
    return this.prisma.client.block.create({ data: { blockerId, blockedUserId } });
  }

  /** Idempotent — unblocking someone not blocked is a no-op, matching Shortlist's precedent. */
  async unblock(blockerId: string, blockedUserId: string): Promise<void> {
    await this.prisma.client.block.deleteMany({ where: { blockerId, blockedUserId } });
  }

  async listBlockedByUser(userId: string): Promise<Block[]> {
    return this.prisma.client.block.findMany({ where: { blockerId: userId }, orderBy: { createdAt: "desc" } });
  }

  /**
   * The enforcement primitive: true if EITHER user has blocked the other.
   * Every consuming module (Interests, Messaging, Search, Discovery) calls
   * this rather than querying the Block table directly, so the "mutual
   * non-contact regardless of who initiated" semantic lives in one place.
   */
  async isBlockedEitherDirection(userIdA: string, userIdB: string): Promise<boolean> {
    const block = await this.prisma.client.block.findFirst({
      where: {
        OR: [
          { blockerId: userIdA, blockedUserId: userIdB },
          { blockerId: userIdB, blockedUserId: userIdA },
        ],
      },
    });
    return !!block;
  }

  /** All user ids blocked from (or having blocked) the given user, for excluding from list queries. */
  async listRelatedUserIds(userId: string): Promise<string[]> {
    const blocks = await this.prisma.client.block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedUserId: userId }] },
    });
    return blocks.map((b) => (b.blockerId === userId ? b.blockedUserId : b.blockerId));
  }
}
