import { HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.module";
import { AppException } from "@/common/errors/app-exception";
import { ErrorCode } from "@/common/errors/error-codes";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "@divorcedsathi/db";
import type { Interest } from "@divorcedsathi/db";

@Injectable()
export class InterestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async send(senderId: string, recipientId: string): Promise<Interest> {
    if (senderId === recipientId) {
      throw new AppException(ErrorCode.CANNOT_TARGET_SELF, "You can't send an interest to yourself.", HttpStatus.BAD_REQUEST);
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
