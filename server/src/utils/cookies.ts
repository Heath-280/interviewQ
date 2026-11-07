import type { CookieOptions, Response } from 'express';
import { env, isProd } from '../config/env';
import { parseDurationToMs } from './token';

export const ACCESS_COOKIE = 'iiq_access';
export const REFRESH_COOKIE = 'iiq_refresh';

function baseCookie(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE || isProd,
    sameSite: env.COOKIE_SECURE || isProd ? 'none' : 'lax',
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/',
  };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseCookie(),
    maxAge: parseDurationToMs(env.JWT_ACCESS_EXPIRES_IN),
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookie(),
    maxAge: parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN),
    path: '/api/auth',
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { ...baseCookie() });
  res.clearCookie(REFRESH_COOKIE, { ...baseCookie(), path: '/api/auth' });
}

export const REFRESH_COOKIE_PATH = '/api/auth';
