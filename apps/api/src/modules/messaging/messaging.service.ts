import { HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.module";
import { AppException } from "@/common/errors/app-exception";
import { ErrorCode } from "@/common/errors/error-codes";
import { NotificationsService } from "../notifications/notifications.service";
import { BlockService } from "../safety/block.service";
import { NotificationType } from "@divorcedsathi/db";
import type { Conversation, Match, Message } from "@divorcedsathi/db";

function assertParticipant(match: Match, userId: string): void {
  if (match.userAId !== userId && match.userBId !== userId) {
    throw new AppException(ErrorCode.NOT_MATCH_PARTICIPANT, "You're not part of this match.", HttpStatus.FORBIDDEN);
  }
}

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly blocks: BlockService,
  ) {}

  /**
   * Conversations are created lazily on first access rather than eagerly
   * the moment a Match exists — a Match with no messages yet doesn't need
   * a Conversation row taking up space, and this keeps Module 9 (Interests)
   * and Module 10 (Messaging) decoupled: Interests never has to know
   * Conversation exists.
   */
  async getOrCreateConversationForMatch(matchId: string, userId: string): Promise<Conversation> {
    const match = await this.prisma.client.match.findUnique({ where: { id: matchId } });
    if (!match) {
      throw new AppException(ErrorCode.MATCH_NOT_FOUND, "Match not found.", HttpStatus.NOT_FOUND);
    }
    assertParticipant(match, userId);

    const existing = await this.prisma.client.conversation.findUnique({ where: { matchId } });
    if (existing) return existing;

    return this.prisma.client.conversation.create({ data: { matchId } });
  }

  private async requireParticipantConversation(conversationId: string, userId: string): Promise<Conversation & { match: Match }> {
    const conversation = await this.prisma.client.conversation.findUnique({
      where: { id: conversationId },
      include: { match: true },
    });
    if (!conversation) {
      throw new AppException(ErrorCode.CONVERSATION_NOT_FOUND, "Conversation not found.", HttpStatus.NOT_FOUND);
    }
    if (conversation.match.userAId !== userId && conversation.match.userBId !== userId) {
      throw new AppException(ErrorCode.NOT_CONVERSATION_PARTICIPANT, "You're not part of this conversation.", HttpStatus.FORBIDDEN);
    }
    return conversation;
  }

  async sendMessage(conversationId: string, senderId: string, content: string): Promise<Message> {
    const conversation = await this.requireParticipantConversation(conversationId, senderId);

    const recipientId = conversation.match.userAId === senderId ? conversation.match.userBId : conversation.match.userAId;

    // A block created AFTER a match already exists (e.g. one party blocks
    // the other mid-conversation) must still stop new messages — checked
    // fresh on every send, not just once at match/conversation creation.
    if (await this.blocks.isBlockedEitherDirection(senderId, recipientId)) {
      throw new AppException(ErrorCode.BLOCKED, "You can't message this user.", HttpStatus.FORBIDDEN);
    }

    const message = await this.prisma.client.message.create({ data: { conversationId, senderId, content } });
    await this.notifications.create(recipientId, NotificationType.NEW_MESSAGE, { conversationId, messageId: message.id });

    return message;
  }

  async listMessages(conversationId: string, userId: string): Promise<Message[]> {
    await this.requireParticipantConversation(conversationId, userId);
    return this.prisma.client.message.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } });
  }

  /** Marks every message from the other participant as read — never the caller's own messages. */
  async markRead(conversationId: string, userId: string): Promise<{ count: number }> {
    await this.requireParticipantConversation(conversationId, userId);
    return this.prisma.client.message.updateMany({
      where: { conversationId, senderId: { not: userId }, readAt: null },
      data: { readAt: new Date() },
    });
  }

  /**
   * Deletes the conversation and its messages for both participants — this
   * is a shared-thread MVP, not a per-user "delete for me" (that would need
   * a per-participant visibility flag, which isn't modeled yet). Documented
   * in the wizard/UI copy so it isn't a silent surprise.
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    await this.requireParticipantConversation(conversationId, userId);
    await this.prisma.client.conversation.delete({ where: { id: conversationId } });
  }
}
