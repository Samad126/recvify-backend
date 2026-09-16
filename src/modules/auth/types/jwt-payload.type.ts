export interface JwtPayload {
  sub: string;
  email: string;
  jti: string;
  exp?: number;
}
