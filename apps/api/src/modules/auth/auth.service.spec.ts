import { Test } from "@nestjs/testing";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { PasswordService } from "./services/password.service";
import { OtpService } from "./services/otp.service";
import { SessionService } from "./services/session.service";
import { PrismaService } from "@/common/prisma/prisma.module";
import { EMAIL_PROVIDER } from "./providers/email-provider";
import { SMS_PROVIDER } from "./providers/sms-provider";
import { AppException } from "@/common/errors/app-exception";
import { ErrorCode } from "@/common/errors/error-codes";
import { Gender, MarriageStatus, UserRole, UserStatus, type User } from "@divorcedsathi/db";

type MockPrisma = {
  client: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    otpCode: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    refreshSession: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
};

function baseUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    firstName: "Priya",
    lastName: null,
    email: "priya@example.com",
    mobileNumber: null,
    passwordHash: "irrelevant-in-most-tests",
    dateOfBirth: new Date("1990-01-01"),
    gender: Gender.FEMALE,
    city: "Pune",
    marriageStatus: MarriageStatus.DIVORCED,
    emailVerifiedAt: new Date(),
    mobileVerifiedAt: null,
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("AuthService", () => {
  let service: AuthService;
  let prisma: MockPrisma;
  let password: PasswordService;
  let emailProvider: { sendOtp: jest.Mock };
  let smsProvider: { sendOtp: jest.Mock };

  beforeEach(async () => {
    prisma = {
      client: {
        user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
        otpCode: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
        refreshSession: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
      },
    };
    emailProvider = { sendOtp: jest.fn() };
    smsProvider = { sendOtp: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: "test-secret", signOptions: { expiresIn: "15m" } })],
      providers: [
        AuthService,
        PasswordService,
        OtpService,
        SessionService,
        { provide: PrismaService, useValue: prisma },
        { provide: EMAIL_PROVIDER, useValue: emailProvider },
        { provide: SMS_PROVIDER, useValue: smsProvider },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    password = moduleRef.get(PasswordService);
  });

  describe("register", () => {
    const validDto = {
      firstName: "Priya",
      email: "priya@example.com",
      password: "correct-horse-battery",
      gender: "female" as const,
      dateOfBirth: "1990-01-01",
      city: "Pune",
      marriageStatus: "divorced" as const,
    };

    it("rejects registrants under 18", async () => {
      const under18 = new Date();
      under18.setFullYear(under18.getFullYear() - 17);

      await expect(
        service.register({ ...validDto, dateOfBirth: under18.toISOString() }),
      ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_FAILED });

      expect(prisma.client.user.create).not.toHaveBeenCalled();
    });

    it("rejects a duplicate email with a 409-mapped error", async () => {
      prisma.client.user.findUnique.mockResolvedValueOnce(baseUser());

      await expect(service.register(validDto)).rejects.toMatchObject({
        code: ErrorCode.EMAIL_ALREADY_REGISTERED,
      });
    });

    it("hashes the password before persisting — never stores it in plaintext", async () => {
      prisma.client.user.findUnique.mockResolvedValueOnce(null);
      prisma.client.user.create.mockResolvedValueOnce(baseUser());

      await service.register(validDto);

      const createArgs = prisma.client.user.create.mock.calls[0][0];
      expect(createArgs.data.passwordHash).not.toBe(validDto.password);
      expect(await password.verify(createArgs.data.passwordHash, validDto.password)).toBe(true);
    });

    it("sends an OTP to the provided email via the email provider adapter", async () => {
      prisma.client.user.findUnique.mockResolvedValueOnce(null);
      prisma.client.user.create.mockResolvedValueOnce(baseUser());

      await service.register(validDto);

      expect(emailProvider.sendOtp).toHaveBeenCalledWith(validDto.email, expect.stringMatching(/^\d{6}$/));
      expect(smsProvider.sendOtp).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("returns a generic error for a non-existent account (no user enumeration)", async () => {
      prisma.client.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.login({ email: "nobody@example.com", password: "whatever123" }),
      ).rejects.toMatchObject({ code: ErrorCode.INVALID_CREDENTIALS });
    });

    it("returns the same generic error for a wrong password", async () => {
      const hash = await password.hash("correct-password");
      prisma.client.user.findUnique.mockResolvedValueOnce(baseUser({ passwordHash: hash }));

      await expect(
        service.login({ email: "priya@example.com", password: "wrong-password" }),
      ).rejects.toMatchObject({ code: ErrorCode.INVALID_CREDENTIALS });
    });

    it("blocks login for a suspended account even with correct credentials", async () => {
      const hash = await password.hash("correct-password");
      prisma.client.user.findUnique.mockResolvedValueOnce(
        baseUser({ passwordHash: hash, status: UserStatus.SUSPENDED }),
      );

      await expect(
        service.login({ email: "priya@example.com", password: "correct-password" }),
      ).rejects.toMatchObject({ code: ErrorCode.ACCOUNT_SUSPENDED });
    });

    it("blocks login for an unverified account", async () => {
      const hash = await password.hash("correct-password");
      prisma.client.user.findUnique.mockResolvedValueOnce(
        baseUser({ passwordHash: hash, emailVerifiedAt: null, mobileVerifiedAt: null }),
      );

      await expect(
        service.login({ email: "priya@example.com", password: "correct-password" }),
      ).rejects.toMatchObject({ code: ErrorCode.ACCOUNT_NOT_VERIFIED });
    });

    it("issues a session for a verified, active account with correct credentials", async () => {
      const hash = await password.hash("correct-password");
      prisma.client.user.findUnique.mockResolvedValueOnce(baseUser({ passwordHash: hash }));
      prisma.client.refreshSession.create.mockResolvedValueOnce({});

      const result = await service.login({ email: "priya@example.com", password: "correct-password" });

      expect(result.session.accessToken).toEqual(expect.any(String));
      expect(result.session.refreshToken).toEqual(expect.any(String));
      expect(result.user.email).toBe("priya@example.com");
    });
  });

  describe("verifyOtp", () => {
    it("throws OTP_INVALID when no matching code exists", async () => {
      prisma.client.otpCode.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.verifyOtp({ email: "priya@example.com", identifierType: "EMAIL", code: "123456" }),
      ).rejects.toBeInstanceOf(AppException);
    });

    it("marks the account verified on a correct, unexpired code", async () => {
      const crypto = await import("node:crypto");
      const codeHash = crypto.createHash("sha256").update("123456").digest("hex");
      prisma.client.otpCode.findFirst.mockResolvedValueOnce({
        id: "otp-1",
        attempts: 0,
        maxAttempts: 5,
        codeHash,
        expiresAt: new Date(Date.now() + 60_000),
      });
      prisma.client.user.update.mockResolvedValueOnce(baseUser());

      const result = await service.verifyOtp({ email: "priya@example.com", identifierType: "EMAIL", code: "123456" });

      expect(prisma.client.otpCode.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { consumedAt: expect.any(Date) } }),
      );
      expect(result.user.email).toBe("priya@example.com");
    });
  });
});
