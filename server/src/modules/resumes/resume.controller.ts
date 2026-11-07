import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { getUploadPath } from '../../middleware/upload';
import * as resumeService from './resume.service';

export const upload = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  if (!req.file) throw ApiError.badRequest('Please attach a file under the "file" field');
  const rawPrimary = req.body?.isPrimary;
  const options = rawPrimary === undefined ? {} : { isPrimary: rawPrimary === true || rawPrimary === 'true' };
  const resume = await resumeService.createResume(req.user.id.toString(), req.file, options);
  res.status(201).json({ resume });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const result = await resumeService.listResumes(
    req.user.id.toString(),
    req.query as Record<string, unknown>,
  );
  res.status(200).json(result);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const resume = await resumeService.getResume(req.user.id.toString(), req.params.id as string);
  res.status(200).json({ resume });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  await resumeService.deleteResume(req.user.id.toString(), req.params.id as string);
  res.status(200).json({ message: 'Resume deleted' });
});

export const setPrimary = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const resume = await resumeService.setPrimary(req.user.id.toString(), req.params.id as string);
  res.status(200).json({ resume });
});

export const download = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const resume = await resumeService.getResume(req.user.id.toString(), req.params.id as string);
  res.download(getUploadPath(resume.storedName), resume.originalName);
});
