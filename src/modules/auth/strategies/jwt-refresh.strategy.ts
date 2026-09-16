import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../types/jwt-payload.type.js';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request): string | null =>
          (req?.cookies?.['refreshToken'] as string | undefined) ?? null,
        ExtractJwt.fromBodyField('refreshToken'),
      ]),
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(
    req: Request,
    payload: JwtPayload,
  ): JwtPayload & { refreshToken: string } {
    const fromCookie = req.cookies?.['refreshToken'] as string | undefined;
    const fromBody = (req.body as { refreshToken?: string } | undefined)
      ?.refreshToken;
    const refreshToken: string = (fromCookie ?? fromBody) as string;
    return { ...payload, refreshToken };
  }
}
