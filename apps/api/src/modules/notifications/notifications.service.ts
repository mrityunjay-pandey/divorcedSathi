import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.module";
import type { Notification, NotificationType, Prisma } from "@divorcedsathi/db";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, type: NotificationType, payload?: Prisma.InputJsonValue): Promise<Notification> {
    return this.prisma.client.notification.create({ data: { userId, type, payload } });
  }

  async listForUser(userId: string): Promise<Notification[]> {
    return this.prisma.client.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  }

  /**
   * Scoped by userId in the where-clause, not just looked up by id and
   * trusted — so a notification id belonging to another user can never be
   * marked read by guessing/enumerating it. A no-op (0 rows updated) for a
   * mismatched id/userId pair is the correct behavior here, same rationale
   * as Shortlist's idempotent remove: the caller doesn't need to know
   * whether it "failed" because the id was wrong or because it belongs to
   * someone else — both cases should look identical from outside.
   */
  async markRead(notificationId: string, userId: string): Promise<{ count: number }> {
    return this.prisma.client.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string): Promise<{ count: number }> {
    return this.prisma.client.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
