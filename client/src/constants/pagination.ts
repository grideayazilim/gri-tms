/* ========================================================================
   PAGINATION SABİTLERİ
   Hook'larda ve listelerde varsayılan sayfalama meta'sı.
   ======================================================================== */
import type { PaginationMeta } from '@timesheet/shared';

export const DEFAULT_PAGINATION: PaginationMeta = {
  totalRecords: 0,
  currentPage: 1,
  limit: 10,
  totalPages: 0,
};
