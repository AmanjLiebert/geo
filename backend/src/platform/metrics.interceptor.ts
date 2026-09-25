import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Observable, tap } from 'rxjs';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const response = http.getResponse<FastifyReply>();
    const startedAt = process.hrtime.bigint();
    const route = request.routeOptions?.url ?? 'unmatched';

    const observe = (status: number): void => {
      const seconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
      this.metrics.observeRequest(request.method, route, status, seconds);
    };

    return next.handle().pipe(
      tap({
        next: () => observe(response.statusCode),
        error: (error: unknown) =>
          observe(error instanceof HttpException ? error.getStatus() : 500),
      }),
    );
  }
}
