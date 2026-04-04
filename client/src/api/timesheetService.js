// Backend'e istek gönder ve Veri/response çek. Veriyi frontend'in kullanabileceği şekilde map et

import { api } from "./httpClient";

export const getTimesheets = (params = {}) =>
  api.get("/timesheets", { params });

export const saveTimesheets = (periodId, timesheets) =>
  api.post("/timesheets", { periodId, timesheets });

// Dönem kilit durumunu toggle eder (kilitli ise açar, açık ise kilitler)
export const toggleLockPeriod = (periodId) =>
  api.patch(`/timesheets/${periodId}/lock`);

export const getPeriods = () => api.get("/timesheets/periods");
