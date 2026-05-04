/* ========================================================================
   SAYFALAMA YARDIMCISI (PAGINATION HELPER)
   Sayfalama meta bilgilerini oluşturur.
   ======================================================================== */
import type { PaginationMeta } from '@timesheet/shared';

export function buildPagination(page: number, limit: number, total: number): PaginationMeta {
  return {
    currentPage: page,
    totalPages: Math.ceil(total / limit) || 0,
    totalRecords: total,
    limit,
  };
}

// Controller'ların query'den pagination parametrelerini tek satırda alması için
export function paginationParams(query: { page?: unknown; limit?: unknown }): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
