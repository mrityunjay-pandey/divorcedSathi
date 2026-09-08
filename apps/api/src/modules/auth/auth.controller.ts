import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto, RefreshDto, ResendOtpDto, VerifyOtpDto } from "./dto";
import { JwtAuthGuard, type AuthenticatedRequest } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import type { AccessTokenPayload } from "./services/session.service";

function requestMeta(req: Request) {
  return { userAgent: req.headers["user-agent"], ipAddress: req.ip };
}

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  async register(@Body() dto: RegisterDto) {
    const result = await this.auth.register(dto);
    return { success: true, data: result };
  }

  @Post("otp/resend")
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body() dto: ResendOtpDto) {
    await this.auth.resendOtp(dto);
    // Deliberately generic — see AuthService.resendOtp for why.
    return { success: true, data: { message: "If an account exists, a code has been sent." } };
  }

  @Post("otp/verify")
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    const result = await this.auth.verifyOtp(dto);
    return { success: true, data: result };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const result = await this.auth.login(dto, requestMeta(req));
    return { success: true, data: result };
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    const session = await this.auth.refresh(dto.refreshToken, requestMeta(req));
    return { success: true, data: { session } };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: RefreshDto) {
    await this.auth.logout(dto.refreshToken);
    return { success: true, data: null };
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout-all")
  @HttpCode(HttpStatus.OK)
  async logoutAll(@CurrentUser() user: AccessTokenPayload) {
    await this.auth.logoutAllDevices(user.sub);
    return { success: true, data: null };
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser() user: AccessTokenPayload) {
    return { success: true, data: { userId: user.sub, role: user.role } };
  }
}
