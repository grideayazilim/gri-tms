import { api } from "./httpClient";

export const getPublicHolidays = (year) =>
  api.get("/holidays", { params: { year } });
