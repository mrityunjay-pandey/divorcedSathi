export interface CreateOrderResult {
  orderId: string;
}

export interface PaymentProvider {
  createOrder(userId: string, amountMinorUnits: number, currency: string): Promise<CreateOrderResult>;
  /** In production this verifies a provider signature/webhook payload; the mock always succeeds. */
  verifyPayment(orderId: string): Promise<{ succeeded: boolean; transactionId: string }>;
}

export const PAYMENT_PROVIDER = Symbol("PAYMENT_PROVIDER");

/**
 * Dev/test stand-in — no real gateway (Razorpay/UPI/etc.) is configured.
 * See email-provider.ts (Module 2) for the same rationale: a real
 * implementation swaps in behind this interface via the PAYMENT_PROVIDER
 * token with no call-site changes.
 */
export class MockPaymentProvider implements PaymentProvider {
  async createOrder(userId: string, amountMinorUnits: number, currency: string): Promise<CreateOrderResult> {
    const orderId = `mock_order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    // eslint-disable-next-line no-console
    console.log(`[payments:dev] Created order ${orderId} for user ${userId}: ${amountMinorUnits} ${currency}`);
    return { orderId };
  }

  async verifyPayment(orderId: string): Promise<{ succeeded: boolean; transactionId: string }> {
    // eslint-disable-next-line no-console
    console.log(`[payments:dev] Verifying order ${orderId} — always succeeds in dev`);
    return { succeeded: true, transactionId: `mock_txn_${orderId}` };
  }
}
