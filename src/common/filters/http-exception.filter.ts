import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const res = exception.getResponse();

    const message =
      typeof res === 'string'
        ? res
        : (res as { message?: string | string[] }).message;

    response.status(status).json({
      success: false,
      error: {
        code: exception.constructor.name.replace('Exception', '').toUpperCase(),
        message: Array.isArray(message) ? message.join('; ') : message,
      },
    });
  }
}
