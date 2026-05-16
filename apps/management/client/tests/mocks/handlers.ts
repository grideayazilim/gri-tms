// MSW (Mock Service Worker) Cevap Yönlendiricileri (Handlers)
// Frontend kodumuz internete (gerçek backend'e) istek attığında,
// bu dosya araya girer ve gerçek sunucuya gitmesini engelleyip sahte cevaplar döndürür.

import { http, HttpResponse } from 'msw';

export const handlers = [
  // Örnek: Eğer frontend kodu '/api/health' adresine GET isteği atarsa...
  http.get('*/api/health', () => {
    // ...gerçek sunucuya gitme, doğrudan şu sahte JSON cevabını döndür:
    return HttpResponse.json({ status: 'ok' });
  }),
  
  // İleride buraya login, kullanıcı listesi vs. için sahte cevaplar ekleyeceğiz.
];
