import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { UserRole, UserStatus } from '../access-control';
import { ExternalIdentityEntity } from './external-identity.entity';
import { UserSessionEntity } from './user-session.entity';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: UserRole, enumName: 'app_role' })
  role!: UserRole;

  @Column({ type: 'enum', enum: UserStatus, enumName: 'user_status' })
  status!: UserStatus;

  @Column({ name: 'display_name', type: 'varchar', length: 160, nullable: true })
  displayName!: string | null;

  @Column({ type: 'varchar', length: 320, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone!: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'last_signed_in_at', type: 'timestamptz', nullable: true })
  lastSignedInAt!: Date | null;

  @OneToMany(() => ExternalIdentityEntity, (identity) => identity.user)
  identities!: ExternalIdentityEntity[];

  @OneToMany(() => UserSessionEntity, (session) => session.user)
  sessions!: UserSessionEntity[];
}
