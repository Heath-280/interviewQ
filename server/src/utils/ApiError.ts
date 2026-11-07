export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, options: { code?: string; details?: unknown } = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = options.code ?? defaultCode(statusCode);
    this.details = options.details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', details?: unknown) {
    return new ApiError(400, message, { code: 'BAD_REQUEST', details });
  }
  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message, { code: 'UNAUTHORIZED' });
  }
  static forbidden(message = 'You do not have permission to perform this action') {
    return new ApiError(403, message, { code: 'FORBIDDEN' });
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, message, { code: 'NOT_FOUND' });
  }
  static conflict(message = 'Resource already exists') {
    return new ApiError(409, message, { code: 'CONFLICT' });
  }
  static tooMany(message = 'Too many requests, please try again later') {
    return new ApiError(429, message, { code: 'RATE_LIMITED' });
  }
  static serviceUnavailable(message = 'Service temporarily unavailable', details?: unknown) {
    return new ApiError(503, message, { code: 'SERVICE_UNAVAILABLE', details });
  }
  static internal(message = 'Internal server error') {
    return new ApiError(500, message, { code: 'INTERNAL_ERROR' });
  }
}

function defaultCode(status: number): string {
  const map: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'RATE_LIMITED',
    500: 'INTERNAL_ERROR',
    503: 'SERVICE_UNAVAILABLE',
  };
  return map[status] ?? 'ERROR';
}
