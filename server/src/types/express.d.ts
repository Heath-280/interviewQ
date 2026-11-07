import type { Request } from 'express';
import type { Types } from 'mongoose';
import type { UserRole } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: Types.ObjectId;
        role: UserRole;
        email: string;
        name: string;
      };
    }
  }
}

export interface AuthRequest extends Request {
  user: NonNullable<Request['user']>;
}
