import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'The user id (uuid) from the reset link' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'The raw reset token from the reset link' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  token: string;

  @ApiProperty({ minLength: 8, description: 'The new password to set' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}
