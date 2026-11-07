import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError';
import { isProd } from '../config/env';
import { logger } from '../utils/logger';

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  };
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Internal server error';
  let details: unknown;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({
      path: e.path,
      message: e.message,
    }));
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid value for path "${err.path}"`;
  } else if (err instanceof MulterError) {
    statusCode = 400;
    code = 'UPLOAD_ERROR';
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : err.message;
  } else if (isMongoDuplicateKeyError(err)) {
    statusCode = 409;
    code = 'DUPLICATE_KEY';
    message = 'A record with this value already exists';
    details = err.keyValue;
  } else if (isJsonSyntaxError(err)) {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Malformed JSON in request body';
  } else if (err instanceof Error) {
    message = isProd ? 'Internal server error' : err.message;
  }

  const body: ErrorBody = { error: { code, message } };
  if (details !== undefined) body.error.details = details;

  if (statusCode >= 500) {
    logger.error(message, { code, stack: err instanceof Error ? err.stack : undefined });
    if (!isProd && err instanceof Error) body.error.stack = err.stack;
  }

  res.status(statusCode).json(body);
}

interface MongoDuplicateError {
  code: number;
  keyValue?: Record<string, unknown>;
}

function isMongoDuplicateKeyError(err: unknown): err is MongoDuplicateError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as MongoDuplicateError).code === 11000
  );
}

function isJsonSyntaxError(err: unknown): boolean {
  return (
    err instanceof SyntaxError &&
    'status' in err &&
    (err as { status: number }).status === 400 &&
    'body' in err
  );
}
