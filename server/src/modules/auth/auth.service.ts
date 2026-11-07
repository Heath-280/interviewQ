import { env } from '../../config/env';
import { User, type IUserDocument } from '../../models/User';
import { ApiError } from '../../utils/ApiError';
import {
  hashToken,
  parseDurationToMs,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/token';
import type { LoginInput, RegisterInput } from './auth.validation';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends AuthTokens {
  user: IUserDocument;
}

const refreshTtlMs = () => parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN);

async function issueTokens(user: IUserDocument): Promise<AuthTokens> {
  const payload = { sub: user._id.toString(), role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  await user.addRefreshToken(hashToken(refreshToken), new Date(Date.now() + refreshTtlMs()));
  return { accessToken, refreshToken };
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash: input.password,
    lastLoginAt: new Date(),
  });

  const tokens = await issueTokens(user);
  return { ...tokens, user };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  const valid = await user.comparePassword(input.password);
  if (!valid) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  user.lastLoginAt = new Date();
  const tokens = await issueTokens(user);
  return { ...tokens, user };
}

export async function refresh(refreshToken: string | undefined): Promise<AuthResult> {
  if (!refreshToken) {
    throw ApiError.unauthorized('Missing refresh token');
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw ApiError.unauthorized('Account no longer exists');
  }

  const tokenHash = hashToken(refreshToken);
  const hasToken = user.refreshTokens.some((t) => t.tokenHash === tokenHash);
  if (!hasToken) {
    throw ApiError.unauthorized('Refresh token has been revoked, please sign in again');
  }

  // Rotation: revoke the used token before issuing a new pair.
  await user.removeRefreshToken(tokenHash);
  const tokens = await issueTokens(user);
  return { ...tokens, user };
}

export async function logout(userId: string, refreshToken?: string): Promise<void> {
  if (!refreshToken) return;
  const user = await User.findById(userId);
  if (!user) return;
  await user.removeRefreshToken(hashToken(refreshToken));
}

export async function getMe(userId: string): Promise<IUserDocument> {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  return user;
}
