/* ============================================
   PUANTAJ (TIMESHEET) ŞEMALARI
   Puantaj kayıtlarının toplu kaydedilmesi
   ============================================ */
import { z } from 'zod';

import { MARKER_LIST } from '../constants/markers';
import type { MarkerCode } from '../constants/markers';

const markerCodeTuple = MARKER_LIST.map(m => m.code) as [MarkerCode, ...MarkerCode[]];

export const timesheetDaySchema = z.object({
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-MM-DD formatında olmalıdır'),
    markerCode: z.enum(markerCodeTuple, { message: 'Geçersiz işaretçi kodu' }).nullable(),
    note: z.string().nullable().optional(),
});

export const timesheetRowSchema = z.object({
    employeeId: z.string().min(1, 'Çalışan ID gereklidir'),
    days: z.array(timesheetDaySchema),
});

export const timesheetSaveSchema = z.object({
    periodId: z.string().min(1, 'Dönem ID gereklidir'),
    timesheets: z.array(timesheetRowSchema).min(1, 'En az bir puantaj verisi gereklidir'),
});

export type TimesheetSaveType = z.infer<typeof timesheetSaveSchema>;
