import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { DatabaseModule } from '../../common/database/database.module.js';
import { LocalStrategy } from './strategies/local.strategy.js';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy.js';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy.js';
import { MailModule } from '../../common/mail/mail.module.js';

@Module({
  imports: [
    DatabaseModule,
    PassportModule.register({}),
    JwtModule.register({}),
    MailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtAccessStrategy,
    JwtRefreshStrategy,
  ],
})
export class AuthModule {}
