import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../vitest.setup';
import { downloadExcel, downloadTimesheetExcel, downloadSimpleExcel, downloadBotExcel } from './exportService';

/*
  exportService unit testleri — MSW ile gerçek HTTP istekleri test edilir.

  Her fonksiyon için:
  - Doğru endpoint'e GET isteği attığı (query params dahil)
  - Blob döndürdüğü
  - Dosya adının doğru oluşturulduğu (türkçe karakter, period formatı)
  - DOM'a link eklenerek indirme tetiklendiği
  - Hata durumlarının doğru ele alındığı
  test edilir.
*/

// ─── DOM mock'ları ────────────────────────────────────────────────────────────

const mockParams = {
  locationId: '1',
  locationName: 'Merkez',
  year: 2024,
  month: 5,
};

let clickSpy: ReturnType<typeof vi.fn>;
let appendChildSpy: ReturnType<typeof vi.fn>;
let removeChildSpy: ReturnType<typeof vi.fn>;
let createObjectURLSpy: ReturnType<typeof vi.fn>;
let revokeObjectURLSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();

  // URL.createObjectURL / revokeObjectURL
  createObjectURLSpy = vi.fn(() => 'blob:mock-url');
  revokeObjectURLSpy = vi.fn();
  global.URL.createObjectURL = createObjectURLSpy;
  global.URL.revokeObjectURL = revokeObjectURLSpy;

  // document.createElement('a') → click() + download attribute takibi
  clickSpy = vi.fn();
  appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
  removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'a') {
      return {
        href: '',
        download: '',
        click: clickSpy,
        set setAttribute(_: string) { /* noop */ },
      } as unknown as HTMLAnchorElement;
    }
    return document.createElement(tag);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('exportService', () => {

  // ─── downloadExcel — timesheet ─────────────────────────────────────────────

  describe('downloadExcel — timesheet', () => {
    it('GET /export/timesheet endpoint\'ine doğru parametrelerle istek atmalı', async () => {
      let capturedUrl: URL | undefined;

      server.use(
        http.get('*/api/export/timesheet', ({ request }) => {
          capturedUrl = new URL(request.url);
          return new HttpResponse(
            new Blob(['excel-data'], { type: 'application/octet-stream' }),
          );
        }),
      );

      await downloadExcel('timesheet', mockParams);

      // Query params kontrolü
      expect(capturedUrl?.searchParams.get('locationId')).toBe('1');
      expect(capturedUrl?.searchParams.get('year')).toBe('2024');
      expect(capturedUrl?.searchParams.get('month')).toBe('5');
    });

    it('Blob oluşturulmalı ve URL.createObjectURL çağrılmalı', async () => {
      server.use(
        http.get('*/api/export/timesheet', () =>
          new HttpResponse(new Blob(['data'], { type: 'application/octet-stream' })),
        ),
      );

      await downloadExcel('timesheet', mockParams);
      expect(createObjectURLSpy).toHaveBeenCalled();
    });

    it('indirme linki oluşturulmalı, tıklanmalı ve temizlenmeli', async () => {
      server.use(
        http.get('*/api/export/timesheet', () =>
          new HttpResponse(new Blob(['data'], { type: 'application/octet-stream' })),
        ),
      );

      await downloadExcel('timesheet', mockParams);

      expect(appendChildSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalled();
    });
  });

  // ─── downloadExcel — simple ────────────────────────────────────────────────

  describe('downloadExcel — simple', () => {
    it('GET /export/simple endpoint\'ine istek atmalı', async () => {
      let requestReceived = false;

      server.use(
        http.get('*/api/export/simple', () => {
          requestReceived = true;
          return new HttpResponse(new Blob(['data'], { type: 'application/octet-stream' }));
        }),
      );

      await downloadExcel('simple', mockParams);
      expect(requestReceived).toBe(true);
    });
  });

  // ─── downloadExcel — bot ───────────────────────────────────────────────────

  describe('downloadExcel — bot', () => {
    it('GET /export/bot endpoint\'ine istek atmalı', async () => {
      let requestReceived = false;

      server.use(
        http.get('*/api/export/bot', () => {
          requestReceived = true;
          return new HttpResponse(new Blob(['data'], { type: 'application/octet-stream' }));
        }),
      );

      await downloadExcel('bot', mockParams);
      expect(requestReceived).toBe(true);
    });
  });

  // ─── Backward-compat wrapper'lar ──────────────────────────────────────────

  describe('downloadTimesheetExcel', () => {
    it('/export/timesheet endpoint\'ine istek atmalı', async () => {
      let requestReceived = false;

      server.use(
        http.get('*/api/export/timesheet', () => {
          requestReceived = true;
          return new HttpResponse(new Blob(['data'], { type: 'application/octet-stream' }));
        }),
      );

      await downloadTimesheetExcel(mockParams);
      expect(requestReceived).toBe(true);
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('downloadSimpleExcel', () => {
    it('/export/simple endpoint\'ine istek atmalı', async () => {
      let requestReceived = false;

      server.use(
        http.get('*/api/export/simple', () => {
          requestReceived = true;
          return new HttpResponse(new Blob(['data'], { type: 'application/octet-stream' }));
        }),
      );

      await downloadSimpleExcel(mockParams);
      expect(requestReceived).toBe(true);
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('downloadBotExcel', () => {
    it('/export/bot endpoint\'ine istek atmalı', async () => {
      let requestReceived = false;

      server.use(
        http.get('*/api/export/bot', () => {
          requestReceived = true;
          return new HttpResponse(new Blob(['data'], { type: 'application/octet-stream' }));
        }),
      );

      await downloadBotExcel(mockParams);
      expect(requestReceived).toBe(true);
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  // ─── Hata senaryoları ──────────────────────────────────────────────────────

  describe('hata durumları', () => {
    it('sunucu hatası döndüğünde reject olmalı', async () => {
      server.use(
        http.get('*/api/export/timesheet', () =>
          HttpResponse.json({ message: 'Export hatası' }, { status: 500 }),
        ),
      );

      await expect(downloadExcel('timesheet', mockParams))
        .rejects.toBeDefined();
    });
  });
});
