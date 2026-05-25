import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
// MSW (Sahte Sunucu)
import { http, HttpResponse } from 'msw';
import { server } from '../../../vitest.setup';
import { useAuditLogs } from './useAuditLogs';
import { DEFAULT_PAGINATION } from '../../constants/pagination';

/*
  useAuditLogs hook'u denetim kayıtlarını (kim ne yaptı) listeler.
  Tek bir fonksiyon (fetchAuditLogs) içerir ve filtreleme ile sayfalama destekler.
  GET /api/audit-logs endpoint'i üzerinden çalışır.
*/
describe('useAuditLogs hook', () => {
  it('başlangıç değerleri (state) doğru olmalı', () => {
    const { result } = renderHook(() => useAuditLogs());

    expect(result.current.auditLogs).toEqual([]);
    expect(result.current.pagination).toEqual({ totalRecords: 0, totalPages: 0, currentPage: 1, limit: DEFAULT_PAGINATION.limit });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  describe('fetchAuditLogs', () => {
    it('başarıyla denetim kayıtlarını çekmeli ve state e kaydetmeli', async () => {
      server.use(
        http.get('*/api/audit-logs', () => HttpResponse.json({
          success: true,
          data: {
            auditLogs: [
              { id: 'log-1', action: 'LOGIN', actorName: 'admin', createdAt: '2026-05-16T10:00:00Z' },
              { id: 'log-2', action: 'EMPLOYEE_CREATE', actorName: 'admin', createdAt: '2026-05-16T11:00:00Z' }
            ],
            pagination: { totalRecords: 2, totalPages: 1, currentPage: 1, limit: 40 }
          }
        }))
      );

      const { result } = renderHook(() => useAuditLogs());

      let response: any;
      await act(async () => {
        response = await result.current.fetchAuditLogs();
      });

      expect(response?.success).toBe(true);
      expect(result.current.auditLogs).toHaveLength(2);
      expect(result.current.auditLogs[0]?.action).toBe('LOGIN');
      expect((result.current.pagination as any)?.totalRecords).toBe(2);
      expect(result.current.isLoading).toBe(false);
    });

    it('filtre parametreleriyle çağrıldığında doğru sonuçları getirmeli', async () => {
      // Sadece belirli bir aksiyon türü (LOGIN) filtrelenmiş log döner
      server.use(
        http.get('*/api/audit-logs', ({ request }) => {
          const url = new URL(request.url);
          if (url.searchParams.get('action') === 'LOGIN') {
            return HttpResponse.json({
              success: true,
              data: {
                auditLogs: [{ id: 'log-1', action: 'LOGIN', actorName: 'admin' }],
                pagination: { totalRecords: 1, totalPages: 1, currentPage: 1, limit: 40 }
              }
            });
          }
          return HttpResponse.json({ success: true, data: { auditLogs: [], pagination: {} } });
        })
      );

      const { result } = renderHook(() => useAuditLogs());

      let response: any;
      await act(async () => {
        // apiParams ile filtre gönder
        response = await result.current.fetchAuditLogs({ action: 'LOGIN' });
      });

      expect(response?.success).toBe(true);
      expect(result.current.auditLogs).toHaveLength(1);
      expect(result.current.auditLogs[0]?.action).toBe('LOGIN');
    });

    it('ikinci sayfayı çektiğinde sayfalama (pagination) doğru güncellenmeli', async () => {
      server.use(
        http.get('*/api/audit-logs', ({ request }) => {
          const url = new URL(request.url);
          const page = url.searchParams.get('page');
          return HttpResponse.json({
            success: true,
            data: {
              auditLogs: [{ id: `log-page-${page}`, action: 'UPDATE', actorName: 'admin' }],
              pagination: { totalRecords: 25, totalPages: 3, currentPage: Number(page), limit: 40 }
            }
          });
        })
      );

      const { result } = renderHook(() => useAuditLogs());

      await act(async () => {
        await result.current.fetchAuditLogs({}, 2); // Sayfa 2 ye geç
      });

      expect((result.current.pagination as any)?.currentPage).toBe(2);
      expect((result.current.pagination as any)?.totalPages).toBe(3);
    });

    it('boş sonuç geldiğinde auditLogs dizisi boş olmalı', async () => {
      server.use(
        http.get('*/api/audit-logs', () => HttpResponse.json({
          success: true,
          data: {
            auditLogs: [],
            pagination: { totalRecords: 0, totalPages: 0, currentPage: 1, limit: 40 }
          }
        }))
      );

      const { result } = renderHook(() => useAuditLogs());

      await act(async () => {
        await result.current.fetchAuditLogs();
      });

      expect(result.current.auditLogs).toHaveLength(0);
      expect((result.current.pagination as any)?.totalRecords).toBe(0);
    });

    it('API success: false döndürdüğünde error state güncellenmeli', async () => {
      server.use(
        http.get('*/api/audit-logs', () => HttpResponse.json({ message: 'Yetkisiz erişim' }, { status: 400 }))
      );

      const { result } = renderHook(() => useAuditLogs());

      let response: any;
      await act(async () => {
        response = await result.current.fetchAuditLogs();
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Yetkisiz erişim');
      expect(result.current.error).toBe('Yetkisiz erişim');
      expect(result.current.auditLogs).toEqual([]);
    });

    it('sunucu hatası (500) geldiğinde catch bloğu devreye girmeli', async () => {
      server.use(
        http.get('*/api/audit-logs', () => HttpResponse.json({ message: 'Sunucu çöktü' }, { status: 500 }))
      );

      const { result } = renderHook(() => useAuditLogs());

      let response: any;
      await act(async () => {
        response = await result.current.fetchAuditLogs();
      });

      expect(response?.success).toBe(false);
      expect(result.current.error).toBe('Sunucu çöktü');
      expect(result.current.isLoading).toBe(false);
    });

    it('HTTP 200 success:false döndüğünde hata kolu çalışmalı', async () => {
      server.use(
        http.get('*/api/audit-logs', () => HttpResponse.json({ success: false, message: 'Kayıtlar alınamadı' }))
      );
      const { result } = renderHook(() => useAuditLogs());
      let response: any;
      await act(async () => { response = await result.current.fetchAuditLogs(); });
      expect(response?.success).toBe(false);
      expect(result.current.error).toBe('Kayıtlar alınamadı');
    });
  });
});
