// Hook'ları test etmek için gerekli kütüphaneler
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
// MSW (Sahte Sunucu)
import { http, HttpResponse } from 'msw';
import { server } from '../../../vitest.setup';
import { useUsers } from './useUsers';

/*
  useUsers hook'u kullanıcı yönetimi (Admin/Birim Sorumlusu gibi) işlemlerini yapar.
  Bu test dosyasında GET /users, PUT /users/:id, DELETE /users/:id ve PUT /users/me
  işlemleri mocklanarak hook'un iç mantığı (CRUD) test edilir.
*/
describe('useUsers hook', () => {
  it('başlangıç değerleri (state) doğru olmalı', () => {
    const { result } = renderHook(() => useUsers());

    expect(result.current.users).toEqual([]);
    expect(result.current.pagination).toEqual({ totalRecords: 0, totalPages: 0, currentPage: 1, limit: 10 });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  // --- fetchUsers ---
  describe('fetchUsers', () => {
    it('başarılı (success: true) cevap geldiğinde users dizisi güncellenmeli', async () => {
      server.use(
        http.get('*/api/users', () => HttpResponse.json({
          success: true,
          data: {
            users: [{ id: 'u-1', username: 'admin', role: 'admin' }],
            pagination: { totalRecords: 1, totalPages: 1, currentPage: 1, limit: 10 }
          }
        }))
      );

      const { result } = renderHook(() => useUsers());

      let response: any;
      await act(async () => {
        response = await result.current.fetchUsers();
      });

      expect(response?.success).toBe(true);
      expect(result.current.users).toHaveLength(1);
      expect(result.current.users[0]?.username).toBe('admin');
      expect((result.current.pagination as any)?.totalRecords).toBe(1);
      expect(result.current.isLoading).toBe(false);
    });

    it('API hata döndüğünde state error ile güncellenmeli', async () => {
      server.use(
        http.get('*/api/users', () => HttpResponse.json({ message: 'Yetkisiz erişim' }, { status: 403 }))
      );

      const { result } = renderHook(() => useUsers());

      let response: any;
      await act(async () => {
        response = await result.current.fetchUsers();
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Yetkisiz erişim');
      expect(result.current.error).toBe('Yetkisiz erişim');
    });
  });

  // --- editUser ---
  describe('editUser', () => {
    it('başarıyla güncellendiğinde true dönmeli ve veriyi iletmeli', async () => {
      server.use(
        http.put('*/api/users/*', () => HttpResponse.json({
          success: true,
          data: { id: 'u-1', username: 'admin', role: 'manager' }
        }))
      );

      const { result } = renderHook(() => useUsers());

      let response: any;
      await act(async () => {
        response = await result.current.editUser('u-1', { role: 'manager' } as any);
      });

      expect(response?.success).toBe(true);
      expect((response as any)?.data?.user?.role).toBe('manager');
    });

    it('hata oluştuğunda false dönmeli', async () => {
      server.use(
        http.put('*/api/users/*', () => HttpResponse.json({ message: 'Güncelleme başarısız' }, { status: 400 }))
      );

      const { result } = renderHook(() => useUsers());

      let response: any;
      await act(async () => {
        response = await result.current.editUser('u-1', {} as any);
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Güncelleme başarısız');
    });
  });

  // --- removeUser ---
  describe('removeUser', () => {
    it('başarıyla silindiğinde true dönmeli', async () => {
      server.use(
        http.delete('*/api/users/*', () => HttpResponse.json({ success: true }))
      );

      const { result } = renderHook(() => useUsers());

      let response: any;
      await act(async () => {
        response = await result.current.removeUser('u-1');
      });

      expect(response?.success).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('silinemezse hata mesajını dönmeli', async () => {
      server.use(
        http.delete('*/api/users/*', () => HttpResponse.json({ message: 'Son admin silinemez' }, { status: 403 }))
      );

      const { result } = renderHook(() => useUsers());

      let response: any;
      await act(async () => {
        response = await result.current.removeUser('u-1');
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Son admin silinemez');
    });
  });

  // --- editProfile ---
  describe('editProfile', () => {
    it('profil (kendi bilgileri) güncellendiğinde true dönmeli', async () => {
      server.use(
        http.put('*/api/users/me', () => HttpResponse.json({
          success: true,
          message: 'Profil başarıyla güncellendi',
          data: { id: 'me', username: 'yeni_admin' }
        }))
      );

      const { result } = renderHook(() => useUsers());

      let response: any;
      await act(async () => {
        response = await result.current.editProfile({ password: '123' } as any);
      });

      expect(response?.success).toBe(true);
      expect((response as any)?.data?.message).toBe('Profil başarıyla güncellendi');
      expect((response as any)?.data?.user?.username).toBe('yeni_admin');
    });

    it('profil güncellerken hata oluşursa error dönmeli', async () => {
      server.use(
        http.put('*/api/users/me', () => HttpResponse.json({ message: 'Şifre çok kısa' }, { status: 400 }))
      );

      const { result } = renderHook(() => useUsers());

      let response: any;
      await act(async () => {
        response = await result.current.editProfile({ password: '12' } as any);
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Şifre çok kısa');
    });
  });
});
