import { UserEntity } from './entities/user.entity';
import { UserSessionEntity } from './entities/user-session.entity';

export interface AuthContext {
  user: UserEntity;
  session: UserSessionEntity;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}
