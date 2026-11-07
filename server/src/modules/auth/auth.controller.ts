import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from '../../utils/cookies';
import { ApiError } from '../../utils/ApiError';
import * as authService from './auth.service';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);
  setAuthCookies(res, result.accessToken, result.refreshToken);
  res.status(201).json({ user: result.user, accessToken: result.accessToken });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  setAuthCookies(res, result.accessToken, result.refreshToken);
  res.status(200).json({ user: result.user, accessToken: result.accessToken });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
  const result = await authService.refresh(token);
  setAuthCookies(res, result.accessToken, result.refreshToken);
  res.status(200).json({ user: result.user, accessToken: result.accessToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
  await authService.logout(req.user.id.toString(), token);
  clearAuthCookies(res);
  res.status(200).json({ message: 'Signed out successfully' });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const user = await authService.getMe(req.user.id.toString());
  res.status(200).json({ user });
});
