import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.module";
import { AppException } from "@/common/errors/app-exception";
import { ErrorCode } from "@/common/errors/error-codes";
import { NotificationsService } from "../notifications/notifications.service";
import { PAYMENT_PROVIDER, type PaymentProvider } from "./providers/payment-provider";
import { PREMIUM_PLAN_CURRENCY, PREMIUM_PLAN_PERIOD_DAYS, PREMIUM_PLAN_PRICE_MINOR_UNITS } from "./plan-config";
import { NotificationType, Plan, PaymentStatus, SubscriptionStatus, type Payment, type Subscription } from "@divorcedsathi/db";

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
  ) {}

  /**
   * Returns a real FREE-plan object even if no Subscription row exists —
   * every user is implicitly on Free from signup, so "no row" and "on
   * Free" are the same state, not an error (brief §48: don't make the
   * absence of a choice feel like a broken state).
   */
  async getForUser(userId: string): Promise<Pick<Subscription, "plan" | "status" | "currentPeriodEnd">> {
    const existing = await this.prisma.client.subscription.findUnique({ where: { userId } });
    return existing ?? { plan: Plan.FREE, status: SubscriptionStatus.ACTIVE, currentPeriodEnd: null };
  }

  async initiateUpgrade(userId: string): Promise<{ orderId: string; amountMinorUnits: number; currency: string }> {
    const current = await this.getForUser(userId);
    if (current.plan === Plan.PREMIUM && current.status === SubscriptionStatus.ACTIVE) {
      throw new AppException(ErrorCode.ALREADY_PREMIUM, "You're already on the Premium plan.", HttpStatus.CONFLICT);
    }

    const { orderId } = await this.paymentProvider.createOrder(userId, PREMIUM_PLAN_PRICE_MINOR_UNITS, PREMIUM_PLAN_CURRENCY);

    await this.prisma.client.payment.create({
      data: {
        userId,
        orderId,
        plan: Plan.PREMIUM,
        amountMinorUnits: PREMIUM_PLAN_PRICE_MINOR_UNITS,
        currency: PREMIUM_PLAN_CURRENCY,
      },
    });

    return { orderId, amountMinorUnits: PREMIUM_PLAN_PRICE_MINOR_UNITS, currency: PREMIUM_PLAN_CURRENCY };
  }

  /**
   * Confirms a previously-initiated order. In production this is called
   * from a payment-provider webhook, not directly by the client — the
   * client only ever triggers initiateUpgrade(); trusting a client-supplied
   * "payment succeeded" claim without provider verification would let
   * anyone grant themselves Premium for free.
   */
  async confirmPayment(orderId: string): Promise<Payment> {
    const payment = await this.prisma.client.payment.findUnique({ where: { orderId } });
    if (!payment) {
      throw new AppException(ErrorCode.PAYMENT_NOT_FOUND, "Payment not found.", HttpStatus.NOT_FOUND);
    }
    if (payment.status !== PaymentStatus.INITIATED) {
      throw new AppException(ErrorCode.PAYMENT_ALREADY_PROCESSED, "This payment has already been processed.", HttpStatus.CONFLICT);
    }

    const result = await this.paymentProvider.verifyPayment(orderId);

    if (!result.succeeded) {
      return this.prisma.client.payment.update({ where: { orderId }, data: { status: PaymentStatus.FAILED } });
    }

    const updatedPayment = await this.prisma.client.payment.update({
      where: { orderId },
      data: { status: PaymentStatus.SUCCEEDED, transactionId: result.transactionId },
    });

    const currentPeriodEnd = new Date(Date.now() + PREMIUM_PLAN_PERIOD_DAYS * 24 * 60 * 60_000);
    await this.prisma.client.subscription.upsert({
      where: { userId: payment.userId },
      create: { userId: payment.userId, plan: Plan.PREMIUM, status: SubscriptionStatus.ACTIVE, currentPeriodEnd },
      update: { plan: Plan.PREMIUM, status: SubscriptionStatus.ACTIVE, currentPeriodEnd },
    });

    await this.notifications.create(payment.userId, NotificationType.SUBSCRIPTION_ACTIVATED, { orderId });

    return updatedPayment;
  }

  /** Consulted by InterestsService — never by anything that would paywall a safety feature (brief §32). */
  async isOnPremium(userId: string): Promise<boolean> {
    const sub = await this.getForUser(userId);
    return sub.plan === Plan.PREMIUM && sub.status === SubscriptionStatus.ACTIVE;
  }
}
