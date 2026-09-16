import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import { GoogleLoginDto } from './dto/google-login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { LocalAuthGuard } from '../../common/guards/local-auth.guard.js';
import { JwtRefreshGuard } from '../../common/guards/jwt-refresh.guard.js';
import { GetUser } from '../../common/decorators/get-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Throttle } from '@nestjs/throttler';
import { JwtPayload } from './types/jwt-payload.type.js';
import { extractJwtFromCookieOrHeader } from './util/jwtExtractor.js';
import type { User } from '../../generated/prisma/client.js';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register')
  @ApiOperation({ summary: 'Register with email & password' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.register(dto);
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return tokens;
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Login with email & password' })
  @ApiBody({ type: LoginDto })
  async login(
    @GetUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.login(user.id, user.email);
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return tokens;
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: 'Logout (invalidates refresh token)' })
  async logout(
    @GetUser('sub') userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const accessToken = extractJwtFromCookieOrHeader(req) ?? '';
    await this.authService.logout(userId, accessToken);
    const isProd = process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.COOKIE_DOMAIN;
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      ...(isProd && cookieDomain && { domain: cookieDomain }),
    });
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('google')
  @ApiOperation({ summary: 'Login with Google ID token' })
  async googleLogin(
    @Body() dto: GoogleLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.googleLogin(dto.accessToken);
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return tokens;
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({ summary: 'Get new access + refresh tokens' })
  @ApiBody({ type: RefreshDto })
  async refresh(
    @GetUser() user: JwtPayload & { refreshToken: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.refreshTokens(
      user.sub,
      user.email,
      user.refreshToken,
    );
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return tokens;
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 120_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: 'If that email exists, a reset link has been sent.' };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 120_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using token from email' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(
      dto.userId,
      dto.token,
      dto.newPassword,
    );
    return { message: 'Password updated successfully.' };
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string) {
    const isProd = process.env.NODE_ENV === 'production';
    const cookieDomain = this.configService.get<string>('COOKIE_DOMAIN');

    if (isProd) {
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
      });
    }

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      ...(isProd && cookieDomain && { domain: cookieDomain }),
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
