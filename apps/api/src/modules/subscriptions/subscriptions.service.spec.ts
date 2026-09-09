import { Test } from "@nestjs/testing";
import { SubscriptionsService } from "./subscriptions.service";
import { PrismaService } from "@/common/prisma/prisma.module";
import { NotificationsService } from "../notifications/notifications.service";
import { PAYMENT_PROVIDER } from "./providers/payment-provider";
import { PREMIUM_PLAN_CURRENCY, PREMIUM_PLAN_PRICE_MINOR_UNITS } from "./plan-config";
import { ErrorCode } from "@/common/errors/error-codes";
import { Plan, type Payment, type Subscription } from "@divorcedsathi/db";

type MockPrisma = {
  client: {
    subscription: { findUnique: jest.Mock; upsert: jest.Mock };
    payment: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
  };
};

function basePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: "pay-1",
    userId: "user-1",
    subscriptionId: null,
    orderId: "order-1",
    transactionId: null,
    plan: Plan.PREMIUM,
    amountMinorUnits: PREMIUM_PLAN_PRICE_MINOR_UNITS,
    currency: PREMIUM_PLAN_CURRENCY,
    status: "INITIATED" as Payment["status"],
    createdAt: new Date(),
    ...overrides,
  };
}

describe("SubscriptionsService", () => {
  let service: SubscriptionsService;
  let prisma: MockPrisma;
  let notifications: { create: jest.Mock };
  let paymentProvider: { createOrder: jest.Mock; verifyPayment: jest.Mock };

  beforeEach(async () => {
    prisma = { client: { subscription: { findUnique: jest.fn(), upsert: jest.fn() }, payment: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() } } };
    notifications = { create: jest.fn() };
    paymentProvider = { createOrder: jest.fn(), verifyPayment: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: PAYMENT_PROVIDER, useValue: paymentProvider },
      ],
    }).compile();

    service = moduleRef.get(SubscriptionsService);
  });

  describe("getForUser", () => {
    it("returns FREE/ACTIVE for a user with no Subscription row — not an error", async () => {
      prisma.client.subscription.findUnique.mockResolvedValueOnce(null);

      const sub = await service.getForUser("user-1");

      expect(sub).toEqual({ plan: Plan.FREE, status: "ACTIVE", currentPeriodEnd: null });
    });

    it("returns the saved row when one exists", async () => {
      const saved = { plan: Plan.PREMIUM, status: "ACTIVE", currentPeriodEnd: new Date() } as Subscription;
      prisma.client.subscription.findUnique.mockResolvedValueOnce(saved);

      expect(await service.getForUser("user-1")).toBe(saved);
    });
  });

  describe("isOnPremium", () => {
    it("is false for a Free user", async () => {
      prisma.client.subscription.findUnique.mockResolvedValueOnce(null);
      expect(await service.isOnPremium("user-1")).toBe(false);
    });

    it("is true only when plan is PREMIUM and status is ACTIVE", async () => {
      prisma.client.subscription.findUnique.mockResolvedValueOnce({ plan: Plan.PREMIUM, status: "ACTIVE" } as Subscription);
      expect(await service.isOnPremium("user-1")).toBe(true);
    });

    it("is false for a PREMIUM plan that has EXPIRED", async () => {
      prisma.client.subscription.findUnique.mockResolvedValueOnce({ plan: Plan.PREMIUM, status: "EXPIRED" } as Subscription);
      expect(await service.isOnPremium("user-1")).toBe(false);
    });
  });

  describe("initiateUpgrade", () => {
    it("rejects a user who is already active Premium", async () => {
      prisma.client.subscription.findUnique.mockResolvedValueOnce({ plan: Plan.PREMIUM, status: "ACTIVE" } as Subscription);

      await expect(service.initiateUpgrade("user-1")).rejects.toMatchObject({ code: ErrorCode.ALREADY_PREMIUM });
      expect(paymentProvider.createOrder).not.toHaveBeenCalled();
    });

    it("creates an order via the provider and a matching Payment record at the exact configured price", async () => {
      prisma.client.subscription.findUnique.mockResolvedValueOnce(null);
      paymentProvider.createOrder.mockResolvedValueOnce({ orderId: "order-1" });
      prisma.client.payment.create.mockResolvedValueOnce(basePayment());

      const result = await service.initiateUpgrade("user-1");

      expect(paymentProvider.createOrder).toHaveBeenCalledWith("user-1", PREMIUM_PLAN_PRICE_MINOR_UNITS, PREMIUM_PLAN_CURRENCY);
      expect(prisma.client.payment.create).toHaveBeenCalledWith({
        data: { userId: "user-1", orderId: "order-1", plan: Plan.PREMIUM, amountMinorUnits: PREMIUM_PLAN_PRICE_MINOR_UNITS, currency: PREMIUM_PLAN_CURRENCY },
      });
      expect(result.orderId).toBe("order-1");
    });
  });

  describe("confirmPayment — the trust boundary that prevents free Premium", () => {
    it("throws for a nonexistent order", async () => {
      prisma.client.payment.findUnique.mockResolvedValueOnce(null);

      await expect(service.confirmPayment("nonexistent")).rejects.toMatchObject({ code: ErrorCode.PAYMENT_NOT_FOUND });
    });

    it("rejects confirming a payment that's already been processed", async () => {
      prisma.client.payment.findUnique.mockResolvedValueOnce(basePayment({ status: "SUCCEEDED" as Payment["status"] }));

      await expect(service.confirmPayment("order-1")).rejects.toMatchObject({ code: ErrorCode.PAYMENT_ALREADY_PROCESSED });
      expect(paymentProvider.verifyPayment).not.toHaveBeenCalled();
    });

    it("always calls the provider's verifyPayment — never trusts a client claim of success", async () => {
      prisma.client.payment.findUnique.mockResolvedValueOnce(basePayment());
      paymentProvider.verifyPayment.mockResolvedValueOnce({ succeeded: true, transactionId: "txn-1" });
      prisma.client.payment.update.mockResolvedValueOnce(basePayment({ status: "SUCCEEDED" as Payment["status"] }));
      prisma.client.subscription.upsert.mockResolvedValueOnce({} as Subscription);

      await service.confirmPayment("order-1");

      expect(paymentProvider.verifyPayment).toHaveBeenCalledWith("order-1");
    });

    it("marks the payment FAILED and does NOT activate a subscription when provider verification fails", async () => {
      prisma.client.payment.findUnique.mockResolvedValueOnce(basePayment());
      paymentProvider.verifyPayment.mockResolvedValueOnce({ succeeded: false, transactionId: "" });
      prisma.client.payment.update.mockResolvedValueOnce(basePayment({ status: "FAILED" as Payment["status"] }));

      await service.confirmPayment("order-1");

      expect(prisma.client.payment.update).toHaveBeenCalledWith({ where: { orderId: "order-1" }, data: { status: "FAILED" } });
      expect(prisma.client.subscription.upsert).not.toHaveBeenCalled();
      expect(notifications.create).not.toHaveBeenCalled();
    });

    it("on success: marks the payment SUCCEEDED, upserts an ACTIVE PREMIUM subscription, and notifies the user", async () => {
      prisma.client.payment.findUnique.mockResolvedValueOnce(basePayment());
      paymentProvider.verifyPayment.mockResolvedValueOnce({ succeeded: true, transactionId: "txn-1" });
      prisma.client.payment.update.mockResolvedValueOnce(basePayment({ status: "SUCCEEDED" as Payment["status"], transactionId: "txn-1" }));
      prisma.client.subscription.upsert.mockResolvedValueOnce({} as Subscription);

      await service.confirmPayment("order-1");

      expect(prisma.client.payment.update).toHaveBeenCalledWith({
        where: { orderId: "order-1" },
        data: { status: "SUCCEEDED", transactionId: "txn-1" },
      });
      const upsertCall = prisma.client.subscription.upsert.mock.calls[0][0];
      expect(upsertCall.where).toEqual({ userId: "user-1" });
      expect(upsertCall.create).toMatchObject({ userId: "user-1", plan: Plan.PREMIUM, status: "ACTIVE" });
      expect(upsertCall.update).toMatchObject({ plan: Plan.PREMIUM, status: "ACTIVE" });
      expect(notifications.create).toHaveBeenCalledWith("user-1", "SUBSCRIPTION_ACTIVATED", { orderId: "order-1" });
    });
  });
});
