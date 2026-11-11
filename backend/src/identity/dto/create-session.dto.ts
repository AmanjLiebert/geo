import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @MinLength(20)
  @MaxLength(10_000)
  idToken!: string;

  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(512)
  invitationToken?: string;
}
