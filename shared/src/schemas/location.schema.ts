/* ============================================
   YERLEŞKE VE BİRİM ŞEMALARI
   Yerleşke ekleme ve senkronizasyon kontrolleri
   ============================================ */
import { z } from 'zod';

export const locationSchema = z.object({
    name: z.string().min(1, 'Yerleşke adı gereklidir'),
    programNo: z.string().min(1, 'Program numarası gereklidir'),
});

export type LocationType = z.infer<typeof locationSchema>;

export const unitSchema = z.object({
    locationId: z.string().min(1, 'Yerleşke seçimi gereklidir'),
    name: z.string().min(1, 'Birim adı gereklidir'),
});

export type UnitType = z.infer<typeof unitSchema>;

export const syncLocationSchema = z.object({
    name: z.string().min(1, 'Yerleşke adı gereklidir'),
    programNo: z.string().min(1, 'Program numarası gereklidir'),
    units: z.array(
        z.object({
            id: z.string().optional(),
            name: z.string().min(1, 'Birim adı boş bırakılamaz'),
        })
    ),
});

export type SyncLocationType = z.infer<typeof syncLocationSchema>;
