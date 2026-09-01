import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../vitest.setup';
import { useSignupTree } from './useSignupTree';

/* Kayıt ekranı public bir uca ihtiyaç duyuyor ama eski uçlar programNo
   (İŞKUR kurum kimliği) ve employeeCount gibi alanları da kimliksiz
   döndürüyordu. Bu hook yalnızca id + ad döndüren tek public ucu kullanır. */
describe('useSignupTree hook', () => {
  const treeResponse = {
    success: true,
    data: {
      locations: [
        {
          id: 'loc-1',
          name: 'MERKEZ KAMPÜS',
          units: [
            { id: 'unit-1', name: 'BİLGİ İŞLEM' },
            { id: 'unit-2', name: 'KÜTÜPHANE' },
          ],
        },
        { id: 'loc-2', name: 'İKİNCİ KAMPÜS', units: [] },
      ],
    },
  };

  it('başlangıç değerleri doğru olmalı', () => {
    const { result } = renderHook(() => useSignupTree());

    expect(result.current.locations).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('public signup-tree ucundan ağacı çeker', async () => {
    server.use(
      http.get('*/api/locationAndUnits/public/signup-tree', () => HttpResponse.json(treeResponse)),
    );

    const { result } = renderHook(() => useSignupTree());

    await act(async () => {
      await result.current.fetchTree();
    });

    expect(result.current.locations).toHaveLength(2);
    expect(result.current.locations[0]?.name).toBe('MERKEZ KAMPÜS');
  });

  it('korumalı /locations ucunu ÇAĞIRMAZ', async () => {
    let protectedCalled = false;
    server.use(
      http.get('*/api/locationAndUnits/locations', () => {
        protectedCalled = true;
        return HttpResponse.json({ success: true, data: { locations: [] } });
      }),
      http.get('*/api/locationAndUnits/public/signup-tree', () => HttpResponse.json(treeResponse)),
    );

    const { result } = renderHook(() => useSignupTree());
    await act(async () => {
      await result.current.fetchTree();
    });

    expect(protectedCalled).toBe(false);
  });

  it('unitsFor seçili yerleşkenin birimlerini döner (ikinci istek atmadan)', async () => {
    server.use(
      http.get('*/api/locationAndUnits/public/signup-tree', () => HttpResponse.json(treeResponse)),
    );

    const { result } = renderHook(() => useSignupTree());
    await act(async () => {
      await result.current.fetchTree();
    });

    expect(result.current.unitsFor('loc-1')).toHaveLength(2);
    expect(result.current.unitsFor('loc-2')).toHaveLength(0);
    expect(result.current.unitsFor(null)).toEqual([]);
    expect(result.current.unitsFor('bilinmeyen')).toEqual([]);
  });

  it('sunucu hata dönerse locations boş kalır', async () => {
    server.use(
      http.get('*/api/locationAndUnits/public/signup-tree', () =>
        HttpResponse.json({ message: 'Sunucu Hatası' }, { status: 500 })),
    );

    const { result } = renderHook(() => useSignupTree());
    await act(async () => {
      await result.current.fetchTree();
    });

    expect(result.current.locations).toEqual([]);
  });

  it('success:false yanıtında locations boş kalır', async () => {
    server.use(
      http.get('*/api/locationAndUnits/public/signup-tree', () =>
        HttpResponse.json({ success: false })),
    );

    const { result } = renderHook(() => useSignupTree());
    await act(async () => {
      await result.current.fetchTree();
    });

    expect(result.current.locations).toEqual([]);
  });
});
