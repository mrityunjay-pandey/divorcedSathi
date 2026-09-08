import { Test } from "@nestjs/testing";
import { InterestsService } from "./interests.service";
import { PrismaService } from "@/common/prisma/prisma.module";
import { NotificationsService } from "../notifications/notifications.service";
import { BlockService } from "../safety/block.service";
import { ErrorCode } from "@/common/errors/error-codes";
import { NotificationType, type Interest } from "@divorcedsathi/db";

type MockPrisma = {
  client: {
    interest: { findUnique: jest.Mock; findMany: jest.Mock; create: jest.Mock; update: jest.Mock };
    match: { create: jest.Mock };
    $transaction: jest.Mock;
  };
};

function baseInterest(overrides: Partial<Interest> = {}): Interest {
  return {
    id: "interest-1",
    senderId: "user-1",
    recipientId: "user-2",
    status: "PENDING" as Interest["status"],
    createdAt: new Date(),
    respondedAt: null,
    ...overrides,
  };
}

describe("InterestsService", () => {
  let service: InterestsService;
  let prisma: MockPrisma;
  let notifications: { create: jest.Mock };
  let blocks: { isBlockedEitherDirection: jest.Mock };

  beforeEach(async () => {
    prisma = {
      client: {
        interest: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
        match: { create: jest.fn() },
        $transaction: jest.fn(),
      },
    };
    notifications = { create: jest.fn() };
    blocks = { isBlockedEitherDirection: jest.fn().mockResolvedValue(false) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InterestsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: BlockService, useValue: blocks },
      ],
    }).compile();

    service = moduleRef.get(InterestsService);
  });

  describe("send", () => {
    it("rejects sending an interest to yourself", async () => {
      await expect(service.send("user-1", "user-1")).rejects.toMatchObject({ code: ErrorCode.CANNOT_TARGET_SELF });
      expect(prisma.client.interest.create).not.toHaveBeenCalled();
    });

    it("rejects sending an interest across a block in either direction", async () => {
      blocks.isBlockedEitherDirection.mockResolvedValueOnce(true);

      await expect(service.send("user-1", "user-2")).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
      expect(prisma.client.interest.findUnique).not.toHaveBeenCalled();
      expect(prisma.client.interest.create).not.toHaveBeenCalled();
    });

    it("rejects a duplicate interest to the same recipient", async () => {
      prisma.client.interest.findUnique.mockResolvedValueOnce(baseInterest());

      await expect(service.send("user-1", "user-2")).rejects.toMatchObject({ code: ErrorCode.INTEREST_ALREADY_SENT });
      expect(prisma.client.interest.create).not.toHaveBeenCalled();
    });

    it("creates the interest when none exists yet", async () => {
      prisma.client.interest.findUnique.mockResolvedValueOnce(null);
      prisma.client.interest.create.mockResolvedValueOnce(baseInterest());

      await service.send("user-1", "user-2");

      expect(prisma.client.interest.create).toHaveBeenCalledWith({ data: { senderId: "user-1", recipientId: "user-2" } });
    });

    it("notifies the recipient, never the sender, when an interest is sent", async () => {
      prisma.client.interest.findUnique.mockResolvedValueOnce(null);
      prisma.client.interest.create.mockResolvedValueOnce(baseInterest());

      await service.send("user-1", "user-2");

      expect(notifications.create).toHaveBeenCalledWith("user-2", NotificationType.INTEREST_RECEIVED, expect.objectContaining({ fromUserId: "user-1" }));
    });
  });

  describe("respond — the core authorization guarantee", () => {
    it("rejects responding when the caller is not the recipient (User A can't act on User B's interest)", async () => {
      prisma.client.interest.findUnique.mockResolvedValueOnce(baseInterest({ recipientId: "user-2" }));

      // "user-3" is neither the sender nor the recipient — an attacker who
      // discovered the interest id shouldn't be able to accept/decline it.
      await expect(service.respond("interest-1", "user-3", "ACCEPTED")).rejects.toMatchObject({
        code: ErrorCode.NOT_INTEREST_RECIPIENT,
      });
      expect(prisma.client.$transaction).not.toHaveBeenCalled();
    });

    it("rejects the sender attempting to respond to their own sent interest", async () => {
      prisma.client.interest.findUnique.mockResolvedValueOnce(baseInterest({ senderId: "user-1", recipientId: "user-2" }));

      await expect(service.respond("interest-1", "user-1", "ACCEPTED")).rejects.toMatchObject({
        code: ErrorCode.NOT_INTEREST_RECIPIENT,
      });
    });

    it("rejects responding to an already-responded interest", async () => {
      prisma.client.interest.findUnique.mockResolvedValueOnce(baseInterest({ status: "DECLINED" as Interest["status"] }));

      await expect(service.respond("interest-1", "user-2", "ACCEPTED")).rejects.toMatchObject({
        code: ErrorCode.INTEREST_ALREADY_RESPONDED,
      });
    });

    it("throws INTEREST_NOT_FOUND for a nonexistent interest rather than leaking any detail", async () => {
      prisma.client.interest.findUnique.mockResolvedValueOnce(null);

      await expect(service.respond("nonexistent", "user-2", "ACCEPTED")).rejects.toMatchObject({
        code: ErrorCode.INTEREST_NOT_FOUND,
      });
    });

    it("declining updates status without creating a Match", async () => {
      prisma.client.interest.findUnique.mockResolvedValueOnce(baseInterest());
      prisma.client.interest.update.mockResolvedValueOnce(baseInterest({ status: "DECLINED" as Interest["status"] }));

      await service.respond("interest-1", "user-2", "DECLINED");

      expect(prisma.client.interest.update).toHaveBeenCalledWith({
        where: { id: "interest-1" },
        data: { status: "DECLINED", respondedAt: expect.any(Date) },
      });
      expect(prisma.client.$transaction).not.toHaveBeenCalled();
      expect(prisma.client.match.create).not.toHaveBeenCalled();
    });

    it("accepting creates the Match atomically in the same transaction as the status update, with canonically ordered user ids", async () => {
      prisma.client.interest.findUnique.mockResolvedValueOnce(baseInterest({ senderId: "user-2", recipientId: "user-1" }));
      prisma.client.$transaction.mockResolvedValueOnce([baseInterest({ status: "ACCEPTED" as Interest["status"] })]);

      await service.respond("interest-1", "user-1", "ACCEPTED");

      expect(prisma.client.$transaction).toHaveBeenCalledTimes(1);
      const [txCalls] = prisma.client.$transaction.mock.calls[0];
      expect(txCalls).toHaveLength(2);
    });

    it("notifies the original sender (not the responder) when their interest is accepted", async () => {
      prisma.client.interest.findUnique.mockResolvedValueOnce(baseInterest({ senderId: "user-2", recipientId: "user-1" }));
      prisma.client.$transaction.mockResolvedValueOnce([baseInterest({ status: "ACCEPTED" as Interest["status"] })]);

      await service.respond("interest-1", "user-1", "ACCEPTED");

      expect(notifications.create).toHaveBeenCalledWith("user-2", NotificationType.INTEREST_ACCEPTED, expect.objectContaining({ interestId: "interest-1" }));
    });
  });
});
