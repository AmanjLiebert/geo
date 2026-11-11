import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { Params } from 'nestjs-pino';
import { Environment } from './environment';

export function createLoggingConfig(config: ConfigService<Environment, true>): Params {
  return {
    pinoHttp: {
      level: config.get('LOG_LEVEL', { infer: true }),
      genReqId(request, response) {
        const supplied = request.headers['x-request-id'];
        const requestId =
          typeof supplied === 'string' && supplied.length <= 128 ? supplied : randomUUID();
        response.setHeader('x-request-id', requestId);
        return requestId;
      },
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'res.headers.set-cookie',
          'req.body.idToken',
          'req.body.invitationToken',
          'req.body.csrfToken',
          '*.password',
          '*.token',
          '*.secret',
        ],
        censor: '[REDACTED]',
      },
      autoLogging: {
        ignore: (request) =>
          request.url === '/health/live' ||
          request.url === '/health/ready' ||
          request.url === '/metrics',
      },
      customProps: () => ({ service: config.get('APP_NAME', { infer: true }) }),
    },
  };
}
