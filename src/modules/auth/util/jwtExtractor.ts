import { Request } from 'express';

export const extractJwtFromCookieOrHeader = (req: Request): string | null => {
  // 1. Check the Authorization header
  if (req.headers.authorization) {
    const [type, token] = req.headers.authorization.split(' ');
    if (type === 'Bearer' && token) {
      return token;
    }
  }

  // 2. Check the cookie
  if (req.cookies && req.cookies['accessToken']) {
    // Replace 'accessToken' with your cookie name
    return req.cookies['accessToken'] as string;
  }

  return null;
};
