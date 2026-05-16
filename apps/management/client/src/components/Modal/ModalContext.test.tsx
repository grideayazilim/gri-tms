import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ModalProvider } from './ModalContext';
import { useModal, useConfirm } from './useModal';

// ─── Yardımcı ─────────────────────────────────────────────────────────────────

function renderWithProvider(ui: React.ReactElement) {
  return render(<ModalProvider>{ui}</ModalProvider>);
}

// ─── useModal dışarıda kullanılırsa hata fırlatmalı ───────────────────────────

describe('useModal hook', () => {
  it('ModalProvider dışında kullanılırsa hata fırlatmalı', () => {
    function Bad() {
      useModal();
      return null;
    }
    expect(() => render(<Bad />)).toThrow('useModal must be used within ModalProvider');
  });
});

// ─── useConfirm hook ──────────────────────────────────────────────────────────

describe('useConfirm hook', () => {
  it('showConfirm fonksiyonunu döndürmeli', () => {
    let confirmFn: unknown;
    function TestComp() {
      confirmFn = useConfirm();
      return null;
    }
    renderWithProvider(<TestComp />);
    expect(typeof confirmFn).toBe('function');
  });
});

// ─── ModalProvider – showModal ────────────────────────────────────────────────

describe('ModalProvider – showModal', () => {
  it('showModal çağrılınca modal title render edilmeli', async () => {
    function TestComp() {
      const { showModal } = useModal();
      return (
        <button onClick={() => void showModal({ title: 'Modal Başlığı', content: <p>İçerik</p> })}>
          Aç
        </button>
      );
    }

    renderWithProvider(<TestComp />);
    await userEvent.click(screen.getByRole('button', { name: 'Aç' }));

    expect(screen.getByText('Modal Başlığı')).toBeInTheDocument();
    expect(screen.getByText('İçerik')).toBeInTheDocument();
  });

  it('content fonksiyon olarak verilebilmeli', async () => {
    function TestComp() {
      const { showModal } = useModal();
      return (
        <button
          onClick={() =>
            void showModal({
              title: 'Fn Modal',
              content: (close) => (
                <button onClick={() => close('tamam')}>Tamam</button>
              ),
            })
          }
        >
          Aç
        </button>
      );
    }

    renderWithProvider(<TestComp />);
    await userEvent.click(screen.getByRole('button', { name: 'Aç' }));

    expect(screen.getByRole('button', { name: 'Tamam' })).toBeInTheDocument();
  });

  it('showModal promise close sonucu ile resolve etmeli', async () => {
    let resolvedValue: unknown = 'UNSET';

    function TestComp() {
      const { showModal } = useModal();
      return (
        <button
          onClick={async () => {
            resolvedValue = await showModal<string>({
              title: 'Promise Test',
              content: (close) => (
                <button onClick={() => close('merhaba')}>Tamam</button>
              ),
            });
          }}
        >
          Aç
        </button>
      );
    }

    renderWithProvider(<TestComp />);
    await userEvent.click(screen.getByRole('button', { name: 'Aç' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tamam' }));

    await waitFor(() => expect(resolvedValue).toBe('merhaba'));
  });

  it('X butonu tıklanınca modal kapanmalı', async () => {
    function TestComp() {
      const { showModal } = useModal();
      return (
        <button onClick={() => void showModal({ title: 'Kapatılacak', content: <p>Hop</p> })}>
          Aç
        </button>
      );
    }

    renderWithProvider(<TestComp />);
    await userEvent.click(screen.getByRole('button', { name: 'Aç' }));
    expect(screen.getByText('Kapatılacak')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Kapat' }));
    expect(screen.queryByText('Kapatılacak')).not.toBeInTheDocument();
  });

  it('birden fazla modal üst üste açılabilmeli', async () => {
    function TestComp() {
      const { showModal } = useModal();
      return (
        <>
          <button onClick={() => void showModal({ title: 'Birinci', content: <p>A</p> })}>
            Birinci Aç
          </button>
          <button onClick={() => void showModal({ title: 'İkinci', content: <p>B</p> })}>
            İkinci Aç
          </button>
        </>
      );
    }

    renderWithProvider(<TestComp />);
    await userEvent.click(screen.getByRole('button', { name: 'Birinci Aç' }));
    await userEvent.click(screen.getByRole('button', { name: 'İkinci Aç' }));

    expect(screen.getByText('Birinci')).toBeInTheDocument();
    expect(screen.getByText('İkinci')).toBeInTheDocument();
  });
});

// ─── ModalProvider – closeModal ───────────────────────────────────────────────

describe('ModalProvider – closeModal', () => {
  it('closeModal çağrılınca modal DOM dan kalkmalı', async () => {
    function TestComp() {
      const { showModal, closeModal } = useModal();

      const handleOpen = async () => {
        const modal = await showModal<string>({
          title: 'Silinecek',
          content: (close) => (
            <button
              data-testid="close-inner"
              onClick={() => close('bye')}
            >
              İç Kapat
            </button>
          ),
        });
        return modal;
      };

      return (
        <button onClick={() => void handleOpen()}>Aç</button>
      );
    }

    renderWithProvider(<TestComp />);
    await userEvent.click(screen.getByRole('button', { name: 'Aç' }));
    expect(screen.getByText('Silinecek')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('close-inner'));
    expect(screen.queryByText('Silinecek')).not.toBeInTheDocument();
  });
});

// ─── ModalProvider – showConfirm ──────────────────────────────────────────────

describe('ModalProvider – showConfirm', () => {
  it('showConfirm varsayılan başlık "Emin misiniz?" göstermeli', async () => {
    function TestComp() {
      const { showConfirm } = useModal();
      return (
        <button onClick={() => void showConfirm({ message: 'Silmek istiyor musunuz?' })}>
          Sil
        </button>
      );
    }

    renderWithProvider(<TestComp />);
    await userEvent.click(screen.getByRole('button', { name: 'Sil' }));

    expect(screen.getByText('Emin misiniz?')).toBeInTheDocument();
    expect(screen.getByText('Silmek istiyor musunuz?')).toBeInTheDocument();
  });

  it('showConfirm özel başlık kullanabilmeli', async () => {
    function TestComp() {
      const { showConfirm } = useModal();
      return (
        <button onClick={() => void showConfirm({ title: 'Dikkat!', message: 'Mesaj' })}>
          Aç
        </button>
      );
    }

    renderWithProvider(<TestComp />);
    await userEvent.click(screen.getByRole('button', { name: 'Aç' }));
    expect(screen.getByText('Dikkat!')).toBeInTheDocument();
  });

  it('Vazgeç butonuna tıklanınca showConfirm false resolve etmeli', async () => {
    let result: boolean | null = null;

    function TestComp() {
      const { showConfirm } = useModal();
      return (
        <button
          onClick={async () => {
            result = await showConfirm({ message: 'Emin misin?' });
          }}
        >
          Aç
        </button>
      );
    }

    renderWithProvider(<TestComp />);
    await userEvent.click(screen.getByRole('button', { name: 'Aç' }));
    await userEvent.click(screen.getByRole('button', { name: 'Vazgeç' }));

    await waitFor(() => expect(result).toBe(false));
  });

  it('Onayla butonuna tıklanınca showConfirm true resolve etmeli', async () => {
    let result: boolean | null = null;

    function TestComp() {
      const { showConfirm } = useModal();
      return (
        <button
          onClick={async () => {
            result = await showConfirm({ message: 'Silmek istiyorum' });
          }}
        >
          Aç
        </button>
      );
    }

    renderWithProvider(<TestComp />);
    await userEvent.click(screen.getByRole('button', { name: 'Aç' }));
    await userEvent.click(screen.getByRole('button', { name: 'Onayla' }));

    await waitFor(() => expect(result).toBe(true));
  });

  it('özel confirmText ve cancelText kullanılabilmeli', async () => {
    function TestComp() {
      const { showConfirm } = useModal();
      return (
        <button
          onClick={() =>
            void showConfirm({ message: 'Devam?', confirmText: 'Evet', cancelText: 'Hayır' })
          }
        >
          Aç
        </button>
      );
    }

    renderWithProvider(<TestComp />);
    await userEvent.click(screen.getByRole('button', { name: 'Aç' }));

    expect(screen.getByRole('button', { name: 'Evet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hayır' })).toBeInTheDocument();
  });
});

// ─── ConfirmContent – onConfirm ───────────────────────────────────────────────

describe('ConfirmContent – onConfirm async', () => {
  it('onConfirm başarılı olursa onClose(true) çağrılmalı', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    let result: boolean | null = null;

    function TestComp() {
      const { showConfirm } = useModal();
      return (
        <button
          onClick={async () => {
            result = await showConfirm({ message: 'Devam?', onConfirm });
          }}
        >
          Aç
        </button>
      );
    }

    renderWithProvider(<TestComp />);
    await userEvent.click(screen.getByRole('button', { name: 'Aç' }));
    await userEvent.click(screen.getByRole('button', { name: 'Onayla' }));

    await waitFor(() => expect(result).toBe(true));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('onConfirm hata fırlatırsa onClose(false) çağrılmalı', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('API hatası'));
    let result: boolean | null = null;

    function TestComp() {
      const { showConfirm } = useModal();
      return (
        <button
          onClick={async () => {
            result = await showConfirm({ message: 'Hatalı işlem', onConfirm });
          }}
        >
          Aç
        </button>
      );
    }

    renderWithProvider(<TestComp />);
    await userEvent.click(screen.getByRole('button', { name: 'Aç' }));
    await userEvent.click(screen.getByRole('button', { name: 'Onayla' }));

    await waitFor(() => expect(result).toBe(false));
  });

  it('onConfirm çalışırken loading spinner göstermeli', async () => {
    let resolveConfirm!: () => void;
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveConfirm = resolve;
        }),
    );

    function TestComp() {
      const { showConfirm } = useModal();
      return (
        <button onClick={() => void showConfirm({ message: 'Bekle...', onConfirm })}>
          Aç
        </button>
      );
    }

    renderWithProvider(<TestComp />);
    await userEvent.click(screen.getByRole('button', { name: 'Aç' }));
    await userEvent.click(screen.getByRole('button', { name: 'Onayla' }));

    // Henüz resolve edilmemiş — loading state aktif olmalı
    expect(screen.getByText('Yükleniyor...')).toBeInTheDocument();

    act(() => resolveConfirm());
    await waitFor(() => expect(screen.queryByText('Yükleniyor...')).not.toBeInTheDocument());
  });

  it('loading sırasında Vazgeç butonu disabled olmalı', async () => {
    let resolveConfirm!: () => void;
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveConfirm = resolve;
        }),
    );

    function TestComp() {
      const { showConfirm } = useModal();
      return (
        <button onClick={() => void showConfirm({ message: 'Bekle...', onConfirm })}>
          Aç
        </button>
      );
    }

    renderWithProvider(<TestComp />);
    await userEvent.click(screen.getByRole('button', { name: 'Aç' }));
    await userEvent.click(screen.getByRole('button', { name: 'Onayla' }));

    expect(screen.getByRole('button', { name: 'Vazgeç' })).toBeDisabled();

    act(() => resolveConfirm());
  });

  it('danger type için btn--danger sınıfı olmalı', async () => {
    function TestComp() {
      const { showConfirm } = useModal();
      return (
        <button onClick={() => void showConfirm({ message: 'Tehlikeli!', type: 'danger' })}>
          Aç
        </button>
      );
    }

    renderWithProvider(<TestComp />);
    await userEvent.click(screen.getByRole('button', { name: 'Aç' }));

    expect(screen.getByRole('button', { name: 'Onayla' })).toHaveClass('btn--danger');
  });
});
