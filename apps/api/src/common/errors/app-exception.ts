import { HttpException, HttpStatus } from "@nestjs/common";
import { ErrorCode } from "./error-codes";

/**
 * Every deliberately-thrown domain error goes through this class so the
 * response body always has the shape { success: false, error: { code, message } }
 * and never leaks internals (stack traces, DB errors, etc — see
 * docs/ARCHITECTURE.md §"Security Architecture" / brief §42).
 */
export class AppException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ code, message }, status);
  }
}
