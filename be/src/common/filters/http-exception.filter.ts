import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ErrorCode } from '../errors/error-codes';
import type { ApiErrorResponse } from '../types/api-response';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<{ id?: string }>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : undefined;
    const payload = typeof exceptionResponse === 'object' && exceptionResponse !== null ? exceptionResponse : {};
    const payloadRecord = payload as Record<string, unknown>;
    const validationMessage = Array.isArray(payloadRecord.message) ? payloadRecord.message.join(', ') : payloadRecord.message;
    const isApplicationError = typeof payloadRecord.code === 'string';
    const body: ApiErrorResponse = {
      success: false,
      error: {
        code: isApplicationError
          ? payloadRecord.code as string
          : status === HttpStatus.BAD_REQUEST
            ? ErrorCode.VALIDATION_FAILED
            : status >= 500
              ? ErrorCode.INTERNAL_ERROR
              : ErrorCode.AUTH_UNAUTHORIZED,
        message: typeof validationMessage === 'string'
          ? validationMessage
          : status >= 500
            ? 'Internal server error'
            : 'Request failed',
        ...(payloadRecord.details !== undefined ? { details: payloadRecord.details } : {}),
      },
      meta: { requestId: request.id, timestamp: new Date().toISOString() },
    };
    response.status(status).json(body);
  }
}
