import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../vitest.setup';
import { bulkImportEmployees } from './importService';

/*
  importService unit testleri — MSW ile gerçek HTTP istekleri test edilir.

  Her fonksiyon için:
  - Doğru endpoint'e POST ile istek attığı
  - Gönderilen body doğruluğu
  - Dönen response yapısı (success, data, vb.)
  - Hata durumlarının doğru ele alındığı
  test edilir.
*/

describe('importService', () => {

  // ─── bulkImportEmployees ───────────────────────────────────────────────────

  describe('bulkImportEmployees', () => {
    it('POST /import/bulk-employees endpoint\'ine çalışan listesi göndermeli', async () => {
      let capturedBody: Record<string, unknown> | null = null;

      server.use(
        http.post('*/api/import/bulk-employees', async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json({
            success: true,
            data: { successCount: 3, failures: [] },
          });
        }),
      );

      const employees = [
        { tcNo: '11111111111', firstName: 'A', lastName: 'B' },
        { tcNo: '22222222222', firstName: 'C', lastName: 'D' },
        { tcNo: '33333333333', firstName: 'E', lastName: 'F' },
      ];
      const result = await bulkImportEmployees({ employees } as any);

      expect(capturedBody).toMatchObject({ employees });
      expect(result).toMatchObject({
        success: true,
        data: { successCount: 3, failures: [] },
      });
    });

    it('boş liste ile de çalışmalı', async () => {
      server.use(
        http.post('*/api/import/bulk-employees', () =>
          HttpResponse.json({ success: true, data: { successCount: 0, failures: [] } }),
        ),
      );

      const result = await bulkImportEmployees({ employees: [] } as any);
      expect(result).toMatchObject({
        data: { successCount: 0, failures: [] },
      });
    });

    it('kısmi başarı senaryosunda failures döndürmeli', async () => {
      server.use(
        http.post('*/api/import/bulk-employees', () =>
          HttpResponse.json({
            success: true,
            data: {
              successCount: 2,
              failures: [{ tcNo: '33333333333', reason: 'TC kimlik no zaten kayıtlı' }],
            },
          }),
        ),
      );

      const result = await bulkImportEmployees({
        employees: [
          { tcNo: '11111111111' },
          { tcNo: '22222222222' },
          { tcNo: '33333333333' },
        ],
      } as any);

      expect(result).toMatchObject({
        data: {
          successCount: 2,
          failures: [{ tcNo: '33333333333' }],
        },
      });
    });

    it('sunucu hatası durumunda reject olmalı', async () => {
      server.use(
        http.post('*/api/import/bulk-employees', () =>
          HttpResponse.json({ message: 'İçe aktarım sırasında hata oluştu' }, { status: 500 }),
        ),
      );

      await expect(bulkImportEmployees({ employees: [] } as any))
        .rejects.toMatchObject({ status: 500 });
    });
  });
});
