import { Test } from "@nestjs/testing";
import { NotificationsService } from "./notifications.service";
import { PrismaService } from "@/common/prisma/prisma.module";
import { NotificationType } from "@divorcedsathi/db";

type MockPrisma = {
  client: {
    notification: { create: jest.Mock; findMany: jest.Mock; updateMany: jest.Mock };
  };
};

describe("NotificationsService", () => {
  let service: NotificationsService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = { client: { notification: { create: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() } } };
    const moduleRef = await Test.createTestingModule({
      providers: [NotificationsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(NotificationsService);
  });

  it("scopes list() to the requesting user", async () => {
    prisma.client.notification.findMany.mockResolvedValueOnce([]);

    await service.listForUser("user-1");

    expect(prisma.client.notification.findMany).toHaveBeenCalledWith({ where: { userId: "user-1" }, orderBy: { createdAt: "desc" } });
  });

  it("markRead() scopes the update to (id AND userId) — so User A can't mark User B's notification read by guessing the id", async () => {
    prisma.client.notification.updateMany.mockResolvedValueOnce({ count: 0 });

    await service.markRead("notif-belongs-to-user-2", "user-1");

    expect(prisma.client.notification.updateMany).toHaveBeenCalledWith({
      where: { id: "notif-belongs-to-user-2", userId: "user-1" },
      data: { readAt: expect.any(Date) },
    });
  });

  it("markAllRead() only touches the requesting user's unread notifications", async () => {
    prisma.client.notification.updateMany.mockResolvedValueOnce({ count: 5 });

    await service.markAllRead("user-1");

    expect(prisma.client.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });

  it("create() persists the given type and payload for the target user", async () => {
    prisma.client.notification.create.mockResolvedValueOnce({});

    await service.create("user-2", NotificationType.INTEREST_RECEIVED, { interestId: "interest-1" });

    expect(prisma.client.notification.create).toHaveBeenCalledWith({
      data: { userId: "user-2", type: NotificationType.INTEREST_RECEIVED, payload: { interestId: "interest-1" } },
    });
  });
});
