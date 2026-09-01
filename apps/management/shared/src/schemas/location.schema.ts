/* ============================================
   YERLEŞKE VE BİRİM ŞEMALARI
   Yerleşke ekleme ve senkronizasyon kontrolleri
   ============================================ */
import { z } from 'zod';

// Üst sınırlar — sınırsız uzunlukta metin kabul edilmemeli
export const locationSchema = z.object({
    name: z.string().trim().min(1, 'Yerleşke adı gereklidir').max(120, 'Yerleşke adı en fazla 120 karakter olabilir').transform(v => v.toLocaleUpperCase('tr-TR')),
    programNo: z.string().trim().min(1, 'Program numarası gereklidir').max(50, 'Program numarası en fazla 50 karakter olabilir'),
});

export type LocationType = z.infer<typeof locationSchema>;

export const unitSchema = z.object({
    locationId: z.string().min(1, 'Yerleşke seçimi gereklidir'),
    name: z.string().trim().min(1, 'Birim adı gereklidir').max(120, 'Birim adı en fazla 120 karakter olabilir').transform(v => v.toLocaleUpperCase('tr-TR')),
});

export type UnitType = z.infer<typeof unitSchema>;

export const syncLocationSchema = z.object({
    name: z.string().trim().min(1, 'Yerleşke adı gereklidir').max(120, 'Yerleşke adı en fazla 120 karakter olabilir').transform(v => v.toLocaleUpperCase('tr-TR')),
    programNo: z.string().trim().min(1, 'Program numarası gereklidir').max(50, 'Program numarası en fazla 50 karakter olabilir'),
    units: z.array(
        z.object({
            id: z.string().optional(),
            name: z.string().trim().min(1, 'Birim adı boş bırakılamaz').max(120, 'Birim adı en fazla 120 karakter olabilir').transform(v => v.toLocaleUpperCase('tr-TR')),
        })
    ).max(200, 'Bir yerleşkede en fazla 200 birim olabilir'),
});

export type SyncLocationType = z.infer<typeof syncLocationSchema>;
