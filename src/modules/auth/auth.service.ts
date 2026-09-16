import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import { DatabaseService } from '../../common/database/database.service.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from './dto/register.dto.js';
import { RedisService } from '../../common/redis/redis.service.js';
import { MailService } from '../../common/mail/mail.service.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private static readonly RESET_TOKEN_TTL = 15 * 60; // 15 minutes, matches the reset email copy

  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.db.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already in use');

    const hashedPassword = await argon2.hash(dto.password);
    const user = await this.db.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        hashedPassword,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    this.logger.log(`User registered: ${user.email}`);
    return tokens;
  }

  async validateUser(email: string, password: string) {
    const user = await this.db.user.findUnique({ where: { email } });
    if (!user || !user.hashedPassword)
      throw new UnauthorizedException('Invalid credentials');

    const isValid = await argon2.verify(user.hashedPassword, password);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    return user;
  }

  async login(userId: string, email: string) {
    const tokens = await this.generateTokens(userId, email);
    await this.updateRefreshToken(userId, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: string, accessToken: string) {
    await this.db.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: null },
    });

    const payload = this.jwtService.decode<{ jti?: string; exp?: number }>(
      accessToken,
    );
    if (payload?.jti && payload?.exp) {
      const ttl = payload.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await this.redis.setex(`bl:${payload.jti}`, ttl, '1');
      }
    }

    this.logger.log(`User ${userId} logged out`);
  }

  async refreshTokens(userId: string, email: string, refreshToken: string) {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user || !user.hashedRefreshToken)
      throw new ForbiddenException('Access denied');

    const isValid = await argon2.verify(user.hashedRefreshToken, refreshToken);
    if (!isValid) throw new ForbiddenException('Access denied');

    const tokens = await this.generateTokens(userId, email);
    await this.updateRefreshToken(userId, tokens.refreshToken);
    return tokens;
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.db.user.findUnique({ where: { email } });

    // Always respond the same way to prevent email enumeration
    if (!user || !user.hashedPassword) return;

    const rawToken = randomBytes(32).toString('hex');
    const hashedToken = createHash('sha256').update(rawToken).digest('hex');

    await this.redis.setex(
      `pr:${user.id}`,
      AuthService.RESET_TOKEN_TTL,
      hashedToken,
    );

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}&uid=${user.id}`;

    await this.mail.sendPasswordResetEmail(user.email, resetUrl);
    this.logger.log(`Password reset requested for user ${user.id}`);
  }

  async resetPassword(
    userId: string,
    rawToken: string,
    newPassword: string,
  ): Promise<void> {
    const stored = await this.redis.get(`pr:${userId}`);
    if (!stored)
      throw new BadRequestException('Invalid or expired reset token');

    const hashedToken = createHash('sha256').update(rawToken).digest('hex');
    const storedBuf = Buffer.from(stored, 'hex');
    const incomingBuf = Buffer.from(hashedToken, 'hex');

    const isValid =
      storedBuf.length === incomingBuf.length &&
      timingSafeEqual(storedBuf, incomingBuf);

    if (!isValid)
      throw new BadRequestException('Invalid or expired reset token');

    // Consume the token immediately (single-use)
    await this.redis.del(`pr:${userId}`);

    const hashedPassword = await argon2.hash(newPassword);
    await this.db.user.update({
      where: { id: userId },
      data: {
        hashedPassword,
        hashedRefreshToken: null, // invalidate all active sessions
      },
    });

    this.logger.log(`Password reset completed for user ${userId}`);
  }

  async googleLogin(accessToken: string) {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) throw new BadRequestException('Invalid Google access token');

    const {
      sub: googleId,
      email,
      given_name,
      family_name,
    } = (await res.json()) as {
      sub: string;
      email: string;
      given_name?: string;
      family_name?: string;
    };

    if (!googleId || !email)
      throw new BadRequestException('Invalid Google token');

    let user = await this.db.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
    });

    if (!user) {
      user = await this.db.user.create({
        data: {
          googleId,
          email,
          firstName: given_name ?? email.split('@')[0],
          lastName: family_name ?? '',
        },
      });
    } else if (!user.googleId) {
      user = await this.db.user.update({
        where: { id: user.id },
        data: { googleId },
      });
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  private async generateTokens(userId: string, email: string) {
    const jti = randomUUID();
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email, jti },
        {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
          expiresIn: '15m',
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, email },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: '7d',
        },
      ),
    ]);
    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const hashed = await argon2.hash(refreshToken);
    await this.db.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: hashed },
    });
  }
}
