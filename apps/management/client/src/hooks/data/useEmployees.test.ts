import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
// MSW (Sahte Sunucu)
import { http, HttpResponse } from 'msw';
import { server } from '../../../vitest.setup';
import { useEmployees } from './useEmployees';
import { DEFAULT_PAGINATION } from '../../constants/pagination';

describe('useEmployees hook', () => {
  it('başlangıç değerleri (state) doğru olmalı', () => {
    const { result } = renderHook(() => useEmployees());

    expect(result.current.employees).toEqual([]);
    expect(result.current.pagination).toEqual({ totalRecords: 0, totalPages: 0, currentPage: 1, limit: DEFAULT_PAGINATION.limit }); // DEFAULT_PAGINATION
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  // --- fetchEmployees ---
  describe('fetchEmployees', () => {
    it('başarılı (success: true) cevap geldiğinde employees ve pagination güncellenmeli', async () => {
      server.use(
        http.get('*/api/employees', () => {
          return HttpResponse.json({
            success: true,
            data: {
              employees: [
                { id: 'emp-1', firstName: 'Ayşe', lastName: 'Yılmaz', tcNo: '11111111111' }
              ],
              pagination: { totalRecords: 1, totalPages: 1, currentPage: 1, limit: 40 }
            }
          });
        })
      );

      const { result } = renderHook(() => useEmployees());

      let response: any;
      await act(async () => {
        response = await result.current.fetchEmployees();
      });

      expect(response?.success).toBe(true);
      expect(result.current.employees).toHaveLength(1);
      expect(result.current.employees[0]?.firstName).toBe('Ayşe');
      expect((result.current.pagination as any)?.totalRecords).toBe(1);
      expect(result.current.isLoading).toBe(false);
    });

    it('API hata (500) döndüğünde hata mesajı kaydedilmeli', async () => {
      server.use(
        http.get('*/api/employees', () => HttpResponse.json({ message: 'Sunucuya ulaşılamıyor' }, { status: 500 }))
      );

      const { result } = renderHook(() => useEmployees());

      let response: any;
      await act(async () => {
        response = await result.current.fetchEmployees();
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Sunucuya ulaşılamıyor');
      expect(result.current.error).toBe('Sunucuya ulaşılamıyor');
    });
  });

  // --- addEmployee ---
  describe('addEmployee', () => {
    it('başarıyla eklendiğinde success: true dönmeli', async () => {
      server.use(
        http.post('*/api/employees', () => HttpResponse.json({
          success: true,
          data: { employee: { id: 'emp-new', firstName: 'Veli' } }
        }))
      );

      const { result } = renderHook(() => useEmployees());
      const newEmpData = { firstName: 'Veli', lastName: 'Demir', tcNo: '22222222222' } as any;

      let response: any;
      await act(async () => {
        response = await result.current.addEmployee(newEmpData);
      });

      expect(response?.success).toBe(true);
      expect((response as any)?.data?.employee?.id).toBe('emp-new');
      expect(result.current.isLoading).toBe(false);
    });

    it('eklerken hata oluşursa success: false ve hata mesajı dönmeli', async () => {
      server.use(
        http.post('*/api/employees', () => HttpResponse.json({ message: 'Aynı TC ile kayıtlı personel var' }, { status: 409 }))
      );

      const { result } = renderHook(() => useEmployees());

      let response: any;
      await act(async () => {
        response = await result.current.addEmployee({} as any);
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Aynı TC ile kayıtlı personel var');
      expect(result.current.error).toBe('Aynı TC ile kayıtlı personel var');
    });
  });

  // --- editEmployee ---
  describe('editEmployee', () => {
    it('başarıyla güncellendiğinde success: true dönmeli', async () => {
      server.use(
        http.put('*/api/employees/*', () => HttpResponse.json({
          success: true,
          data: { employee: { id: 'emp-edit', firstName: 'Güncel İsim' } }
        }))
      );

      const { result } = renderHook(() => useEmployees());

      let response: any;
      await act(async () => {
        response = await result.current.editEmployee('emp-edit', { firstName: 'Güncel İsim' } as any);
      });

      expect(response?.success).toBe(true);
      expect((response as any)?.data?.employee?.firstName).toBe('Güncel İsim');
    });

    it('güncelleme sırasında hata olursa yakalamalı', async () => {
      server.use(
        http.put('*/api/employees/*', () => HttpResponse.json({ message: 'Güncelleme hatası' }, { status: 400 }))
      );

      const { result } = renderHook(() => useEmployees());

      let response: any;
      await act(async () => {
        response = await result.current.editEmployee('id1', {} as any);
      });

      expect(response?.success).toBe(false);
      expect(result.current.error).toBe('Güncelleme hatası');
    });
  });

  // --- removeEmployee ---
  describe('removeEmployee', () => {
    it('başarıyla silindiğinde success: true dönmeli', async () => {
      server.use(
        http.delete('*/api/employees/*', () => HttpResponse.json({ success: true }))
      );

      const { result } = renderHook(() => useEmployees());

      let response: any;
      await act(async () => {
        response = await result.current.removeEmployee('emp-1');
      });

      expect(response?.success).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('silme sırasında hata olursa hatayı dönmeli', async () => {
      server.use(
        http.delete('*/api/employees/*', () => HttpResponse.json({ message: 'Bu çalışana ait puantaj kayıtları var, silinemez' }, { status: 400 }))
      );

      const { result } = renderHook(() => useEmployees());

      let response: any;
      await act(async () => {
        response = await result.current.removeEmployee('emp-1');
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Bu çalışana ait puantaj kayıtları var, silinemez');
    });
  });

  // ─── success:false (HTTP 200) branches ──────────────────────────────────────

  it('fetchEmployees — HTTP 200 success:false döndüğünde hata kolu çalışmalı', async () => {
    server.use(
      http.get('*/api/employees', () => HttpResponse.json({ success: false, message: 'Listelenemedi' }))
    );
    const { result } = renderHook(() => useEmployees());
    let response: any;
    await act(async () => { response = await result.current.fetchEmployees(); });
    expect(response?.success).toBe(false);
    expect(result.current.error).toBe('Listelenemedi');
  });

  it('addEmployee — HTTP 200 success:false döndüğünde hata kolu çalışmalı', async () => {
    server.use(
      http.post('*/api/employees', () => HttpResponse.json({ success: false, message: 'TC geçersiz' }))
    );
    const { result } = renderHook(() => useEmployees());
    let response: any;
    await act(async () => { response = await result.current.addEmployee({} as any); });
    expect(response?.success).toBe(false);
    expect(response?.error).toBe('TC geçersiz');
  });

  it('editEmployee — HTTP 200 success:false döndüğünde hata kolu çalışmalı', async () => {
    server.use(
      http.put('*/api/employees/*', () => HttpResponse.json({ success: false, message: 'Güncelleme reddedildi' }))
    );
    const { result } = renderHook(() => useEmployees());
    let response: any;
    await act(async () => { response = await result.current.editEmployee('emp-1', {} as any); });
    expect(response?.success).toBe(false);
    expect(response?.error).toBe('Güncelleme reddedildi');
  });

  it('removeEmployee — HTTP 200 success:false döndüğünde hata kolu çalışmalı', async () => {
    server.use(
      http.delete('*/api/employees/*', () => HttpResponse.json({ success: false, message: 'Silme reddedildi' }))
    );
    const { result } = renderHook(() => useEmployees());
    let response: any;
    await act(async () => { response = await result.current.removeEmployee('emp-1'); });
    expect(response?.success).toBe(false);
    expect(response?.error).toBe('Silme reddedildi');
  });
});
