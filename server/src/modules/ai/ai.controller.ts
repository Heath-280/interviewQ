import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { getStatus } from '../../services/ai/aiService';

export const status = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(getStatus());
});
