import type { Response } from 'express';

export const ACCESS_COOKIE = 'hotel_session';
export const REFRESH_COOKIE = 'hotel_refresh_session';

export function setSessionCookies(response: Response, accessToken: string, refreshToken: string, refreshMaxAgeDays: number): void {
  const secure = process.env.NODE_ENV === 'production';
  const common = { httpOnly: true, sameSite: 'lax' as const, secure, path: '/' };
  response.cookie(ACCESS_COOKIE, accessToken, { ...common, maxAge: 60 * 60 * 1000 });
  response.cookie(REFRESH_COOKIE, refreshToken, { ...common, maxAge: refreshMaxAgeDays * 24 * 60 * 60 * 1000 });
}

export function clearSessionCookies(response: Response): void {
  const common = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/' };
  response.clearCookie(ACCESS_COOKIE, common);
  response.clearCookie(REFRESH_COOKIE, common);
}
