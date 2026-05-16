// Hook'ları test etmek için gerekli kütüphaneler
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useBreakpoint } from './useBreakpoint';

/*
  useBreakpoint hook'u ekran genişliğine (window.innerWidth) göre
  isPhone / isTablet / isDesktop değerlerini döndürür.
  Sınır değerler:
    - phone   → width < 768
    - tablet  → 768 ≤ width < 1024
    - desktop → width ≥ 1024
*/
describe('useBreakpoint hook', () => {
  // Orijinal window.innerWidth değerini saklayıp testler bitince geri koyuyoruz
  const originalInnerWidth = window.innerWidth;

  // Her testten önce window.innerWidth'i sıfırdan ayarlanabilir yapalım
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it('640px genişlikte phone döndürmeli', () => {
    // Tarayıcı genişliğini 640 (phone sınırı 768'in altı) olarak ayarla
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 640 });

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.isPhone).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(false);
  });

  it('767px genişlikte (sınırın hemen altı) phone döndürmeli', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 767 });

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.isPhone).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(false);
  });

  it('768px genişlikte tablet döndürmeli', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 768 });

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.isPhone).toBe(false);
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });

  it('1023px genişlikte (sınırın hemen altı) tablet döndürmeli', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1023 });

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.isPhone).toBe(false);
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });

  it('1024px genişlikte desktop döndürmeli', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.isPhone).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(true);
  });

  it('1920px genişlikte (büyük ekran) desktop döndürmeli', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1920 });

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.isPhone).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(true);
  });

  it('resize (pencere yeniden boyutlandırma) olayıyla breakpoint güncellenebilmeli', () => {
    // Başlangıçta büyük ekran (desktop)
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1200 });

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.isDesktop).toBe(true);

    // Pencereyi daralt (phone boyutuna getir) ve resize olayını tetikle
    act(() => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 });
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.isPhone).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });
});
