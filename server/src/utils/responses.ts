/* ========================================================================
   RESPONSE YARDIMCILARI
   API yanıt zarfını tek noktada üretir; envelope formatı burada korunur.
   ======================================================================== */
import type { Response } from 'express';
import type { PaginationMeta } from '@timesheet/shared';

export function ok<T>(res: Response, data: T, message?: string): Response {
  return res.status(200).json({ success: true, data, ...(message !== undefined && { message }) });
}

export function created<T>(res: Response, data: T, message?: string): Response {
  return res.status(201).json({ success: true, data, ...(message !== undefined && { message }) });
}

export function paginated<T>(
  res: Response,
  items: T[],
  pagination: PaginationMeta,
): Response {
  return res.status(200).json({ success: true, data: { items, pagination } });
}

export function fail(res: Response, status: number, message: string, errors?: unknown): Response {
  return res.status(status).json({
    success: false,
    message,
    ...(errors !== undefined && { errors }),
  });
}
