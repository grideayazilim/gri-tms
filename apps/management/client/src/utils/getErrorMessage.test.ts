import { describe, it, expect } from 'vitest';
import { getErrorMessage } from './getErrorMessage';

/*
describe: Testleri mantıksal olarak gruplamak (bir klasör gibi) için kullanılır.
it: Asıl test senaryosunu yazdığımız yerdir (bir dosya gibi düşünebilirsin).
expect: Yazdığımız kodun sonucunun, beklediğimiz (ummduğumuz) sonuçla eşleşip eşleşmediğini kontrol eder.
*/
describe('getErrorMessage', () => {
  it('Standart Javascript Error objesi verildiğinde mesajını dönmeli', () => {
    const error = new Error('Beklenmedik bir hata oluştu');
    // Error nesnesi verdiğimizde, içindeki "message" özelliğini okuyup döndürmesini bekliyoruz
    expect(getErrorMessage(error, 'Varsayılan hata')).toBe('Beklenmedik bir hata oluştu');
  });

  it('İçinde "message" özelliği olan bir obje verildiğinde mesajı dönmeli', () => {
    const customError = { message: 'Sunucuya ulaşılamıyor', code: 500 };
    // Özel bir obje verdiğimizde yine "message" kısmını bulmasını bekliyoruz
    expect(getErrorMessage(customError, 'Varsayılan hata')).toBe('Sunucuya ulaşılamıyor');
  });

  it('Geçersiz bir hata formatı veya string verildiğinde "fallback" (varsayılan) mesajını dönmeli', () => {
    // Hata bir obje değilse veya içinde message yoksa, bizim verdiğimiz varsayılan mesaj dönmeli
    expect(getErrorMessage('sadece bir metin', 'Varsayılan hata')).toBe('Varsayılan hata');
    expect(getErrorMessage(null, 'Varsayılan hata')).toBe('Varsayılan hata');
    expect(getErrorMessage(undefined, 'Varsayılan hata')).toBe('Varsayılan hata');
    expect(getErrorMessage({ code: 500 }, 'Varsayılan hata')).toBe('Varsayılan hata');
  });
});
