import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'Account email to send the reset link to' })
  @IsEmail()
  @MaxLength(254)
  email: string;
}
