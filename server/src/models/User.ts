import { Schema, model, type Document, type Model, type Types } from 'mongoose';
import { hashPassword, verifyPassword } from '../utils/password';

export type UserRole = 'user' | 'admin';

export interface IRefreshToken {
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  avatarUrl?: string;
  targetRole?: string;
  headline?: string;
  bio?: string;
  refreshTokens: IRefreshToken[];
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {
  comparePassword(candidate: string): Promise<boolean>;
  addRefreshToken(tokenHash: string, expiresAt: Date): Promise<void>;
  removeRefreshToken(tokenHash: string): Promise<void>;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const userSchema = new Schema<IUserDocument, Model<IUserDocument>>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    avatarUrl: { type: String, default: '' },
    targetRole: { type: String, default: '', maxlength: 120 },
    headline: { type: String, default: '', maxlength: 160 },
    bio: { type: String, default: '', maxlength: 1000 },
    refreshTokens: { type: [refreshTokenSchema], default: [] },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.passwordHash;
        delete ret.refreshTokens;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.methods.comparePassword = function (this: IUserDocument, candidate: string): Promise<boolean> {
  return verifyPassword(candidate, this.passwordHash);
};

userSchema.methods.addRefreshToken = async function (
  this: IUserDocument,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  const now = new Date();
  // Prune expired sessions, then keep only the 5 most recent. Using atomic
  // updates (instead of document.save()) avoids optimistic-concurrency
  // VersionErrors when refresh happens concurrently (e.g. React StrictMode).
  await User.updateOne(
    { _id: this._id },
    { $pull: { refreshTokens: { expiresAt: { $lte: now } } } },
  );
  await User.updateOne(
    { _id: this._id },
    {
      $push: {
        refreshTokens: { $each: [{ tokenHash, expiresAt, createdAt: now }], $slice: -5 },
      },
    },
  );
};

userSchema.methods.removeRefreshToken = async function (
  this: IUserDocument,
  tokenHash: string,
): Promise<void> {
  await User.updateOne({ _id: this._id }, { $pull: { refreshTokens: { tokenHash } } });
};

userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  if (this.passwordHash && !this.passwordHash.startsWith('$2')) {
    this.passwordHash = await hashPassword(this.passwordHash);
  }
  next();
});

export const User = model<IUserDocument>('User', userSchema);
