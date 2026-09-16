import { ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '../../generated/prisma/client.js';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    switch (exception.code) {
      case 'P2002':
        response.status(HttpStatus.CONFLICT).json({
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'A record with this value already exists',
          },
        });
        break;
      case 'P2025':
        response.status(HttpStatus.NOT_FOUND).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Record not found',
          },
        });
        break;
      default:
        super.catch(exception, host);
        break;
    }
  }
}
