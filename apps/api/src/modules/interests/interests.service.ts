import { HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.module";
import { AppException } from "@/common/errors/app-exception";
import { ErrorCode } from "@/common/errors/error-codes";
import { NotificationsService } from "../notifications/notifications.service";
import { BlockService } from "../safety/block.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { FREE_PLAN_DAILY_INTEREST_LIMIT } from "../subscriptions/plan-config";
import { NotificationType } from "@divorcedsathi/db";
import type { Interest } from "@divorcedsathi/db";

@Injectable()
export class InterestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly blocks: BlockService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async send(senderId: string, recipientId: string): Promise<Interest> {
    if (senderId === recipientId) {
      throw new AppException(ErrorCode.CANNOT_TARGET_SELF, "You can't send an interest to yourself.", HttpStatus.BAD_REQUEST);
    }

    if (await this.blocks.isBlockedEitherDirection(senderId, recipientId)) {
      // Same generic phrasing as if the profile simply didn't exist — never
      // confirm to the sender that a block is the specific reason, which
      // would leak the block's existence back to the blocked party.
      throw new AppException(ErrorCode.NOT_FOUND, "This profile isn't available.", HttpStatus.NOT_FOUND);
    }

    // "Unlimited interests" (brief §32) is the Premium feature this
    // enforces — Free plan gets a real daily cap, never a safety feature
    // (blocking/reporting/messaging-with-an-existing-match are never
    // gated, only this discovery-adjacent action).
    if (!(await this.subscriptions.isOnPremium(senderId))) {
      const since = new Date(Date.now() - 24 * 60 * 60_000);
      const sentToday = await this.prisma.client.interest.count({ where: { senderId, createdAt: { gte: since } } });
      if (sentToday >= FREE_PLAN_DAILY_INTEREST_LIMIT) {
        throw new AppException(
          ErrorCode.DAILY_INTEREST_LIMIT_REACHED,
          `You've reached today's limit of ${FREE_PLAN_DAILY_INTEREST_LIMIT} interests on the Free plan. Upgrade to Premium for unlimited interests.`,
          HttpStatus.FORBIDDEN,
        );
      }
    }

    const existing = await this.prisma.client.interest.findUnique({
      where: { senderId_recipientId: { senderId, recipientId } },
    });
    if (existing) {
      throw new AppException(ErrorCode.INTEREST_ALREADY_SENT, "You've already sent an interest to this profile.", HttpStatus.CONFLICT);
    }

    const interest = await this.prisma.client.interest.create({ data: { senderId, recipientId } });
    await this.notifications.create(recipientId, NotificationType.INTEREST_RECEIVED, { interestId: interest.id, fromUserId: senderId });
    return interest;
  }

  async listReceived(userId: string): Promise<Interest[]> {
    return this.prisma.client.interest.findMany({ where: { recipientId: userId }, orderBy: { createdAt: "desc" } });
  }

  async listSent(userId: string): Promise<Interest[]> {
    return this.prisma.client.interest.findMany({ where: { senderId: userId }, orderBy: { createdAt: "desc" } });
  }

  /**
   * Only the recipient may respond — checked here rather than trusted from
   * the request, since the interest id alone would otherwise let anyone
   * who guesses/enumerates it accept or decline on someone else's behalf.
   * Acceptance creates the Match in the same transaction as the status
   * update, so the two can never diverge (an accepted interest with no
   * match, or vice versa).
   */
  async respond(interestId: string, respondingUserId: string, response: "ACCEPTED" | "DECLINED"): Promise<Interest> {
    const interest = await this.prisma.client.interest.findUnique({ where: { id: interestId } });
    if (!interest) {
      throw new AppException(ErrorCode.INTEREST_NOT_FOUND, "Interest not found.", HttpStatus.NOT_FOUND);
    }
    if (interest.recipientId !== respondingUserId) {
      throw new AppException(ErrorCode.NOT_INTEREST_RECIPIENT, "Only the recipient can respond to this interest.", HttpStatus.FORBIDDEN);
    }
    if (interest.status !== "PENDING") {
      throw new AppException(ErrorCode.INTEREST_ALREADY_RESPONDED, "This interest has already been responded to.", HttpStatus.CONFLICT);
    }

    if (response === "DECLINED") {
      return this.prisma.client.interest.update({
        where: { id: interestId },
        data: { status: "DECLINED", respondedAt: new Date() },
      });
    }

    // Store the pair in a canonical order so the Match.@@unique([userAId,
    // userBId]) constraint catches a duplicate regardless of who initiated.
    const [userAId, userBId] = [interest.senderId, interest.recipientId].sort();

    const [updated] = await this.prisma.client.$transaction([
      this.prisma.client.interest.update({
        where: { id: interestId },
        data: { status: "ACCEPTED", respondedAt: new Date() },
      }),
      this.prisma.client.match.create({
        data: { interestId, userAId, userBId },
      }),
    ]);

    await this.notifications.create(interest.senderId, NotificationType.INTEREST_ACCEPTED, { interestId });

    return updated;
  }
}
