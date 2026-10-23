import { ArgumentsHost, Catch, HttpException, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { FastifyReply } from 'fastify';
import { ERROR_CACHE_CONTROL } from './cache.constants';

// `@Header()` is applied before the handler runs, so a thrown 5xx would inherit the public supply Cache-Control
@Catch()
export class ServerErrorNoStoreFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    if (this.getStatus(exception) >= HttpStatus.INTERNAL_SERVER_ERROR) {
      host.switchToHttp().getResponse<FastifyReply>().header('Cache-Control', ERROR_CACHE_CONTROL);
    }

    super.catch(exception, host);
  }

  protected getStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    if (this.isHttpError(exception)) {
      return exception.statusCode;
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
