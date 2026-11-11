import { Entity, PrimaryColumn } from 'typeorm';
import { UserRole } from '../access-control';

@Entity({ name: 'role_permissions' })
export class RolePermissionEntity {
  @PrimaryColumn({ type: 'enum', enum: UserRole, enumName: 'app_role' })
  role!: UserRole;

  @PrimaryColumn({ name: 'permission_key', type: 'varchar', length: 100 })
  permissionKey!: string;
}
