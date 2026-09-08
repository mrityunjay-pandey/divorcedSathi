import { Test } from "@nestjs/testing";
import { MessagingService } from "./messaging.service";
import { PrismaService } from "@/common/prisma/prisma.module";
import { ErrorCode } from "@/common/errors/error-codes";
import type { Conversation, Match, Message } from "@divorcedsathi/db";

type MockPrisma = {
  client: {
    match: { findUnique: jest.Mock };
    conversation: { findUnique: jest.Mock; create: jest.Mock; delete: jest.Mock };
    message: { create: jest.Mock; findMany: jest.Mock; updateMany: jest.Mock };
  };
};

function baseMatch(overrides: Partial<Match> = {}): Match {
  return { id: "match-1", interestId: "interest-1", userAId: "user-1", userBId: "user-2", createdAt: new Date(), ...overrides };
}

function baseConversation(overrides: Partial<Conversation> = {}): Conversation {
  return { id: "conv-1", matchId: "match-1", createdAt: new Date(), ...overrides };
}

describe("MessagingService", () => {
  let service: MessagingService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = {
      client: {
        match: { findUnique: jest.fn() },
        conversation: { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() },
        message: { create: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [MessagingService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(MessagingService);
  });

  describe("getOrCreateConversationForMatch", () => {
    it("rejects a user who isn't part of the match", async () => {
      prisma.client.match.findUnique.mockResolvedValueOnce(baseMatch());

      await expect(service.getOrCreateConversationForMatch("match-1", "user-3")).rejects.toMatchObject({
        code: ErrorCode.NOT_MATCH_PARTICIPANT,
      });
      expect(prisma.client.conversation.create).not.toHaveBeenCalled();
    });

    it("throws MATCH_NOT_FOUND for a nonexistent match", async () => {
      prisma.client.match.findUnique.mockResolvedValueOnce(null);

      await expect(service.getOrCreateConversationForMatch("nonexistent", "user-1")).rejects.toMatchObject({
        code: ErrorCode.MATCH_NOT_FOUND,
      });
    });

    it("returns the existing conversation rather than creating a duplicate", async () => {
      prisma.client.match.findUnique.mockResolvedValueOnce(baseMatch());
      prisma.client.conversation.findUnique.mockResolvedValueOnce(baseConversation());

      const result = await service.getOrCreateConversationForMatch("match-1", "user-1");

      expect(prisma.client.conversation.create).not.toHaveBeenCalled();
      expect(result.id).toBe("conv-1");
    });

    it("creates a conversation lazily when none exists yet, for either participant", async () => {
      prisma.client.match.findUnique.mockResolvedValueOnce(baseMatch());
      prisma.client.conversation.findUnique.mockResolvedValueOnce(null);
      prisma.client.conversation.create.mockResolvedValueOnce(baseConversation());

      await service.getOrCreateConversationForMatch("match-1", "user-2");

      expect(prisma.client.conversation.create).toHaveBeenCalledWith({ data: { matchId: "match-1" } });
    });
  });

  describe("participant gating on messages (the core authorization guarantee)", () => {
    it("rejects sendMessage from a non-participant", async () => {
      prisma.client.conversation.findUnique.mockResolvedValueOnce({ ...baseConversation(), match: baseMatch() });

      await expect(service.sendMessage("conv-1", "user-3", "hello")).rejects.toMatchObject({
        code: ErrorCode.NOT_CONVERSATION_PARTICIPANT,
      });
      expect(prisma.client.message.create).not.toHaveBeenCalled();
    });

    it("rejects listMessages from a non-participant", async () => {
      prisma.client.conversation.findUnique.mockResolvedValueOnce({ ...baseConversation(), match: baseMatch() });

      await expect(service.listMessages("conv-1", "user-3")).rejects.toMatchObject({
        code: ErrorCode.NOT_CONVERSATION_PARTICIPANT,
      });
    });

    it("allows both participants (not just the match creator) to send messages", async () => {
      prisma.client.conversation.findUnique.mockResolvedValue({ ...baseConversation(), match: baseMatch() });
      prisma.client.message.create.mockResolvedValue({} as Message);

      await service.sendMessage("conv-1", "user-1", "hi from A");
      await service.sendMessage("conv-1", "user-2", "hi from B");

      expect(prisma.client.message.create).toHaveBeenCalledTimes(2);
    });

    it("throws CONVERSATION_NOT_FOUND for a nonexistent conversation", async () => {
      prisma.client.conversation.findUnique.mockResolvedValueOnce(null);

      await expect(service.sendMessage("nonexistent", "user-1", "hi")).rejects.toMatchObject({
        code: ErrorCode.CONVERSATION_NOT_FOUND,
      });
    });
  });

  describe("markRead", () => {
    it("only marks messages from the OTHER participant as read, never the caller's own", async () => {
      prisma.client.conversation.findUnique.mockResolvedValueOnce({ ...baseConversation(), match: baseMatch() });
      prisma.client.message.updateMany.mockResolvedValueOnce({ count: 3 });

      await service.markRead("conv-1", "user-1");

      expect(prisma.client.message.updateMany).toHaveBeenCalledWith({
        where: { conversationId: "conv-1", senderId: { not: "user-1" }, readAt: null },
        data: { readAt: expect.any(Date) },
      });
    });

    it("rejects a non-participant marking messages read", async () => {
      prisma.client.conversation.findUnique.mockResolvedValueOnce({ ...baseConversation(), match: baseMatch() });

      await expect(service.markRead("conv-1", "user-3")).rejects.toMatchObject({
        code: ErrorCode.NOT_CONVERSATION_PARTICIPANT,
      });
    });
  });

  describe("deleteConversation", () => {
    it("rejects deletion by a non-participant", async () => {
      prisma.client.conversation.findUnique.mockResolvedValueOnce({ ...baseConversation(), match: baseMatch() });

      await expect(service.deleteConversation("conv-1", "user-3")).rejects.toMatchObject({
        code: ErrorCode.NOT_CONVERSATION_PARTICIPANT,
      });
      expect(prisma.client.conversation.delete).not.toHaveBeenCalled();
    });

    it("allows a participant to delete the conversation", async () => {
      prisma.client.conversation.findUnique.mockResolvedValueOnce({ ...baseConversation(), match: baseMatch() });

      await service.deleteConversation("conv-1", "user-1");

      expect(prisma.client.conversation.delete).toHaveBeenCalledWith({ where: { id: "conv-1" } });
    });
  });
});
