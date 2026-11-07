import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import * as usersService from './users.service';

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const user = await usersService.updateProfile(req.user.id.toString(), req.body);
  res.status(200).json({ user });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  await usersService.changePassword(req.user.id.toString(), req.body);
  res.status(200).json({ message: 'Password updated. Please sign in again on other devices.' });
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const result = await usersService.listUsers(req.query as Record<string, unknown>);
  res.status(200).json(result);
});

export const setRole = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.setRole(req.params.id as string, req.body.role);
  res.status(200).json({ user });
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  await usersService.deleteUser(req.params.id as string);
  res.status(200).json({ message: 'User deleted' });
});
