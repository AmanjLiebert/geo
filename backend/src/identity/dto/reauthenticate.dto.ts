import { IsString, MaxLength, MinLength } from 'class-validator';

export class ReauthenticateDto {
  @IsString()
  @MinLength(20)
  @MaxLength(10_000)
  idToken!: string;
}
