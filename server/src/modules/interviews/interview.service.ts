import { Types } from 'mongoose';
import { Interview, type IInterviewDocument } from '../../models/Interview';
import { Resume } from '../../models/Resume';
import { ApiError } from '../../utils/ApiError';
import { buildPaginated, type PaginatedResult, parsePagination } from '../../utils/pagination';
import * as aiService from '../../services/ai/aiService';
import type { AnswerEvaluation, GeneratedQuestion } from '../../services/ai/types';
import type { CreateInterviewInput, SubmitAnswerInput } from './interview.validation';

export interface InterviewAction<T = unknown> {
  interview: IInterviewDocument;
  warning?: string;
  source?: 'ai' | 'dev-template';
  evaluation?: T;
}

async function getOwnedInterview(userId: string, id: string): Promise<IInterviewDocument> {
  const interview = await Interview.findOne({ _id: id, userId });
  if (!interview) throw ApiError.notFound('Interview not found');
  return interview;
}

async function loadResumeText(resumeId?: Types.ObjectId | null): Promise<string | undefined> {
  if (!resumeId) return undefined;
  const resume = await Resume.findById(resumeId).select('extractedText');
  return resume?.extractedText;
}

export async function createInterview(
  userId: string,
  input: CreateInterviewInput,
): Promise<{ interview: IInterviewDocument; warning?: string }> {
  let resumeId: Types.ObjectId | null = null;
  let resumeText: string | undefined;
  let skills: string[] | undefined;

  if (input.resumeId) {
    const resume = await Resume.findOne({ _id: input.resumeId, userId });
    if (!resume) throw ApiError.badRequest('Selected resume was not found');
    resumeId = resume._id;
    resumeText = resume.extractedText;
    skills = resume.skills;
  }

  const artifact = await aiService.generateQuestions({
    role: input.role,
    company: input.company,
    jobDescription: input.jobDescription,
    resumeText,
    skills,
    type: input.type,
    difficulty: input.difficulty,
    count: input.questionCount,
  });

  const questions = artifact.data.map((q: GeneratedQuestion, index: number) => ({
    order: index,
    category: q.category,
    question: q.question,
    userAnswer: '',
    status: 'pending' as const,
    followUps: [],
  }));

  const interview = await Interview.create({
    userId,
    resumeId,
    role: input.role,
    company: input.company,
    jobDescription: input.jobDescription,
    type: input.type,
    difficulty: input.difficulty,
    status: 'in_progress',
    currentQuestionIndex: 0,
    questions,
    generationSource: artifact.source,
    aiModel: artifact.model,
    startedAt: new Date(),
  });

  return { interview, warning: artifact.warning };
}

export async function listInterviews(
  userId: string,
  query: Record<string, unknown>,
): Promise<PaginatedResult<IInterviewDocument>> {
  const pagination = parsePagination(query);
  const filter: Record<string, unknown> = { userId };

  if (typeof query.status === 'string') filter.status = query.status;
  if (typeof query.type === 'string') filter.type = query.type;
  if (typeof query.search === 'string' && query.search.trim()) {
    const rx = { $regex: query.search.trim(), $options: 'i' };
    filter.$or = [{ role: rx }, { company: rx }];
  }

  const [items, total] = await Promise.all([
    Interview.find(filter)
      .select('-jobDescription -questions.userAnswer -questions.feedback -questions.followUps')
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Interview.countDocuments(filter),
  ]);
  return buildPaginated(items, total, pagination);
}

export async function getInterview(userId: string, id: string): Promise<IInterviewDocument> {
  return getOwnedInterview(userId, id);
}

function findQuestion(interview: IInterviewDocument, questionId: string) {
  const question = interview.questions.find((q) => q._id?.toString() === questionId);
  if (!question) throw ApiError.notFound('Question not found in this interview');
  return question;
}

export async function submitAnswer(
  userId: string,
  id: string,
  questionId: string,
  input: SubmitAnswerInput,
): Promise<InterviewAction<AnswerEvaluation>> {
  const interview = await getOwnedInterview(userId, id);
  if (interview.status === 'completed') {
    throw ApiError.badRequest('This interview is already completed');
  }

  const question = findQuestion(interview, questionId);
  question.userAnswer = input.answer;
  question.answeredAt = new Date();
  question.status = 'answered';

  const resumeText = await loadResumeText(interview.resumeId ?? undefined);
  const artifact = await aiService.evaluateAnswer({
    role: interview.role,
    category: question.category,
    question: question.question,
    answer: input.answer,
    jobDescription: interview.jobDescription,
    resumeText,
  });

  question.feedback = artifact.data;
  question.status = 'evaluated';

  const nextPending = interview.questions.findIndex((q) => q.status === 'pending');
  interview.currentQuestionIndex =
    nextPending === -1 ? interview.questions.length - 1 : nextPending;

  await interview.save();
  return {
    interview,
    evaluation: artifact.data,
    warning: artifact.warning,
    source: artifact.source,
  };
}

export async function requestFollowUp(
  userId: string,
  id: string,
  questionId: string,
): Promise<InterviewAction> {
  const interview = await getOwnedInterview(userId, id);
  const question = findQuestion(interview, questionId);
  if (question.status === 'pending') {
    throw ApiError.badRequest('Answer the question before requesting a follow-up');
  }

  const artifact = await aiService.generateFollowUp({
    role: interview.role,
    question: question.question,
    answer: question.userAnswer,
  });

  question.followUps.push({
    question: artifact.data,
    answer: '',
    askedAt: new Date(),
  });
  await interview.save();

  return { interview, warning: artifact.warning, source: artifact.source };
}

export async function answerFollowUp(
  userId: string,
  id: string,
  questionId: string,
  followUpId: string,
  answer: string,
): Promise<InterviewAction<AnswerEvaluation>> {
  const interview = await getOwnedInterview(userId, id);
  const question = findQuestion(interview, questionId);
  const followUp = question.followUps.find((f) => f._id?.toString() === followUpId);
  if (!followUp) throw ApiError.notFound('Follow-up not found');

  followUp.answer = answer;
  const resumeText = await loadResumeText(interview.resumeId ?? undefined);
  const artifact = await aiService.evaluateAnswer({
    role: interview.role,
    category: question.category,
    question: followUp.question,
    answer,
    jobDescription: interview.jobDescription,
    resumeText,
  });
  followUp.feedback = artifact.data;
  await interview.save();

  return {
    interview,
    evaluation: artifact.data,
    warning: artifact.warning,
    source: artifact.source,
  };
}

export async function completeInterview(
  userId: string,
  id: string,
): Promise<InterviewAction> {
  const interview = await getOwnedInterview(userId, id);
  if (interview.status === 'completed') {
    return { interview };
  }

  const evaluated = interview.questions.filter(
    (q) => q.status === 'evaluated' && q.userAnswer.trim().length > 0,
  );
  if (evaluated.length === 0) {
    throw ApiError.badRequest('Answer at least one question before completing the interview');
  }

  const artifact = await aiService.summarizeInterview({
    role: interview.role,
    company: interview.company,
    type: interview.type,
    items: evaluated.map((q) => ({
      category: q.category,
      question: q.question,
      answer: q.userAnswer,
      score: q.feedback?.score ?? 0,
    })),
  });

  const overallScore = Math.round(
    evaluated.reduce((sum, q) => sum + (q.feedback?.score ?? 0), 0) / evaluated.length,
  );

  interview.overallScore = overallScore;
  interview.summary = artifact.data.summary;
  interview.strengths = artifact.data.strengths;
  interview.weaknesses = artifact.data.weaknesses;
  interview.recommendations = artifact.data.recommendations;
  interview.skillScores = artifact.data.skillScores;
  interview.status = 'completed';
  interview.completedAt = new Date();
  if (interview.startedAt) {
    interview.durationSeconds = Math.max(
      0,
      Math.round((interview.completedAt.getTime() - interview.startedAt.getTime()) / 1000),
    );
  }
  if (artifact.source === 'dev-template') {
    interview.generationSource = 'dev-template';
  }
  await interview.save();

  return { interview, warning: artifact.warning, source: artifact.source };
}

export async function deleteInterview(userId: string, id: string): Promise<void> {
  const result = await Interview.findOneAndDelete({ _id: id, userId });
  if (!result) throw ApiError.notFound('Interview not found');
}
