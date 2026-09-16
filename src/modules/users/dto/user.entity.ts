import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Plan } from '../../../generated/prisma/client.js';

export class UserEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  avatarUrl: string | null;

  @ApiProperty({ enum: Plan })
  plan: Plan;
}
