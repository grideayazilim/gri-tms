// React hook'larını test etmek için renderHook ve state güncellemelerini sarmalamak için act kullanıyoruz
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAsync } from './useAsync';

/*
describe: Testleri mantıksal olarak gruplamak (bir klasör gibi) için kullanılır.
it: Asıl test senaryosunu yazdığımız yerdir (bir dosya gibi düşünebilirsin).
expect: Beklediğimiz sonucun gerçekleşip gerçekleşmediğini kontrol eder.
*/
describe('useAsync hook', () => {
  it('başlangıç değerleri (isLoading: false, error: null) doğru olmalı', () => {
    // Hook'u sanki bir bileşenin içindeymiş gibi çalıştırır
    const { result } = renderHook(() => useAsync());

    // Başlangıçta yükleniyor olmamalı ve hata olmamalı
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('başarılı bir işlemde (success) loading state ini güncellemeli ve datayı dönmeli', async () => {
    const { result } = renderHook(() => useAsync());
    
    // Sahte bir başarılı asenkron fonksiyon
    const mockSuccessFn = async () => 'Harika bir veri';

    // act: Hook içindeki durumları (state) değiştiren asenkron işlemleri sarmalar
    let response;
    await act(async () => {
      // Fonksiyonu çalıştır ve sonucunu kaydet
      response = await result.current.run(mockSuccessFn);
    });

    // İşlem bittikten sonra loading false olmalı ve dönen değer başarılı (success: true) olmalı
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(response).toEqual({ success: true, data: 'Harika bir veri' });
  });

  it('hata veren bir işlemde (error) loading state ini güncellemeli ve hatayı yakalamalı', async () => {
    const { result } = renderHook(() => useAsync());
    
    // Sahte bir hata asenkron fonksiyonu
    const mockErrorFn = async () => { throw new Error('İnternet koptu!'); };

    let response;
    await act(async () => {
      response = await result.current.run(mockErrorFn);
    });

    // İşlem bittikten sonra loading false olmalı, error state'ine hata mesajı yazılmalı ve dönen obje hatalı (success: false) olmalı
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('İnternet koptu!');
    expect(response).toEqual({ success: false, error: 'İnternet koptu!' });
  });

  it('hata oluştuğunda onError callback fonksiyonu çağrılmalı (eğer verildiyse)', async () => {
    const { result } = renderHook(() => useAsync());
    
    // vi.fn(): Bizim için sahte (mock) bir fonksiyon yaratır, böylece çağrılıp çağrılmadığını takip edebiliriz
    const onErrorMock = vi.fn();
    const mockErrorFn = async () => { throw new Error('Başka bir hata!'); };

    await act(async () => {
      // Opsiyonel olan onError parametresini veriyoruz
      await result.current.run(mockErrorFn, { onError: onErrorMock });
    });

    // onErrorMock fonksiyonu tam olarak 1 kere çağrılmış olmalı
    expect(onErrorMock).toHaveBeenCalledTimes(1);
    // İçine de fırlattığımız Error objesi gönderilmiş olmalı
    expect(onErrorMock).toHaveBeenCalledWith(new Error('Başka bir hata!'));
  });
});
