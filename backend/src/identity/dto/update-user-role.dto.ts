import { IsEnum } from 'class-validator';
import { UserRole } from '../access-control';

export class UpdateUserRoleDto {
  @IsEnum(UserRole)
  role!: UserRole;
}
