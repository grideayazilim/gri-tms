/* ========================================================================
   HOLIDAY SERVICE (TATİL GÜNLERİ SERVİSİ)
   Resmi tatillerin listelenmesi.
   ======================================================================== */
import { api } from "./httpClient";

export const getPublicHolidays = (year) =>
  api.get("/holidays", { params: { year } });
