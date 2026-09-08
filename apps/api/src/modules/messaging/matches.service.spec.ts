import { Test } from "@nestjs/testing";
import { MatchesService } from "./matches.controller";
import { PrismaService } from "@/common/prisma/prisma.module";
import type { Conversation, Match, User } from "@divorcedsathi/db";

type MockPrisma = {
  client: {
    match: { findMany: jest.Mock };
  };
};

function baseUser(id: string, firstName: string): User {
  return { id, firstName } as User;
}

function matchWithUsers(
  userAId: string,
  userBId: string,
  conversation: Conversation | null = null,
): Match & { userA: User; userB: User; conversation: Conversation | null } {
  return {
    id: `match-${userAId}-${userBId}`,
    interestId: "interest-x",
    userAId,
    userBId,
    createdAt: new Date(),
    userA: baseUser(userAId, `User-${userAId}`),
    userB: baseUser(userBId, `User-${userBId}`),
    conversation,
  };
}

describe("MatchesService", () => {
  let service: MatchesService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = { client: { match: { findMany: jest.fn() } } };
    const moduleRef = await Test.createTestingModule({
      providers: [MatchesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(MatchesService);
  });

  it("queries matches where the user is either side of the pair", async () => {
    prisma.client.match.findMany.mockResolvedValueOnce([]);

    await service.listForUser("user-1");

    expect(prisma.client.match.findMany.mock.calls[0][0].where).toEqual({
      OR: [{ userAId: "user-1" }, { userBId: "user-1" }],
    });
  });

  it("resolves 'otherUser' to userB when the caller is userA", async () => {
    prisma.client.match.findMany.mockResolvedValueOnce([matchWithUsers("user-1", "user-2")]);

    const [summary] = await service.listForUser("user-1");

    expect(summary.otherUser.userId).toBe("user-2");
  });

  it("resolves 'otherUser' to userA when the caller is userB", async () => {
    prisma.client.match.findMany.mockResolvedValueOnce([matchWithUsers("user-2", "user-1")]);

    const [summary] = await service.listForUser("user-1");

    expect(summary.otherUser.userId).toBe("user-2");
  });

  it("surfaces conversationId as null when no conversation has been created yet", async () => {
    prisma.client.match.findMany.mockResolvedValueOnce([matchWithUsers("user-1", "user-2", null)]);

    const [summary] = await service.listForUser("user-1");

    expect(summary.conversationId).toBeNull();
  });

  it("surfaces the existing conversationId when one exists", async () => {
    prisma.client.match.findMany.mockResolvedValueOnce([
      matchWithUsers("user-1", "user-2", { id: "conv-1", matchId: "match-user-1-user-2", createdAt: new Date() }),
    ]);

    const [summary] = await service.listForUser("user-1");

    expect(summary.conversationId).toBe("conv-1");
  });
});
