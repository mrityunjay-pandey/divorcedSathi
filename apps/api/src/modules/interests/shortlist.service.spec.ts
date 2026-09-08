import { Test } from "@nestjs/testing";
import { ShortlistService } from "./shortlist.controller";
import { PrismaService } from "@/common/prisma/prisma.module";
import { ErrorCode } from "@/common/errors/error-codes";
import type { Shortlist } from "@divorcedsathi/db";

type MockPrisma = {
  client: {
    shortlist: { findUnique: jest.Mock; create: jest.Mock; deleteMany: jest.Mock; findMany: jest.Mock };
  };
};

function baseEntry(overrides: Partial<Shortlist> = {}): Shortlist {
  return { id: "sl-1", userId: "user-1", targetUserId: "user-2", createdAt: new Date(), ...overrides };
}

describe("ShortlistService", () => {
  let service: ShortlistService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = {
      client: {
        shortlist: { findUnique: jest.fn(), create: jest.fn(), deleteMany: jest.fn(), findMany: jest.fn() },
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [ShortlistService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(ShortlistService);
  });

  it("rejects shortlisting yourself", async () => {
    await expect(service.add("user-1", "user-1")).rejects.toMatchObject({ code: ErrorCode.CANNOT_TARGET_SELF });
    expect(prisma.client.shortlist.create).not.toHaveBeenCalled();
  });

  it("rejects adding the same target twice", async () => {
    prisma.client.shortlist.findUnique.mockResolvedValueOnce(baseEntry());

    await expect(service.add("user-1", "user-2")).rejects.toMatchObject({ code: ErrorCode.ALREADY_SHORTLISTED });
  });

  it("scopes list() to the requesting user only", async () => {
    prisma.client.shortlist.findMany.mockResolvedValueOnce([baseEntry()]);

    await service.list("user-1");

    expect(prisma.client.shortlist.findMany).toHaveBeenCalledWith({ where: { userId: "user-1" }, orderBy: { createdAt: "desc" } });
  });

  it("remove() is idempotent — removing a non-existent entry doesn't throw", async () => {
    prisma.client.shortlist.deleteMany.mockResolvedValueOnce({ count: 0 });

    await expect(service.remove("user-1", "user-never-shortlisted")).resolves.toBeUndefined();
  });

  it("remove() scopes the deletion to the requesting user, so User A can't unshortlist on User B's behalf", async () => {
    prisma.client.shortlist.deleteMany.mockResolvedValueOnce({ count: 1 });

    await service.remove("user-1", "user-2");

    expect(prisma.client.shortlist.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1", targetUserId: "user-2" } });
  });
});
