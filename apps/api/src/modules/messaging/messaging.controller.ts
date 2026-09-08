import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { MessagingService } from "./messaging.service";
import { SendMessageDto } from "./dto/message.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/session.service";

@UseGuards(JwtAuthGuard)
@Controller()
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Post("matches/:matchId/conversation")
  async getOrCreateConversation(@CurrentUser() user: AccessTokenPayload, @Param("matchId") matchId: string) {
    const conversation = await this.messaging.getOrCreateConversationForMatch(matchId, user.sub);
    return { success: true, data: { conversation } };
  }

  @Get("conversations/:id/messages")
  async listMessages(@CurrentUser() user: AccessTokenPayload, @Param("id") id: string) {
    const messages = await this.messaging.listMessages(id, user.sub);
    return { success: true, data: { messages } };
  }

  @Post("conversations/:id/messages")
  async sendMessage(@CurrentUser() user: AccessTokenPayload, @Param("id") id: string, @Body() dto: SendMessageDto) {
    const message = await this.messaging.sendMessage(id, user.sub, dto.content);
    return { success: true, data: { message } };
  }

  @Post("conversations/:id/read")
  async markRead(@CurrentUser() user: AccessTokenPayload, @Param("id") id: string) {
    const result = await this.messaging.markRead(id, user.sub);
    return { success: true, data: result };
  }

  @Delete("conversations/:id")
  async deleteConversation(@CurrentUser() user: AccessTokenPayload, @Param("id") id: string) {
    await this.messaging.deleteConversation(id, user.sub);
    return { success: true, data: null };
  }
}
