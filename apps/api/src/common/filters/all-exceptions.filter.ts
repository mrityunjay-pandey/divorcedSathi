import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";
import { ErrorCode } from "../errors/error-codes";
import { AppException } from "../errors/app-exception";

interface ErrorBody {
  success: false;
  error: { code: ErrorCode | string; message: string };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionFilter");

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof AppException) {
      const status = exception.getStatus();
      const body: ErrorBody = { success: false, error: { code: exception.code, message: exception.message } };
      response.status(status).json(body);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      // class-validator ValidationPipe throws a 400 with { message: string[] }.
      const message =
        typeof raw === "string"
          ? raw
          : Array.isArray((raw as { message?: unknown }).message)
            ? (raw as { message: string[] }).message.join(" ")
            : ((raw as { message?: string }).message ?? exception.message);
      const code = status === HttpStatus.BAD_REQUEST ? ErrorCode.VALIDATION_FAILED : ErrorCode.INTERNAL_ERROR;
      const body: ErrorBody = { success: false, error: { code, message } };
      response.status(status).json(body);
      return;
    }

    // Unknown/unexpected error: log full detail server-side, return nothing
    // identifying internals to the client.
    this.logger.error(exception instanceof Error ? exception.stack : exception);
    const body: ErrorBody = {
      success: false,
      error: { code: ErrorCode.INTERNAL_ERROR, message: "Something went wrong. Please try again." },
    };
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}
