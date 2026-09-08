export interface SmsProvider {
  sendOtp(mobileNumber: string, code: string): Promise<void>;
}

export const SMS_PROVIDER = Symbol("SMS_PROVIDER");

/** Dev/test stand-in — see email-provider.ts for the rationale. */
export class ConsoleSmsProvider implements SmsProvider {
  async sendOtp(mobileNumber: string, code: string): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`[sms:dev] OTP for ${mobileNumber}: ${code}`);
  }
}
