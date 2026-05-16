import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../vitest.setup';
import {
  getLocations, getUnits, getUnitsByLocation,
  createLocation, updateLocation, syncLocationWithUnits, deleteLocation,
  createUnit, updateUnit, deleteUnit,
} from './locationAndUnitService';

/*
  locationAndUnitService unit testleri — MSW ile gerçek HTTP istekleri test edilir.

  Her fonksiyon için:
  - Doğru endpoint'e doğru HTTP metodu ile istek attığı
  - URL parametrelerinin doğruluğu (locationId, unitId)
  - Gönderilen body doğruluğu
  - Dönen response yapısı
  - Hata durumlarının doğru ele alındığı
  test edilir.
*/

// ─── Mock verileri ────────────────────────────────────────────────────────────

const mockLocation = { id: '1', name: 'Merkez Yerleşke', programNo: '101' };
const mockUnit = { id: '1', name: 'Yazılım Birimi', locationId: '1' };

describe('locationAndUnitService', () => {

  // ─── getLocations ──────────────────────────────────────────────────────────

  describe('getLocations', () => {
    it('GET /locationAndUnits/locations endpoint\'ine istek atmalı', async () => {
      server.use(
        http.get('*/api/locationAndUnits/locations', () =>
          HttpResponse.json({
            success: true,
            data: { locations: [mockLocation] },
          }),
        ),
      );

      const result = await getLocations();
      expect(result).toMatchObject({
        success: true,
        data: { locations: [mockLocation] },
      });
    });

    it('boş yerleşke listesi döndürebilmeli', async () => {
      server.use(
        http.get('*/api/locationAndUnits/locations', () =>
          HttpResponse.json({ success: true, data: { locations: [] } }),
        ),
      );

      const result = await getLocations();
      expect(result).toMatchObject({ data: { locations: [] } });
    });
  });

  // ─── getUnits ──────────────────────────────────────────────────────────────

  describe('getUnits', () => {
    it('GET /locationAndUnits/units endpoint\'ine istek atmalı', async () => {
      server.use(
        http.get('*/api/locationAndUnits/units', () =>
          HttpResponse.json({
            success: true,
            data: { units: [mockUnit] },
          }),
        ),
      );

      const result = await getUnits();
      expect(result).toMatchObject({
        success: true,
        data: { units: [mockUnit] },
      });
    });
  });

  // ─── getUnitsByLocation ────────────────────────────────────────────────────

  describe('getUnitsByLocation', () => {
    it('GET /locationAndUnits/locations/:locationId/units endpoint\'ine istek atmalı', async () => {
      let capturedLocationId: string | undefined;

      server.use(
        http.get('*/api/locationAndUnits/locations/:locationId/units', ({ params }) => {
          capturedLocationId = params.locationId as string;
          return HttpResponse.json({
            success: true,
            data: { units: [mockUnit] },
          });
        }),
      );

      const result = await getUnitsByLocation('loc-42');
      expect(capturedLocationId).toBe('loc-42');
      expect(result).toMatchObject({
        success: true,
        data: { units: [mockUnit] },
      });
    });

    it('geçersiz locationId ile 404 döndürmeli', async () => {
      server.use(
        http.get('*/api/locationAndUnits/locations/:locationId/units', () =>
          HttpResponse.json({ message: 'Yerleşke bulunamadı' }, { status: 404 }),
        ),
      );

      await expect(getUnitsByLocation('nonexistent'))
        .rejects.toMatchObject({ status: 404 });
    });
  });

  // ─── createLocation ────────────────────────────────────────────────────────

  describe('createLocation', () => {
    it('POST /locationAndUnits/locations endpoint\'ine doğru payload göndermeli', async () => {
      let capturedBody: Record<string, unknown> | null = null;

      server.use(
        http.post('*/api/locationAndUnits/locations', async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json({
            success: true,
            data: { location: { id: '2', ...capturedBody } },
          });
        }),
      );

      const result = await createLocation({ name: 'Yeni Yerleşke' } as any);

      expect(capturedBody).toMatchObject({ name: 'Yeni Yerleşke' });
      expect(result).toMatchObject({
        success: true,
        data: { location: { name: 'Yeni Yerleşke' } },
      });
    });

    it('aynı isimle oluşturma denemesinde hata döndürmeli', async () => {
      server.use(
        http.post('*/api/locationAndUnits/locations', () =>
          HttpResponse.json({ message: 'Bu isimde yerleşke zaten mevcut' }, { status: 409 }),
        ),
      );

      await expect(createLocation({ name: 'Merkez' } as any))
        .rejects.toMatchObject({ status: 409 });
    });
  });

  // ─── updateLocation ────────────────────────────────────────────────────────

  describe('updateLocation', () => {
    it('PUT /locationAndUnits/locations/:id endpoint\'ine doğru payload göndermeli', async () => {
      let capturedId: string | undefined;
      let capturedBody: Record<string, unknown> | null = null;

      server.use(
        http.put('*/api/locationAndUnits/locations/:id', async ({ params, request }) => {
          capturedId = params.id as string;
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json({
            success: true,
            data: { location: { id: capturedId, ...capturedBody } },
          });
        }),
      );

      const result = await updateLocation('loc-1', { name: 'Güncel İsim' } as any);

      expect(capturedId).toBe('loc-1');
      expect(capturedBody).toMatchObject({ name: 'Güncel İsim' });
      expect(result).toMatchObject({
        success: true,
        data: { location: { name: 'Güncel İsim' } },
      });
    });
  });

  // ─── syncLocationWithUnits ─────────────────────────────────────────────────

  describe('syncLocationWithUnits', () => {
    it('PUT /locationAndUnits/locations/:id/sync endpoint\'ine units listesi göndermeli', async () => {
      let capturedId: string | undefined;
      let capturedBody: Record<string, unknown> | null = null;

      server.use(
        http.put('*/api/locationAndUnits/locations/:id/sync', async ({ params, request }) => {
          capturedId = params.id as string;
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json({
            success: true,
            data: { location: mockLocation },
          });
        }),
      );

      const syncData = {
        units: [
          { name: 'Birim A' },
          { name: 'Birim B' },
        ],
      };
      const result = await syncLocationWithUnits('loc-5', syncData as any);

      expect(capturedId).toBe('loc-5');
      expect(capturedBody).toMatchObject({ units: syncData.units });
      expect(result).toMatchObject({ success: true });
    });

    it('sunucu hatası durumunda reject olmalı', async () => {
      server.use(
        http.put('*/api/locationAndUnits/locations/:id/sync', () =>
          HttpResponse.json({ message: 'Senkronizasyon hatası' }, { status: 500 }),
        ),
      );

      await expect(syncLocationWithUnits('1', { units: [] } as any))
        .rejects.toMatchObject({ status: 500 });
    });
  });

  // ─── deleteLocation ────────────────────────────────────────────────────────

  describe('deleteLocation', () => {
    it('DELETE /locationAndUnits/locations/:id endpoint\'ine istek atmalı', async () => {
      let capturedId: string | undefined;

      server.use(
        http.delete('*/api/locationAndUnits/locations/:id', ({ params }) => {
          capturedId = params.id as string;
          return HttpResponse.json({ success: true, data: {} });
        }),
      );

      const result = await deleteLocation('loc-99');
      expect(capturedId).toBe('loc-99');
      expect(result).toMatchObject({ success: true });
    });

    it('bağlı çalışan varsa silme hatası döndürmeli', async () => {
      server.use(
        http.delete('*/api/locationAndUnits/locations/:id', () =>
          HttpResponse.json({ message: 'Bu yerleşkeye bağlı çalışanlar var' }, { status: 409 }),
        ),
      );

      await expect(deleteLocation('loc-1'))
        .rejects.toMatchObject({ status: 409, message: 'Bu yerleşkeye bağlı çalışanlar var' });
    });
  });

  // ─── createUnit ────────────────────────────────────────────────────────────

  describe('createUnit', () => {
    it('POST /locationAndUnits/units endpoint\'ine locationId ve name göndermeli', async () => {
      let capturedBody: Record<string, unknown> | null = null;

      server.use(
        http.post('*/api/locationAndUnits/units', async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json({
            success: true,
            data: { unit: { id: '10', locationId: '1', name: 'Yeni Birim' } },
          });
        }),
      );

      const result = await createUnit({ locationId: '1', name: 'Yeni Birim' });

      expect(capturedBody).toEqual({ locationId: '1', name: 'Yeni Birim' });
      expect(result).toMatchObject({
        success: true,
        data: { unit: { name: 'Yeni Birim', locationId: '1' } },
      });
    });
  });

  // ─── updateUnit ────────────────────────────────────────────────────────────

  describe('updateUnit', () => {
    it('PUT /locationAndUnits/units/:id endpoint\'ine yeni name göndermeli', async () => {
      let capturedId: string | undefined;
      let capturedBody: Record<string, unknown> | null = null;

      server.use(
        http.put('*/api/locationAndUnits/units/:id', async ({ params, request }) => {
          capturedId = params.id as string;
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json({
            success: true,
            data: { unit: { id: capturedId, name: 'Güncel Birim' } },
          });
        }),
      );

      const result = await updateUnit('unit-7', { name: 'Güncel Birim' });

      expect(capturedId).toBe('unit-7');
      expect(capturedBody).toEqual({ name: 'Güncel Birim' });
      expect(result).toMatchObject({
        data: { unit: { name: 'Güncel Birim' } },
      });
    });
  });

  // ─── deleteUnit ────────────────────────────────────────────────────────────

  describe('deleteUnit', () => {
    it('DELETE /locationAndUnits/units/:id endpoint\'ine istek atmalı', async () => {
      let capturedId: string | undefined;

      server.use(
        http.delete('*/api/locationAndUnits/units/:id', ({ params }) => {
          capturedId = params.id as string;
          return HttpResponse.json({ success: true, data: {} });
        }),
      );

      const result = await deleteUnit('unit-3');
      expect(capturedId).toBe('unit-3');
      expect(result).toMatchObject({ success: true });
    });

    it('bağlı çalışan varsa silme hatası döndürmeli', async () => {
      server.use(
        http.delete('*/api/locationAndUnits/units/:id', () =>
          HttpResponse.json({ message: 'Bu birime bağlı çalışanlar var' }, { status: 409 }),
        ),
      );

      await expect(deleteUnit('unit-1'))
        .rejects.toMatchObject({ status: 409 });
    });
  });
});
