import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type QuestionCategory = 'technical' | 'hr' | 'behavioral';
export type InterviewType = 'technical' | 'hr' | 'behavioral' | 'mixed';
export type InterviewDifficulty = 'easy' | 'medium' | 'hard';
export type InterviewStatus = 'created' | 'in_progress' | 'completed' | 'abandoned';
export type QuestionStatus = 'pending' | 'answered' | 'evaluated';
export type GenerationSource = 'ai' | 'dev-template';

export interface IQuestionFeedback {
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestedAnswer: string;
  tips: string[];
}

export interface IFollowUp {
  _id?: Types.ObjectId;
  question: string;
  answer: string;
  askedAt: Date;
  feedback?: IQuestionFeedback;
}

export interface IQuestion {
  _id?: Types.ObjectId;
  order: number;
  category: QuestionCategory;
  question: string;
  userAnswer: string;
  answeredAt?: Date;
  status: QuestionStatus;
  followUps: IFollowUp[];
  feedback?: IQuestionFeedback;
}

export interface ISkillScores {
  technical: number;
  communication: number;
  problemSolving: number;
  confidence: number;
}

export interface IInterview {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  resumeId?: Types.ObjectId | null;
  role: string;
  company: string;
  jobDescription: string;
  type: InterviewType;
  difficulty: InterviewDifficulty;
  status: InterviewStatus;
  currentQuestionIndex: number;
  questions: IQuestion[];
  overallScore: number;
  skillScores: ISkillScores;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  summary: string;
  generationSource: GenerationSource;
  aiModel: string;
  durationSeconds: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type IInterviewDocument = IInterview & Document;

const feedbackSchema = new Schema<IQuestionFeedback>(
  {
    score: { type: Number, min: 0, max: 100, default: 0 },
    summary: { type: String, default: '' },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    suggestedAnswer: { type: String, default: '' },
    tips: { type: [String], default: [] },
  },
  { _id: false },
);

const followUpSchema = new Schema<IFollowUp>(
  {
    question: { type: String, required: true },
    answer: { type: String, default: '' },
    askedAt: { type: Date, default: Date.now },
    feedback: { type: feedbackSchema },
  },
  { _id: true },
);

const questionSchema = new Schema<IQuestion>(
  {
    order: { type: Number, required: true },
    category: {
      type: String,
      enum: ['technical', 'hr', 'behavioral'],
      required: true,
    },
    question: { type: String, required: true },
    userAnswer: { type: String, default: '' },
    answeredAt: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'answered', 'evaluated'],
      default: 'pending',
    },
    followUps: { type: [followUpSchema], default: [] },
    feedback: { type: feedbackSchema },
  },
  { _id: true },
);

const skillScoresSchema = new Schema<ISkillScores>(
  {
    technical: { type: Number, min: 0, max: 100, default: 0 },
    communication: { type: Number, min: 0, max: 100, default: 0 },
    problemSolving: { type: Number, min: 0, max: 100, default: 0 },
    confidence: { type: Number, min: 0, max: 100, default: 0 },
  },
  { _id: false },
);

const interviewSchema = new Schema<IInterviewDocument, Model<IInterviewDocument>>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    resumeId: { type: Schema.Types.ObjectId, ref: 'Resume', default: null },
    role: { type: String, required: true, trim: true, maxlength: 120 },
    company: { type: String, default: '', trim: true, maxlength: 120 },
    jobDescription: { type: String, default: '', maxlength: 8000 },
    type: {
      type: String,
      enum: ['technical', 'hr', 'behavioral', 'mixed'],
      default: 'mixed',
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['created', 'in_progress', 'completed', 'abandoned'],
      default: 'created',
      index: true,
    },
    currentQuestionIndex: { type: Number, default: 0 },
    questions: { type: [questionSchema], default: [] },
    overallScore: { type: Number, min: 0, max: 100, default: 0 },
    skillScores: { type: skillScoresSchema, default: () => ({}) },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    recommendations: { type: [String], default: [] },
    summary: { type: String, default: '' },
    generationSource: { type: String, enum: ['ai', 'dev-template'], default: 'ai' },
    aiModel: { type: String, default: '' },
    durationSeconds: { type: Number, default: 0 },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

interviewSchema.index({ userId: 1, createdAt: -1 });
interviewSchema.index({ userId: 1, status: 1 });

export const Interview = model<IInterviewDocument>('Interview', interviewSchema);
