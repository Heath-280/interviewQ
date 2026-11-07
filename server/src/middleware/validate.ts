import type { NextFunction, Request, Response } from 'express';
import { ZodError, type AnyZodObject, type ZodTypeAny } from 'zod';
import { ApiError } from '../utils/ApiError';

interface ValidationSchemas {
  body?: AnyZodObject | ZodTypeAny;
  query?: AnyZodObject | ZodTypeAny;
  params?: AnyZodObject | ZodTypeAny;
}

/**
 * Validates (and coerces) request input against zod schemas.
 * On success the parsed values replace the originals so downstream code
 * works with well-typed, sanitized data.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }
      if (schemas.query) {
        // Express exposes query as a getter on the prototype; assigning an
        // own property shadows it validly on Express 4.
        Object.defineProperty(req, 'query', {
          value: schemas.query.parse(req.query),
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(
          new ApiError(400, 'Validation failed', {
            code: 'VALIDATION_ERROR',
            details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
          }),
        );
        return;
      }
      next(err);
    }
  };
}
