import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator.js';
import { UsersService } from './users.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UserEntity } from './dto/user.entity.js';

@ApiBearerAuth('accessToken')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: "Get the current user's profile" })
  @ApiOkResponse({ type: UserEntity })
  getMe(@GetUser('sub') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: "Update the current user's profile" })
  @ApiOkResponse({ type: UserEntity })
  updateMe(@GetUser('sub') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }
}
