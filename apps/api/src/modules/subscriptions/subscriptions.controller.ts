import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { IsString } from "class-validator";
import { SubscriptionsService } from "./subscriptions.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/session.service";

export class ConfirmPaymentDto {
  @IsString()
  orderId!: string;
}

@UseGuards(JwtAuthGuard)
@Controller("subscription")
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get("me")
  async get(@CurrentUser() user: AccessTokenPayload) {
    const subscription = await this.subscriptions.getForUser(user.sub);
    return { success: true, data: { subscription } };
  }

  @Post("upgrade")
  async upgrade(@CurrentUser() user: AccessTokenPayload) {
    const order = await this.subscriptions.initiateUpgrade(user.sub);
    return { success: true, data: order };
  }

  /**
   * In production, payment confirmation is a webhook the provider calls,
   * authenticated by provider signature — not this user-facing endpoint.
   * This exists so the mock flow is exercisable end-to-end during
   * development; a real integration would add a separate, provider-signed
   * webhook route and likely remove or heavily restrict this one.
   */
  @Post("confirm")
  async confirm(@Body() dto: ConfirmPaymentDto) {
    const payment = await this.subscriptions.confirmPayment(dto.orderId);
    return { success: true, data: { payment } };
  }
}
