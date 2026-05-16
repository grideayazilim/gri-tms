// Test Öncesi Kurulum Dosyası (Setup)
// Bu dosya, her bir test çalışmadan hemen önce otomatik olarak çalıştırılır.

// Ekranda "buton var mı", "yazı kırmızı mı" gibi (DOM) kontrollerini yapabilmemizi sağlayan eklenti
import '@testing-library/jest-dom';
// Vitest'in yaşam döngüsü (lifecycle) fonksiyonlarını içeri aktarıyoruz
import { beforeAll, afterEach, afterAll } from 'vitest';
// Sahte sunucumuzu (MSW) oluşturmamızı sağlayan fonksiyon
import { setupServer } from 'msw/node';
// Sahte sunucumuzun vereceği sahte cevapların (mock) listesi
import { handlers } from './tests/mocks/handlers';

// Sahte sunucuyu başlatıyoruz
export const server = setupServer(...handlers);

// Tüm testler BAŞLAMADAN ÖNCE sahte sunucuyu dinlemeye başla
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// HER test BİTTİKTEN SONRA sahte cevapları sıfırla (bir test diğerini etkilemesin)
afterEach(() => server.resetHandlers());

// Tüm testler tamamen BİTTİKTEN SONRA sahte sunucuyu kapat
afterAll(() => server.close());
