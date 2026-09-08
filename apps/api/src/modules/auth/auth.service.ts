import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.module";
import { PasswordService } from "./services/password.service";
import { OtpService } from "./services/otp.service";
import { SessionService, type IssuedSession } from "./services/session.service";
import { EMAIL_PROVIDER, type EmailProvider } from "./providers/email-provider";
import { SMS_PROVIDER, type SmsProvider } from "./providers/sms-provider";
import { AppException } from "@/common/errors/app-exception";
import { ErrorCode } from "@/common/errors/error-codes";
import type { RegisterDto } from "./dto/register.dto";
import type { LoginDto, VerifyOtpDto, ResendOtpDto } from "./dto";
import { AuthIdentifierType, Gender, MarriageStatus, OtpPurpose, UserStatus, type User } from "@divorcedsathi/db";

const MINIMUM_AGE_YEARS = 18;

const GENDER_MAP: Record<RegisterDto["gender"], Gender> = {
  male: Gender.MALE,
  female: Gender.FEMALE,
  other: Gender.OTHER,
  prefer_not_to_say: Gender.PREFER_NOT_TO_SAY,
};

const MARRIAGE_STATUS_MAP: Record<RegisterDto["marriageStatus"], MarriageStatus> = {
  divorced: MarriageStatus.DIVORCED,
};

export interface PublicUser {
  id: string;
  firstName: string;
  email: string | null;
  mobileNumber: string | null;
  emailVerified: boolean;
  mobileVerified: boolean;
}

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    firstName: user.firstName,
    email: user.email,
    mobileNumber: user.mobileNumber,
    emailVerified: !!user.emailVerifiedAt,
    mobileVerified: !!user.mobileVerifiedAt,
  };
}

function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
    private readonly otp: OtpService,
    private readonly session: SessionService,
    @Inject(EMAIL_PROVIDER) private readonly emailProvider: EmailProvider,
    @Inject(SMS_PROVIDER) private readonly smsProvider: SmsProvider,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: PublicUser }> {
    if (calculateAge(dto.dateOfBirth) < MINIMUM_AGE_YEARS) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        "You must be at least 18 years old to register.",
        HttpStatus.BAD_REQUEST,
      );
    }

    if (dto.email) {
      const existing = await this.prisma.client.user.findUnique({ where: { email: dto.email } });
      if (existing) {
        throw new AppException(ErrorCode.EMAIL_ALREADY_REGISTERED, "An account with this email already exists.", HttpStatus.CONFLICT);
      }
    }
    if (dto.mobileNumber) {
      const existing = await this.prisma.client.user.findUnique({ where: { mobileNumber: dto.mobileNumber } });
      if (existing) {
        throw new AppException(ErrorCode.MOBILE_ALREADY_REGISTERED, "An account with this mobile number already exists.", HttpStatus.CONFLICT);
      }
    }

    const passwordHash = await this.password.hash(dto.password);
    const user = await this.prisma.client.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        mobileNumber: dto.mobileNumber,
        passwordHash,
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: GENDER_MAP[dto.gender],
        city: dto.city,
        marriageStatus: MARRIAGE_STATUS_MAP[dto.marriageStatus],
      },
    });

    // Verification is required before profile creation (brief §9/§4). We send
    // whichever identifier was provided; if the user gave both, both get a code.
    if (dto.email) {
      const code = await this.otp.issue({
        identifier: dto.email,
        identifierType: AuthIdentifierType.EMAIL,
        purpose: OtpPurpose.REGISTRATION_VERIFY,
        userId: user.id,
      });
      await this.emailProvider.sendOtp(dto.email, code);
    }
    if (dto.mobileNumber) {
      const code = await this.otp.issue({
        identifier: dto.mobileNumber,
        identifierType: AuthIdentifierType.MOBILE,
        purpose: OtpPurpose.REGISTRATION_VERIFY,
        userId: user.id,
      });
      await this.smsProvider.sendOtp(dto.mobileNumber, code);
    }

    return { user: toPublicUser(user) };
  }

  async resendOtp(dto: ResendOtpDto): Promise<void> {
    const identifier = dto.identifierType === "EMAIL" ? dto.email : dto.mobileNumber;
    if (!identifier) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, "An identifier is required.", HttpStatus.BAD_REQUEST);
    }
    const user =
      dto.identifierType === "EMAIL"
        ? await this.prisma.client.user.findUnique({ where: { email: identifier } })
        : await this.prisma.client.user.findUnique({ where: { mobileNumber: identifier } });

    // Do not reveal whether the identifier exists — respond the same way either way.
    if (!user) return;

    const code = await this.otp.issue({
      identifier,
      identifierType: dto.identifierType === "EMAIL" ? AuthIdentifierType.EMAIL : AuthIdentifierType.MOBILE,
      purpose: OtpPurpose.REGISTRATION_VERIFY,
      userId: user.id,
    });

    if (dto.identifierType === "EMAIL") {
      await this.emailProvider.sendOtp(identifier, code);
    } else {
      await this.smsProvider.sendOtp(identifier, code);
    }
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<{ user: PublicUser }> {
    const identifier = dto.identifierType === "EMAIL" ? dto.email : dto.mobileNumber;
    if (!identifier) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, "An identifier is required.", HttpStatus.BAD_REQUEST);
    }

    await this.otp.verify({ identifier, purpose: OtpPurpose.REGISTRATION_VERIFY, code: dto.code });

    const user =
      dto.identifierType === "EMAIL"
        ? await this.prisma.client.user.update({ where: { email: identifier }, data: { emailVerifiedAt: new Date() } })
        : await this.prisma.client.user.update({ where: { mobileNumber: identifier }, data: { mobileVerifiedAt: new Date() } });

    return { user: toPublicUser(user) };
  }

  async login(dto: LoginDto, meta: { userAgent?: string; ipAddress?: string } = {}): Promise<{ user: PublicUser; session: IssuedSession }> {
    const identifier = dto.email ?? dto.mobileNumber;
    if (!identifier) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, "An identifier is required.", HttpStatus.BAD_REQUEST);
    }

    const user = dto.email
      ? await this.prisma.client.user.findUnique({ where: { email: dto.email } })
      : await this.prisma.client.user.findUnique({ where: { mobileNumber: dto.mobileNumber } });

    // Same generic message whether the account doesn't exist or the password
    // is wrong — never reveal which, so credential stuffing can't enumerate
    // accounts.
    if (!user || !(await this.password.verify(user.passwordHash, dto.password))) {
      throw new AppException(ErrorCode.INVALID_CREDENTIALS, "Incorrect email/mobile or password.", HttpStatus.UNAUTHORIZED);
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.BANNED) {
      throw new AppException(ErrorCode.ACCOUNT_SUSPENDED, "This account is not active. Contact support for details.", HttpStatus.FORBIDDEN);
    }

    if (!user.emailVerifiedAt && !user.mobileVerifiedAt) {
      throw new AppException(ErrorCode.ACCOUNT_NOT_VERIFIED, "Please verify your email or mobile number before logging in.", HttpStatus.FORBIDDEN);
    }

    const session = await this.session.issueSession(user.id, user.role, meta);
    return { user: toPublicUser(user), session };
  }

  async refresh(refreshToken: string, meta: { userAgent?: string; ipAddress?: string } = {}): Promise<IssuedSession> {
    return this.session.rotate(refreshToken, meta);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.session.revoke(refreshToken);
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.session.revokeAllForUser(userId);
  }
}
