export type UserRole = 'user' | 'admin';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  headline?: string;
  targetRole?: string;
  bio?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Resume {
  _id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  wordCount: number;
  skills: string[];
  summary: string;
  isPrimary: boolean;
  extractedText?: string;
  createdAt: string;
  updatedAt: string;
}

export type QuestionCategory = 'technical' | 'hr' | 'behavioral';
export type InterviewType = 'technical' | 'hr' | 'behavioral' | 'mixed';
export type InterviewDifficulty = 'easy' | 'medium' | 'hard';
export type InterviewStatus = 'created' | 'in_progress' | 'completed' | 'abandoned';
export type QuestionStatus = 'pending' | 'answered' | 'evaluated';

export interface QuestionFeedback {
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestedAnswer: string;
  tips: string[];
}

export interface FollowUp {
  _id: string;
  question: string;
  answer: string;
  askedAt: string;
  feedback?: QuestionFeedback;
}

export interface InterviewQuestion {
  _id: string;
  order: number;
  category: QuestionCategory;
  question: string;
  userAnswer: string;
  answeredAt?: string;
  status: QuestionStatus;
  followUps: FollowUp[];
  feedback?: QuestionFeedback;
}

export interface SkillScores {
  technical: number;
  communication: number;
  problemSolving: number;
  confidence: number;
}

export interface Interview {
  _id: string;
  resumeId?: string | null;
  role: string;
  company: string;
  jobDescription: string;
  type: InterviewType;
  difficulty: InterviewDifficulty;
  status: InterviewStatus;
  currentQuestionIndex: number;
  questions: InterviewQuestion[];
  overallScore: number;
  skillScores: SkillScores;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  summary: string;
  generationSource: 'ai' | 'dev-template';
  aiModel: string;
  durationSeconds: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

export interface AIStatus {
  configured: boolean;
  devMode: boolean;
  model: string;
  baseUrl: string;
  message: string;
}

export interface ScoreTrendPoint {
  id: string;
  role: string;
  company: string;
  score: number;
  date: string;
}

export interface DashboardOverview {
  totals: {
    interviews: number;
    completed: number;
    inProgress: number;
    answers: number;
    resumes: number;
    practiceMinutes: number;
  };
  averageScore: number;
  bestScore: number;
  skillAverages: {
    technical: number;
    communication: number;
    problemSolving: number;
    confidence: number;
  };
  scoreTrend: ScoreTrendPoint[];
  categoryPerformance: { category: string; average: number; count: number }[];
  recentInterviews: {
    id: string;
    role: string;
    company: string;
    status: InterviewStatus;
    type: InterviewType;
    overallScore: number;
    createdAt: string;
    completedAt?: string;
  }[];
}

export interface ApiErrorShape {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
