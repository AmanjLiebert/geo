import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Unique } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity({ name: 'external_identities' })
@Unique('uq_external_identity_provider_subject', ['provider', 'providerSubject'])
export class ExternalIdentityEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 40 })
  provider!: string;

  @Column({ name: 'provider_subject', type: 'varchar', length: 191 })
  providerSubject!: string;

  @Column({ name: 'sign_in_provider', type: 'varchar', length: 80, nullable: true })
  signInProvider!: string | null;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => UserEntity, (user) => user.identities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
}
