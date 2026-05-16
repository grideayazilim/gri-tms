// React bileşenlerini test etmek için gerekli kütüphaneler
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ToastContainer from './ToastContainer';
import { ToastProvider } from './ToastContext';
import { useToast } from './useToast';

/*
  Toast sistemi iki katmanlıdır:
  - ToastContainer: gelen toast dizisini ekrana basar (saf render bileşeni)
  - ToastProvider + useToast: toast() fonksiyonu ile bildirim tetikler ve otomatik kapatır

  Bu dosyada her iki katmanı da test ediyoruz.
*/

// ─── ToastContainer Testleri ──────────────────────────────────────────────────
describe('ToastContainer bileşeni', () => {
  it('başarı (success) toastını doğru mesaj ve CSS sınıfıyla render etmeli', () => {
    render(
      <ToastContainer toasts={[{ id: 't-1', type: 'success', message: 'İşlem başarılı!' }]} />
    );

    expect(screen.getByText('İşlem başarılı!')).toBeInTheDocument();
    // CSS sınıfı doğru mu?
    const toastEl = screen.getByText('İşlem başarılı!').closest('.toast');
    expect(toastEl).toHaveClass('toast--success');
  });

  it('hata (error) toastını doğru sınıfla render etmeli', () => {
    render(
      <ToastContainer toasts={[{ id: 't-2', type: 'error', message: 'Bir hata oluştu!' }]} />
    );

    const toastEl = screen.getByText('Bir hata oluştu!').closest('.toast');
    expect(toastEl).toHaveClass('toast--error');
  });

  it('uyarı (warning) ve bilgi (info) toastlarını render etmeli', () => {
    render(
      <ToastContainer toasts={[
        { id: 't-3', type: 'warning', message: 'Dikkat!' },
        { id: 't-4', type: 'info', message: 'Bilgi notu.' },
      ]} />
    );

    expect(screen.getByText('Dikkat!')).toBeInTheDocument();
    expect(screen.getByText('Bilgi notu.')).toBeInTheDocument();
  });

  it('removing: true olan toast özel CSS sınıfı almalı (fade-out animasyonu)', () => {
    render(
      <ToastContainer toasts={[{ id: 't-5', type: 'info', message: 'Kapatılıyor...', removing: true }]} />
    );

    const toastEl = screen.getByText('Kapatılıyor...').closest('.toast');
    expect(toastEl).toHaveClass('toast--removing');
  });

  it('toast listesi boş geldiğinde hiçbir şey render edilmemeli', () => {
    const { container } = render(<ToastContainer toasts={[]} />);

    // Sadece boş container div olmalı, içinde toast elementi olmamalı
    const toasts = container.querySelectorAll('.toast');
    expect(toasts).toHaveLength(0);
  });

  it('birden fazla toast aynı anda gösterilebilmeli', () => {
    render(
      <ToastContainer toasts={[
        { id: 't-6', type: 'success', message: 'Birinci bildirim' },
        { id: 't-7', type: 'error', message: 'İkinci bildirim' },
        { id: 't-8', type: 'info', message: 'Üçüncü bildirim' },
      ]} />
    );

    expect(screen.getAllByText(/bildirim/i)).toHaveLength(3);
  });
});

// ─── ToastProvider + useToast Testleri ────────────────────────────────────────
/*
  ToastProvider üzerine kurulu entegrasyon testi.
  Gerçek zamanlayıcı yerine vi.useFakeTimers() kullanıyoruz, böylece
  3000ms beklemek zorunda kalmadan otomatik kapanmayı test edebiliyoruz.
*/
describe('ToastProvider ve useToast hook', () => {
  it('toast() çağrılınca mesaj ekranda görünmeli', () => {
    function TestComponent() {
      const toast = useToast();
      return (
        <button onClick={() => toast({ type: 'success', message: 'Merhaba Toast!' })}>
          Toast Göster
        </button>
      );
    }

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    act(() => {
      screen.getByRole('button', { name: 'Toast Göster' }).click();
    });

    expect(screen.getByText('Merhaba Toast!')).toBeInTheDocument();
  });

  it('varsayılan type "info" olmalı', () => {
    function TestComponent() {
      const toast = useToast();
      return (
        <button onClick={() => toast({ message: 'Info Toast' })}>
          Toast Göster
        </button>
      );
    }

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    act(() => { screen.getByRole('button').click(); });

    const toastEl = screen.getByText('Info Toast').closest('.toast');
    expect(toastEl).toHaveClass('toast--info');
  });

  it('birden fazla toast aynı anda gösterilebilmeli', () => {
    function TestComponent() {
      const toast = useToast();
      return (
        <>
          <button data-testid="btn1" onClick={() => toast({ type: 'success', message: 'Birinci Bildirim' })}>
            Göster 1
          </button>
          <button data-testid="btn2" onClick={() => toast({ type: 'error', message: 'İkinci Bildirim' })}>
            Göster 2
          </button>
        </>
      );
    }

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    act(() => {
      screen.getByTestId('btn1').click();
      screen.getByTestId('btn2').click();
    });

    expect(screen.getByText('Birinci Bildirim')).toBeInTheDocument();
    expect(screen.getByText('İkinci Bildirim')).toBeInTheDocument();
  });

  it('duration sonrası toast otomatik kaybolmalı', () => {
    vi.useFakeTimers();

    function TestComponent() {
      const toast = useToast();
      return (
        <button onClick={() => toast({ type: 'info', message: 'Geçici Toast', duration: 1000 })}>
          Toast Göster
        </button>
      );
    }

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    act(() => { screen.getByRole('button').click(); });
    expect(screen.getByText('Geçici Toast')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(1000); });
    act(() => { vi.advanceTimersByTime(250); }); // fade-out animation

    expect(screen.queryByText('Geçici Toast')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('useToast ToastProvider dışında kullanılırsa hata fırlatmalı', () => {
    function TestComponent() {
      useToast();
      return null;
    }

    expect(() => render(<TestComponent />)).toThrow();
  });
});
