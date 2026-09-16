import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleLoginDto {
  @ApiProperty({ description: 'Google access token' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  accessToken: string;
}
