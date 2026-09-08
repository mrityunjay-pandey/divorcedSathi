export interface EmailProvider {
  sendOtp(email: string, code: string): Promise<void>;
}

export const EMAIL_PROVIDER = Symbol("EMAIL_PROVIDER");

/**
 * Dev/test stand-in. Logs instead of sending. A real provider (SES, Postmark,
 * SendGrid, etc.) implements the same interface and is swapped in via the
 * EMAIL_PROVIDER token once EMAIL_PROVIDER_API_KEY is configured — no
 * call-site changes required.
 */
export class ConsoleEmailProvider implements EmailProvider {
  async sendOtp(email: string, code: string): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`[email:dev] OTP for ${email}: ${code}`);
  }
}
