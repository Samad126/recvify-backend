import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ default: 'u1@gm.com' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ default: '12345678' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}
