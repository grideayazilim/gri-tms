// Vitest (Test Motoru) Ayar Dosyası
// Bu dosya, testlerin nasıl çalıştırılacağını belirler.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // React bileşenlerini test edebilmemiz için gerekli eklenti
  plugins: [react()],
  test: {
    // Testlerin gerçek bir tarayıcı yerine 'jsdom' isimli sahte bir tarayıcıda çalışmasını sağlar
    environment: 'jsdom',
    // Her test dosyasından önce çalıştırılacak hazırlık dosyası
    setupFiles: ['./vitest.setup.ts'],
    // Test fonksiyonlarını (describe, it, expect) import etmeden kullanabilmemizi sağlar
    globals: true,
  },
});
