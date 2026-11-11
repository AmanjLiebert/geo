import { IsEmail, IsEnum, IsPhoneNumber, IsString, MaxLength, ValidateIf } from 'class-validator';
import { UserRole } from '../access-control';
import { InvitationRecipientType } from '../entities/identity-invitation.entity';

export class CreateInvitationDto {
  @IsEnum(InvitationRecipientType)
  recipientType!: InvitationRecipientType;

  @IsString()
  @MaxLength(320)
  @ValidateIf((input: CreateInvitationDto) => input.recipientType === InvitationRecipientType.EMAIL)
  @IsEmail()
  @ValidateIf((input: CreateInvitationDto) => input.recipientType === InvitationRecipientType.PHONE)
  @IsPhoneNumber()
  recipient!: string;

  @IsEnum(UserRole)
  role!: UserRole.TEACHER | UserRole.ADMIN;
}
