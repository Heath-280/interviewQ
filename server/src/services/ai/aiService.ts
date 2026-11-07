import { z } from 'zod';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import type { GenerationSource } from '../../models/Interview';
import * as provider from './provider';
import {
  buildEvaluationPrompt,
  buildFollowUpPrompt,
  buildQuestionsPrompt,
  buildSummaryPrompt,
} from './promptBuilder';
import type {
  AIStatus,
  AnswerEvaluation,
  EvaluateAnswerParams,
  FollowUpParams,
  GeneratedQuestion,
  GenerateQuestionsParams,
  InterviewSummary,
  InterviewSummaryParams,
} from './types';

export interface AIArtifact<T> {
  data: T;
  source: GenerationSource;
  model: string;
  warning?: string;
}

const DEV_WARNING =
  'AI is not configured (missing AI_API_KEY). This content was produced by a built-in ' +
  'development template so you can exercise the full flow. It is NOT AI-generated.';

export function getStatus(): AIStatus {
  const configured = provider.isConfigured();
  return {
    configured,
    devMode: env.AI_DEV_MODE,
    model: env.AI_MODEL,
    baseUrl: env.AI_BASE_URL,
    message: configured
      ? `AI ready using model "${env.AI_MODEL}".`
      : env.AI_DEV_MODE
        ? 'AI is not configured. Running in development template mode.'
        : 'AI is not configured. Set AI_API_KEY on the server to enable AI features.',
  };
}

function ensureAvailable(): void {
  if (provider.isConfigured()) return;
  if (env.AI_DEV_MODE) return;
  throw ApiError.serviceUnavailable(
    'AI features are not configured. An administrator must set a valid AI_API_KEY on the server.',
    { code: 'AI_NOT_CONFIGURED' },
  );
}

async function run<S extends z.ZodTypeAny>(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  schema: S,
  fallback: () => z.infer<S>,
): Promise<AIArtifact<z.infer<S>>> {
  ensureAvailable();
  if (!provider.isConfigured()) {
    return { data: fallback(), source: 'dev-template', model: 'dev-template', warning: DEV_WARNING };
  }

  // LLMs occasionally return malformed or truncated JSON (even in JSON mode),
  // so retry a few times before giving up.
  const MAX_ATTEMPTS = 3;
  let lastIssues: string[] = ['malformed-json'];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const content = await provider.chat(messages, { json: true });

    let json: unknown;
    try {
      json = provider.parseJsonResponse(content);
    } catch {
      lastIssues = ['malformed-json'];
      if (attempt < MAX_ATTEMPTS) await delay(250 * attempt);
      continue;
    }

    const parsed = schema.safeParse(json);
    if (parsed.success) {
      return { data: parsed.data, source: 'ai', model: env.AI_MODEL };
    }
    lastIssues = parsed.error.issues.map((i) => i.path.join('.') || '(root)');
    if (attempt < MAX_ATTEMPTS) await delay(250 * attempt);
  }

  throw ApiError.serviceUnavailable(
    'AI returned an unexpected response shape after multiple attempts. Please retry.',
    { code: 'AI_INVALID_SHAPE', details: lastIssues },
  );
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const clamp = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

const categoryEnum = z.enum(['technical', 'hr', 'behavioral']);
const normalizeCategory = (value: string): 'technical' | 'hr' | 'behavioral' => {
  const lower = value.toLowerCase();
  if (lower.includes('tech')) return 'technical';
  if (lower.includes('hr') || lower.includes('culture')) return 'hr';
  return 'behavioral';
};

const questionsSchema = z.object({
  questions: z
    .array(
      z.object({
        category: z.string(),
        question: z.string().min(3),
      }),
    )
    .min(1),
});

const evaluationSchema = z.object({
  score: z.coerce.number(),
  summary: z.string().default(''),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  suggestedAnswer: z.string().default(''),
  tips: z.array(z.string()).default([]),
});

const followUpSchema = z.object({ followUp: z.string().min(2) });

const summarySchema = z.object({
  summary: z.string().default(''),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  skillScores: z
    .object({
      technical: z.coerce.number().default(0),
      communication: z.coerce.number().default(0),
      problemSolving: z.coerce.number().default(0),
      confidence: z.coerce.number().default(0),
    })
    .default({ technical: 0, communication: 0, problemSolving: 0, confidence: 0 }),
});

export async function generateQuestions(
  params: GenerateQuestionsParams,
): Promise<AIArtifact<GeneratedQuestion[]>> {
  const artifact = await run(
    buildQuestionsPrompt(params),
    questionsSchema,
    () => ({ questions: devQuestions(params) }),
  );
  const questions: GeneratedQuestion[] = artifact.data.questions
    .slice(0, params.count)
    .map((q) => ({
      category: categoryEnum.safeParse(q.category).success
        ? (q.category as GeneratedQuestion['category'])
        : normalizeCategory(q.category),
      question: q.question.trim(),
    }));
  return { ...artifact, data: questions };
}

export async function evaluateAnswer(
  params: EvaluateAnswerParams,
): Promise<AIArtifact<AnswerEvaluation>> {
  const artifact = await run(
    buildEvaluationPrompt(params),
    evaluationSchema,
    () => devEvaluation(params),
  );
  const evaluation: AnswerEvaluation = {
    score: clamp(artifact.data.score),
    summary: artifact.data.summary,
    strengths: artifact.data.strengths,
    weaknesses: artifact.data.weaknesses,
    suggestedAnswer: artifact.data.suggestedAnswer,
    tips: artifact.data.tips,
  };
  return { ...artifact, data: evaluation };
}

export async function generateFollowUp(
  params: FollowUpParams,
): Promise<AIArtifact<string>> {
  const artifact = await run(buildFollowUpPrompt(params), followUpSchema, () => ({
    followUp: devFollowUp(params),
  }));
  return { ...artifact, data: artifact.data.followUp };
}

export async function summarizeInterview(
  params: InterviewSummaryParams,
): Promise<AIArtifact<InterviewSummary>> {
  const artifact = await run(
    buildSummaryPrompt(params),
    summarySchema,
    () => devSummary(params),
  );
  const s = artifact.data;
  const summary: InterviewSummary = {
    summary: s.summary,
    strengths: s.strengths,
    weaknesses: s.weaknesses,
    recommendations: s.recommendations,
    skillScores: {
      technical: clamp(s.skillScores.technical),
      communication: clamp(s.skillScores.communication),
      problemSolving: clamp(s.skillScores.problemSolving),
      confidence: clamp(s.skillScores.confidence),
    },
  };
  return { ...artifact, data: summary };
}

/* ---------------------------------------------------------------------------
 * Development templates. Deterministic, clearly flagged as non-AI. They let
 * developers exercise the full product flow without an API key.
 * ------------------------------------------------------------------------- */

function devQuestions(params: GenerateQuestionsParams): { category: string; question: string }[] {
  const { role, type } = params;
  const technical = [
    `Walk me through the architecture of a project where you worked as a ${role}. What trade-offs did you make?`,
    `How would you debug a performance issue in a ${role} system under production load?`,
    `Which tools or technologies do you consider essential for a ${role}, and why?`,
    `Describe a difficult technical decision you made recently and how you evaluated alternatives.`,
  ];
  const hr = [
    `Why do you want to work as a ${role}, and what motivates you?`,
    `What are you looking for in your next role?`,
    `How do you handle feedback and criticism?`,
    `Where do you see your career in three years?`,
  ];
  const behavioral = [
    `Tell me about a time you disagreed with a teammate. How did you resolve it?`,
    `Describe a situation where you had to learn something quickly.`,
    `Give an example of a goal you set and how you achieved it.`,
    `Tell me about a time you failed and what you learned.`,
  ];

  const pools: Record<string, string[]> = {
    technical,
    hr,
    behavioral,
    mixed: [...technical, ...behavioral, ...hr],
  };
  const pool = (pools[type] ?? pools.mixed) as string[];
  return Array.from({ length: params.count }, (_, index) => {
    const question = pool[index % pool.length] as string;
    const category =
      type === 'mixed' ? categoryEnum.options[index % 3]! : (type as string);
    return { category, question };
  });
}

function devEvaluation(params: EvaluateAnswerParams): z.infer<typeof evaluationSchema> {
  const words = params.answer.trim().split(/\s+/).filter(Boolean).length;
  const score = words === 0 ? 15 : words < 25 ? 45 : words < 60 ? 62 : words < 120 ? 74 : 82;
  return {
    score,
    summary:
      '[Development template] This assessment is a word-count heuristic, not AI analysis. ' +
      'Set AI_API_KEY to receive genuine, content-aware feedback.',
    strengths:
      words >= 25
        ? ['Provided a response with substance.', 'Structured the answer in a readable way.']
        : ['Attempted the question.'],
    weaknesses:
      words < 60
        ? ['Answer is short; add concrete examples and outcomes.', 'Consider using the STAR method.']
        : ['Could quantify impact more explicitly.'],
    suggestedAnswer:
      `A strong answer would state the situation, the action you took, and a measurable result, ` +
      `while connecting it directly to the ${params.role} role.`,
    tips: [
      'Use the STAR structure (Situation, Task, Action, Result).',
      'Quantify results with numbers wherever possible.',
      'Keep the answer focused and under two minutes.',
    ],
  };
}

function devFollowUp(params: FollowUpParams): string {
  return `That's helpful. Can you give a concrete example with a measurable outcome from that experience with "${params.question.slice(0, 60)}"?`;
}

function devSummary(params: InterviewSummaryParams): z.infer<typeof summarySchema> {
  const answered = params.items.filter((i) => i.answer.trim().length > 0);
  const avg = answered.length
    ? Math.round(answered.reduce((sum, i) => sum + i.score, 0) / answered.length)
    : 0;
  return {
    summary:
      '[Development template] You completed a mock interview for the ' +
      `${params.role} role with an average score of ${avg}. This summary is generated from ` +
      'simple heuristics and is not AI analysis. Configure AI_API_KEY for real feedback.',
    strengths: avg >= 60 ? ['Consistently provided answers.', 'Maintained engagement throughout.'] : ['Completed the session.'],
    weaknesses: avg < 60 ? ['Answers were brief.', 'Limited concrete examples.'] : ['Can improve on quantification.'],
    recommendations: [
      'Practice the STAR method for behavioral questions.',
      'Prepare two or three detailed project stories you can adapt.',
      'Review fundamentals specific to the target role.',
    ],
    skillScores: {
      technical: avg,
      communication: clamp(avg + 3),
      problemSolving: clamp(avg - 2),
      confidence: clamp(avg + 1),
    },
  };
}
