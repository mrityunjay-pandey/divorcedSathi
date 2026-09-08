import { CanActivate, ExecutionContext, HttpStatus, Injectable } from "@nestjs/common";
import { AppException } from "@/common/errors/app-exception";
import { ErrorCode } from "@/common/errors/error-codes";
import type { AuthenticatedRequest } from "./jwt-auth.guard";

/**
 * Role check only — identity is already established by JwtAuthGuard, which
 * must run first (`@UseGuards(JwtAuthGuard, AdminGuard)`, in that order;
 * Nest runs guards left-to-right). This guard trusts request.user.role
 * exactly because it came from a verified JWT, not from anything
 * client-supplied.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user?.role !== "ADMIN") {
      throw new AppException(ErrorCode.FORBIDDEN, "Admin access required.", HttpStatus.FORBIDDEN);
    }
    return true;
  }
}
