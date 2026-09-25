import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'security_audit_events' })
export class SecurityAuditEventEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId!: string | null;

  @Column({ type: 'varchar', length: 100 })
  action!: string;

  @Column({ name: 'target_type', type: 'varchar', length: 60 })
  targetType!: string;

  @Column({ name: 'target_id', type: 'varchar', length: 191, nullable: true })
  targetId!: string | null;

  @Column({ type: 'jsonb' })
  metadata!: Record<string, unknown>;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
