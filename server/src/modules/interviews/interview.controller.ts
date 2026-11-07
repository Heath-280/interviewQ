import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { Interview } from '../../models/Interview';
import { User } from '../../models/User';
import { generateInterviewReport } from '../../services/report/reportGenerator';
import * as interviewService from './interview.service';

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const { interview, warning } = await interviewService.createInterview(
    req.user.id.toString(),
    req.body,
  );
  res.status(201).json({ interview, warning });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const result = await interviewService.listInterviews(
    req.user.id.toString(),
    req.query as Record<string, unknown>,
  );
  res.status(200).json(result);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const interview = await interviewService.getInterview(
    req.user.id.toString(),
    req.params.id as string,
  );
  res.status(200).json({ interview });
});

export const submitAnswer = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const result = await interviewService.submitAnswer(
    req.user.id.toString(),
    req.params.id as string,
    req.params.questionId as string,
    req.body,
  );
  res.status(200).json({
    interview: result.interview,
    evaluation: result.evaluation,
    warning: result.warning,
    source: result.source,
  });
});

export const requestFollowUp = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const result = await interviewService.requestFollowUp(
    req.user.id.toString(),
    req.params.id as string,
    req.params.questionId as string,
  );
  res.status(200).json({ interview: result.interview, warning: result.warning, source: result.source });
});

export const answerFollowUp = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const result = await interviewService.answerFollowUp(
    req.user.id.toString(),
    req.params.id as string,
    req.params.questionId as string,
    req.params.followUpId as string,
    req.body.answer,
  );
  res.status(200).json({
    interview: result.interview,
    evaluation: result.evaluation,
    warning: result.warning,
    source: result.source,
  });
});

export const complete = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const result = await interviewService.completeInterview(
    req.user.id.toString(),
    req.params.id as string,
  );
  res.status(200).json({ interview: result.interview, warning: result.warning });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  await interviewService.deleteInterview(req.user.id.toString(), req.params.id as string);
  res.status(200).json({ message: 'Interview deleted' });
});

export const report = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const id = req.params.id as string;
  const [interview, user] = await Promise.all([
    Interview.findOne({ _id: id, userId: req.user.id }),
    User.findById(req.user.id),
  ]);
  if (!interview) throw ApiError.notFound('Interview not found');
  if (!user) throw ApiError.notFound('User not found');

  const pdf = await generateInterviewReport(interview, user);
  const safeRole = interview.role.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="interviewiq-${safeRole}-${interview._id.toString()}.pdf"`,
  );
  res.setHeader('Content-Length', pdf.length.toString());
  res.send(pdf);
});

export const reportJson = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const interview = await interviewService.getInterview(
    req.user.id.toString(),
    req.params.id as string,
  );
  res.status(200).json({ interview, generatedAt: new Date().toISOString() });
});
