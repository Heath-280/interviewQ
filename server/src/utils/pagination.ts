export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 10;

export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const rawPage = parseInt(String(query.page ?? ''), 10);
  const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1;

  const rawLimit = parseInt(String(query.limit ?? ''), 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(MAX_LIMIT, Math.max(1, rawLimit))
    : DEFAULT_LIMIT;

  return { page, limit, skip: (page - 1) * limit };
}

export function buildPaginated<T>(
  items: T[],
  total: number,
  { page, limit }: PaginationParams,
): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}
