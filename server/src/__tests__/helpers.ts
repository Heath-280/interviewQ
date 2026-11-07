import request from 'supertest';
import type { Application } from 'express';
import { createApp } from '../app';

export const app: Application = createApp();

let counter = 0;
export function uniqueEmail(prefix = 'user'): string {
  counter += 1;
  return `${prefix}${Date.now()}${counter}@test.dev`;
}

export interface TestUser {
  token: string;
  userId: string;
  email: string;
  password: string;
}

export async function registerUser(
  overrides: Partial<{ name: string; email: string; password: string }> = {},
): Promise<TestUser> {
  const email = overrides.email ?? uniqueEmail();
  const password = overrides.password ?? 'Password123';
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: overrides.name ?? 'Test User', email, password });

  if (res.status !== 201) {
    throw new Error(`registerUser failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.accessToken, userId: res.body.user._id, email, password };
}

export function auth(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
