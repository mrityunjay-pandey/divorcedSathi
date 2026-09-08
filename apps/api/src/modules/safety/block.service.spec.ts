import { Test } from "@nestjs/testing";
import { BlockService } from "./block.service";
import { PrismaService } from "@/common/prisma/prisma.module";
import { ErrorCode } from "@/common/errors/error-codes";
import type { Block } from "@divorcedsathi/db";

type MockPrisma = {
  client: {
    block: { findUnique: jest.Mock; findFirst: jest.Mock; findMany: jest.Mock; create: jest.Mock; deleteMany: jest.Mock };
  };
};

function baseBlock(overrides: Partial<Block> = {}): Block {
  return { id: "block-1", blockerId: "user-1", blockedUserId: "user-2", createdAt: new Date(), ...overrides };
}

describe("BlockService", () => {
  let service: BlockService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = {
      client: { block: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), deleteMany: jest.fn() } },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [BlockService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(BlockService);
  });

  it("rejects blocking yourself", async () => {
    await expect(service.block("user-1", "user-1")).rejects.toMatchObject({ code: ErrorCode.CANNOT_TARGET_SELF });
    expect(prisma.client.block.create).not.toHaveBeenCalled();
  });

  it("rejects blocking the same user twice", async () => {
    prisma.client.block.findUnique.mockResolvedValueOnce(baseBlock());

    await expect(service.block("user-1", "user-2")).rejects.toMatchObject({ code: ErrorCode.ALREADY_BLOCKED });
  });

  it("unblock() is idempotent — no error for a non-existent block", async () => {
    prisma.client.block.deleteMany.mockResolvedValueOnce({ count: 0 });

    await expect(service.unblock("user-1", "user-never-blocked")).resolves.toBeUndefined();
  });

  describe("isBlockedEitherDirection — the core enforcement primitive", () => {
    it("returns true when A blocked B", async () => {
      prisma.client.block.findFirst.mockResolvedValueOnce(baseBlock({ blockerId: "user-1", blockedUserId: "user-2" }));

      expect(await service.isBlockedEitherDirection("user-1", "user-2")).toBe(true);
    });

    it("returns true when B blocked A — the relationship is checked bidirectionally regardless of argument order", async () => {
      prisma.client.block.findFirst.mockResolvedValueOnce(baseBlock({ blockerId: "user-2", blockedUserId: "user-1" }));

      expect(await service.isBlockedEitherDirection("user-1", "user-2")).toBe(true);
    });

    it("returns false when neither has blocked the other", async () => {
      prisma.client.block.findFirst.mockResolvedValueOnce(null);

      expect(await service.isBlockedEitherDirection("user-1", "user-2")).toBe(false);
    });

    it("queries both directions in a single OR clause", async () => {
      prisma.client.block.findFirst.mockResolvedValueOnce(null);

      await service.isBlockedEitherDirection("user-1", "user-2");

      expect(prisma.client.block.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { blockerId: "user-1", blockedUserId: "user-2" },
            { blockerId: "user-2", blockedUserId: "user-1" },
          ],
        },
      });
    });
  });

  describe("listRelatedUserIds", () => {
    it("resolves to the OTHER user id regardless of which side initiated each block", async () => {
      prisma.client.block.findMany.mockResolvedValueOnce([
        baseBlock({ blockerId: "user-1", blockedUserId: "user-2" }),
        baseBlock({ id: "block-2", blockerId: "user-3", blockedUserId: "user-1" }),
      ]);

      const ids = await service.listRelatedUserIds("user-1");

      expect(ids.sort()).toEqual(["user-2", "user-3"]);
    });
  });
});
