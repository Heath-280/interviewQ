import type { QuestionCategory, InterviewDifficulty, InterviewType } from '../../models/Interview';

export interface GenerateQuestionsParams {
  role: string;
  company?: string;
  jobDescription?: string;
  resumeText?: string;
  skills?: string[];
  type: InterviewType;
  difficulty: InterviewDifficulty;
  count: number;
}

export interface GeneratedQuestion {
  category: QuestionCategory;
  question: string;
}

export interface EvaluateAnswerParams {
  role: string;
  category: QuestionCategory;
  question: string;
  answer: string;
  jobDescription?: string;
  resumeText?: string;
}

export interface AnswerEvaluation {
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestedAnswer: string;
  tips: string[];
}

export interface FollowUpParams {
  role: string;
  question: string;
  answer: string;
}

export interface InterviewSummaryParams {
  role: string;
  company?: string;
  type: InterviewType;
  items: { category: QuestionCategory; question: string; answer: string; score: number }[];
}

export interface InterviewSummary {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  skillScores: {
    technical: number;
    communication: number;
    problemSolving: number;
    confidence: number;
  };
}

export interface AIStatus {
  configured: boolean;
  devMode: boolean;
  model: string;
  baseUrl: string;
  message: string;
}
