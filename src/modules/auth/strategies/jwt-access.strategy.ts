import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { extractJwtFromCookieOrHeader } from '../util/jwtExtractor.js';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../types/jwt-payload.type.js';
import { RedisService } from '../../../common/redis/redis.service.js';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(
  Strategy,
  'jwt-access',
) {
  constructor(
    configService: ConfigService,
    private readonly redis: RedisService,
  ) {
    super({
      jwtFromRequest: extractJwtFromCookieOrHeader,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (payload.jti && (await this.redis.exists(`bl:${payload.jti}`))) {
      throw new UnauthorizedException('Token has been revoked');
    }
    return payload;
  }
}
