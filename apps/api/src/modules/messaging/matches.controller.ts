import { Controller, Get, Injectable, UseGuards } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.module";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/session.service";

export interface MatchSummary {
  matchId: string;
  conversationId: string | null;
  otherUser: { userId: string; firstName: string };
  createdAt: Date;
}

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<MatchSummary[]> {
    const matches = await this.prisma.client.match.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      include: { userA: true, userB: true, conversation: true },
      orderBy: { createdAt: "desc" },
    });

    return matches.map((m) => {
      const other = m.userAId === userId ? m.userB : m.userA;
      return {
        matchId: m.id,
        conversationId: m.conversation?.id ?? null,
        otherUser: { userId: other.id, firstName: other.firstName },
        createdAt: m.createdAt,
      };
    });
  }
}

@UseGuards(JwtAuthGuard)
@Controller("matches")
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  @Get()
  async list(@CurrentUser() user: AccessTokenPayload) {
    const matches = await this.matches.listForUser(user.sub);
    return { success: true, data: { matches } };
  }
}
