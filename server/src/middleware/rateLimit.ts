import rateLimit, { type Options } from 'express-rate-limit';
import type { Request } from 'express';
import { isTest } from '../config/env';

function baseOptions(): Partial<Options> {
  return {
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isTest,
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please slow down and try again shortly.',
        },
      });
    },
  };
}

/** General API limiter applied to all /api routes. */
export const apiLimiter = rateLimit({
  ...baseOptions(),
  windowMs: 60 * 1000,
  limit: 300,
});

/** Stricter limiter for authentication endpoints (brute-force protection). */
export const authLimiter = rateLimit({
  ...baseOptions(),
  windowMs: 15 * 60 * 1000,
  limit: 20,
  keyGenerator: (req: Request) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase() : '';
    return `${req.ip}:${email}`;
  },
});

/** Limiter for expensive AI generation endpoints. */
export const aiLimiter = rateLimit({
  ...baseOptions(),
  windowMs: 60 * 1000,
  limit: 20,
  keyGenerator: (req: Request) => req.user?.id.toString() ?? req.ip ?? 'unknown',
});
