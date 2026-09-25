import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'permissions' })
export class PermissionEntity {
  @PrimaryColumn({ name: 'stable_key', type: 'varchar', length: 100 })
  stableKey!: string;

  @Column({ type: 'varchar', length: 240 })
  description!: string;

  @Column({ name: 'risk_level', type: 'varchar', length: 20 })
  riskLevel!: string;
}
