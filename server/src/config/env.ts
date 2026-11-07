import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((val) => {
    if (typeof val === 'boolean') return val;
    return ['1', 'true', 'yes', 'on'].includes(val.toLowerCase());
  });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  JWT_ACCESS_SECRET: z.string().default('dev-access-secret-change-me'),
  JWT_REFRESH_SECRET: z.string().default('dev-refresh-secret-change-me'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  COOKIE_DOMAIN: z.string().optional().default(''),
  COOKIE_SECURE: booleanish.default(false),

  UPLOAD_DIR: z.string().default('uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(5),

  AI_API_KEY: z.string().optional().default(''),
  AI_BASE_URL: z.string().default('https://api.openai.com/v1'),
  AI_MODEL: z.string().default('gpt-4o-mini'),
  AI_TIMEOUT_MS: z.coerce.number().positive().default(45000),
  AI_DEV_MODE: booleanish.default(true),

  ADMIN_NAME: z.string().default('InterviewIQ Admin'),
  ADMIN_EMAIL: z.string().email().default('admin@interviewiq.dev'),
  ADMIN_PASSWORD: z.string().default('ChangeMe123!'),
});

type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    // eslint-disable-next-line no-console
    console.error(`Invalid environment configuration:\n${issues}`);
    process.exit(1);
  }

  const env = parsed.data;

  if (env.NODE_ENV === 'production') {
    const insecure: string[] = [];
    if (env.JWT_ACCESS_SECRET.includes('change-me')) insecure.push('JWT_ACCESS_SECRET');
    if (env.JWT_REFRESH_SECRET.includes('change-me')) insecure.push('JWT_REFRESH_SECRET');
    if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
      insecure.push('JWT_ACCESS_SECRET must differ from JWT_REFRESH_SECRET');
    }
    if (env.AI_DEV_MODE) insecure.push('AI_DEV_MODE must be false in production');
    if (insecure.length) {
      // eslint-disable-next-line no-console
      console.error(
        `Refusing to start in production with insecure configuration:\n${insecure
          .map((s) => `  - ${s}`)
          .join('\n')}`,
      );
      process.exit(1);
    }
  }

  return env;
}

export const env = loadEnv();

export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const isDev = env.NODE_ENV === 'development';

export const corsOrigins = env.CLIENT_ORIGIN.split(',')
  .map((o) => o.trim())
  .filter(Boolean);
