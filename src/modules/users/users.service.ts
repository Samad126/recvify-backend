import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

const PROFILE_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
  plan: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async getProfile(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: PROFILE_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.db.user.update({
      where: { id: userId },
      data: dto,
      select: PROFILE_SELECT,
    });
  }
}
