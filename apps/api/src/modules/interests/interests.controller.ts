import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { InterestsService } from "./interests.service";
import { RespondInterestDto, SendInterestDto } from "./dto/interest.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/session.service";

@UseGuards(JwtAuthGuard)
@Controller("interests")
export class InterestsController {
  constructor(private readonly interests: InterestsService) {}

  @Post()
  async send(@CurrentUser() user: AccessTokenPayload, @Body() dto: SendInterestDto) {
    const interest = await this.interests.send(user.sub, dto.recipientId);
    return { success: true, data: { interest } };
  }

  @Get("received")
  async received(@CurrentUser() user: AccessTokenPayload) {
    const interests = await this.interests.listReceived(user.sub);
    return { success: true, data: { interests } };
  }

  @Get("sent")
  async sent(@CurrentUser() user: AccessTokenPayload) {
    const interests = await this.interests.listSent(user.sub);
    return { success: true, data: { interests } };
  }

  @Post(":id/respond")
  async respond(@CurrentUser() user: AccessTokenPayload, @Param("id") id: string, @Body() dto: RespondInterestDto) {
    const interest = await this.interests.respond(id, user.sub, dto.response);
    return { success: true, data: { interest } };
  }
}
