/* ============================================
   DUYURU (ANNOUNCEMENT) ŞEMASI
   Duyuru oluşturma ve düzenleme validasyonları
   ============================================ */
import { z } from 'zod';

export const announcementSchema = z.object({
    title: z
        .string()
        .min(3, 'Başlık en az 3 karakter olmalıdır')
        .max(100, 'Başlık en fazla 100 karakter olabilir'),
    content: z
        .string()
        .min(10, 'İçerik en az 10 karakter olmalıdır')
        .max(1000, 'İçerik en fazla 1000 karakter olabilir'),
});

export type AnnouncementType = z.infer<typeof announcementSchema>;
