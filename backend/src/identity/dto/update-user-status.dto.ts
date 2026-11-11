import { IsEnum } from 'class-validator';
import { UserStatus } from '../access-control';

export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  status!: UserStatus;
}
