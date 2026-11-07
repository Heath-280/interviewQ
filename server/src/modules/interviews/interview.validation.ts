import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const createInterviewSchema = z.object({
  role: z.string().trim().min(2, 'Job title is required').max(120),
  company: z.string().trim().max(120).optional().default(''),
  jobDescription: z.string().trim().max(8000).optional().default(''),
  resumeId: objectId.optional().nullable(),
  type: z.enum(['technical', 'hr', 'behavioral', 'mixed']).default('mixed'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  questionCount: z.coerce.number().int().min(3).max(15).default(6),
});

export const submitAnswerSchema = z.object({
  answer: z
    .string()
    .trim()
    .min(1, 'Please write an answer before submitting')
    .max(6000, 'Answer is too long'),
});

export const followUpAnswerSchema = z.object({
  answer: z.string().trim().min(1, 'Please write an answer').max(6000),
});

export const listInterviewsSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: z.enum(['created', 'in_progress', 'completed', 'abandoned']).optional(),
  type: z.enum(['technical', 'hr', 'behavioral', 'mixed']).optional(),
  search: z.string().trim().max(120).optional(),
});

export type CreateInterviewInput = z.infer<typeof createInterviewSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
