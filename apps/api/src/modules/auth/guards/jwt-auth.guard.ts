import { CanActivate, ExecutionContext, HttpStatus, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { AppException } from "@/common/errors/app-exception";
import { ErrorCode } from "@/common/errors/error-codes";
import type { AccessTokenPayload } from "../services/session.service";

export interface AuthenticatedRequest extends Request {
  user: AccessTokenPayload;
}

/**
 * Every route that isn't explicitly public must be behind this guard.
 * Authorization (does this user own this resource?) is a separate concern
 * handled per-module — this guard only establishes *who* is calling.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new AppException(ErrorCode.UNAUTHORIZED, "Authentication required.", HttpStatus.UNAUTHORIZED);
    }

    const token = authHeader.slice("Bearer ".length);
    try {
      request.user = await this.jwt.verifyAsync<AccessTokenPayload>(token);
      return true;
    } catch {
      throw new AppException(ErrorCode.UNAUTHORIZED, "Your session has expired. Please log in again.", HttpStatus.UNAUTHORIZED);
    }
  }
}
