/* ========================================================================
   HOLIDAY SERVICE (TATİL GÜNLERİ SERVİSİ)
   Resmi tatillerin listelenmesi.
   ======================================================================== */
import type { ApiResponse, PublicHoliday } from '@timesheet/shared';

import { api } from './httpClient';

export const getPublicHolidays = (year: number) =>
  api.get<ApiResponse<{ holidays: PublicHoliday[] }>>('/holidays', { params: { year } });
