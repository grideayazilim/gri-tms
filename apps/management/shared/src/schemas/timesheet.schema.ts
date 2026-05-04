/* ============================================
   PUANTAJ (TIMESHEET) ŞEMALARI
   Puantaj kayıtlarının toplu kaydedilmesi
   ============================================ */
import { z } from 'zod';

const timesheetDaySchema = z.object({
    day: z.string().min(1, 'Tarih gereklidir'),
    markerCode: z.string().min(1, 'İşaretçi kodu gereklidir'),
});

const timesheetRowSchema = z.object({
    employeeId: z.string().min(1, 'Çalışan ID gereklidir'),
    days: z.array(timesheetDaySchema),
});

export const timesheetSaveSchema = z.object({
    periodId: z.string().min(1, 'Dönem ID gereklidir'),
    timesheets: z.array(timesheetRowSchema).min(1, 'En az bir puantaj verisi gereklidir'),
});

export type TimesheetSaveType = z.infer<typeof timesheetSaveSchema>;
