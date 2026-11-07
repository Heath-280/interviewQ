import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export interface IResume {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  extractedText: string;
  wordCount: number;
  skills: string[];
  summary: string;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type IResumeDocument = IResume & Document;

const resumeSchema = new Schema<IResumeDocument, Model<IResumeDocument>>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    extractedText: { type: String, default: '' },
    wordCount: { type: Number, default: 0 },
    skills: { type: [String], default: [] },
    summary: { type: String, default: '' },
    isPrimary: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// One user cannot have more than one primary resume.
resumeSchema.index({ userId: 1, createdAt: -1 });

export const Resume = model<IResumeDocument>('Resume', resumeSchema);
