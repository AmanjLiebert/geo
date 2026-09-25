import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { FastifyReply, FastifyRequest } from 'fastify';
import { PinoLogger } from 'nestjs-pino';

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  requestId: string;
  timestamp: string;
}

function exceptionDetail(exception: HttpException, status: number): string {
  if (status >= 500) {
    return 'The server could not complete the request.';
  }

  const response = exception.getResponse();
  if (typeof response === 'string') {
    return response;
  }

  const message = (response as Record<string, unknown>).message;
  if (Array.isArray(message)) {
    return message.filter((item): item is string => typeof item === 'string').join('; ');
  }
  return typeof message === 'string' ? message : exception.message;
}

@Injectable()
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ProblemDetailsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<FastifyRequest>();
    const response = context.getResponse<FastifyReply>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const detail =
      exception instanceof HttpException
        ? exceptionDetail(exception, status)
        : 'The server could not complete the request.';

    if (status >= 500) {
      this.logger.error(
        {
          err: exception,
          requestId: request.id,
          method: request.method,
          url: request.url,
        },
        'Unhandled request failure',
      );
    }

    const problem: ProblemDetails = {
      type: 'about:blank',
      title: HttpStatus[status] ?? 'Error',
      status,
      detail,
      instance: request.url,
      requestId: request.id,
      timestamp: new Date().toISOString(),
    };

    this.adapterHost.httpAdapter.setHeader(response, 'content-type', 'application/problem+json');
    this.adapterHost.httpAdapter.reply(response, problem, status);
  }
}
