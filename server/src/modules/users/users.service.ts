import { User, type IUserDocument } from '../../models/User';
import { ApiError } from '../../utils/ApiError';
import { buildPaginated, type PaginatedResult, parsePagination } from '../../utils/pagination';
import type { ChangePasswordInput, UpdateProfileInput } from '../auth/auth.validation';

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<IUserDocument> {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const fields: (keyof UpdateProfileInput)[] = ['name', 'headline', 'targetRole', 'bio', 'avatarUrl'];
  for (const field of fields) {
    const value = input[field];
    if (value !== undefined) {
      (user as unknown as Record<string, unknown>)[field] = value;
    }
  }
  await user.save();
  return user;
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
): Promise<void> {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.notFound('User not found');

  const valid = await user.comparePassword(input.currentPassword);
  if (!valid) throw ApiError.badRequest('Current password is incorrect');

  user.passwordHash = input.newPassword;
  user.refreshTokens = [];
  await user.save();
}

export async function listUsers(query: Record<string, unknown>): Promise<PaginatedResult<IUserDocument>> {
  const pagination = parsePagination(query);
  const filter: Record<string, unknown> = {};
  if (typeof query.search === 'string' && query.search.trim()) {
    filter.$or = [
      { name: { $regex: query.search.trim(), $options: 'i' } },
      { email: { $regex: query.search.trim(), $options: 'i' } },
    ];
  }
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit),
    User.countDocuments(filter),
  ]);
  return buildPaginated(items, total, pagination);
}

export async function setRole(userId: string, role: 'user' | 'admin'): Promise<IUserDocument> {
  const user = await User.findByIdAndUpdate(userId, { role }, { new: true });
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

export async function deleteUser(userId: string): Promise<void> {
  const result = await User.findByIdAndDelete(userId);
  if (!result) throw ApiError.notFound('User not found');
}
