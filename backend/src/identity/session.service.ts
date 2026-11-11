import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { UserStatus } from './access-control';
import { AuthContext } from './auth-context';
import { UserSessionEntity } from './entities/user-session.entity';
import { hashToken } from './identity.utils';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(UserSessionEntity)
    private readonly sessions: Repository<UserSessionEntity>,
  ) {}

  async authenticate(rawToken: string | undefined): Promise<AuthContext> {
    if (!rawToken) {
      throw new UnauthorizedException('A valid session is required.');
    }

    const session = await this.sessions.findOne({
      where: { tokenHash: hashToken(rawToken) },
      relations: { user: true },
    });
    const now = new Date();

    if (
      !session ||
      session.revokedAt !== null ||
      session.expiresAt <= now ||
      session.user.status !== UserStatus.ACTIVE
    ) {
      throw new UnauthorizedException('The session is invalid or has expired.');
    }

    if (now.getTime() - session.lastSeenAt.getTime() >= 5 * 60 * 1_000) {
      session.lastSeenAt = now;
      await this.sessions.update({ id: session.id, revokedAt: IsNull() }, { lastSeenAt: now });
    }

    return { user: session.user, session };
  }

  async revoke(sessionId: string): Promise<void> {
    await this.sessions.update({ id: sessionId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.sessions
      .createQueryBuilder()
      .update(UserSessionEntity)
      .set({ revokedAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL')
      .execute();
  }
}
