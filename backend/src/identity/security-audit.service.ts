import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecurityAuditEventEntity } from './entities/security-audit-event.entity';

export interface SecurityAuditInput {
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class SecurityAuditService {
  constructor(
    @InjectRepository(SecurityAuditEventEntity)
    private readonly events: Repository<SecurityAuditEventEntity>,
  ) {}

  async record(input: SecurityAuditInput): Promise<void> {
    await this.events.save(
      this.events.create({
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        metadata: input.metadata ?? {},
        createdAt: new Date(),
      }),
    );
  }
}
