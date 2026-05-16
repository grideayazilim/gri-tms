import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PopUpColumn from './PopUpColumn';
import { ModalProvider } from '../../../components/Modal/ModalContext';
import { useModal } from '../../../components/Modal';

vi.mock('../../../components/Modal', () => ({
  useModal: vi.fn(),
}));

function makeModal() {
  const mockShowModal = vi.fn();
  vi.mocked(useModal).mockReturnValue({
    showModal: mockShowModal,
    closeModal: vi.fn(),
    showConfirm: vi.fn(),
  } as any);
  return mockShowModal;
}

describe('PopUpColumn Bileşeni', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tetikleyici metni doğru render etmeli', () => {
    makeModal();
    render(<PopUpColumn trigger="Detay Görüntüle" />);
    expect(screen.getByText('Detay Görüntüle')).toBeInTheDocument();
  });

  it('varsayılan trigger "Görüntüle" olmalı', () => {
    makeModal();
    render(<PopUpColumn />);
    expect(screen.getByText('Görüntüle')).toBeInTheDocument();
  });

  it('tıklandığında showModal çağrılmalı', async () => {
    const mockShowModal = makeModal();
    render(<PopUpColumn trigger="Detay" changes={['A -> B']} metadata={{ role: 'ADMIN' }} entityLabel="Kullanıcı" />);

    await userEvent.click(screen.getByText('Detay'));

    expect(mockShowModal).toHaveBeenCalledTimes(1);
  });

  it('entityLabel verilince modal başlığı "Detaylar (Kullanıcı)" olmalı', async () => {
    const mockShowModal = makeModal();
    render(<PopUpColumn trigger="Detay" entityLabel="Kullanıcı" />);

    await userEvent.click(screen.getByText('Detay'));

    const args = mockShowModal.mock.calls[0]?.[0];
    expect(args!.title).toBe('Detaylar (Kullanıcı)');
  });

  it('entityLabel verilmeyince modal başlığı "Detaylar" olmalı', async () => {
    const mockShowModal = makeModal();
    render(<PopUpColumn trigger="Detay" />);

    await userEvent.click(screen.getByText('Detay'));

    const args = mockShowModal.mock.calls[0]?.[0];
    expect(args!.title).toBe('Detaylar');
  });

  it('modal content bir fonksiyon olmalı', async () => {
    const mockShowModal = makeModal();
    render(<PopUpColumn trigger="Detay" />);

    await userEvent.click(screen.getByText('Detay'));

    const args = mockShowModal.mock.calls[0]?.[0];
    expect(typeof args!.content).toBe('function');
  });

  it('modal content değişiklikler ve metadata içermeli', async () => {
    const mockShowModal = vi.fn();
    vi.mocked(useModal).mockReturnValue({
      showModal: mockShowModal,
      closeModal: vi.fn(),
      showConfirm: vi.fn(),
    } as any);

    render(
      <PopUpColumn
        trigger="Detay"
        changes={['Alan A: Eski → Yeni']}
        metadata={{ role: 'ADMIN', periodId: '5' }}
      />,
    );

    await userEvent.click(screen.getByText('Detay'));

    const args = mockShowModal.mock.calls[0]?.[0];
    const onClose = vi.fn();
    const content = args!.content(onClose);

    const { container } = render(content as React.ReactElement);
    expect(container.textContent).toContain('Alan A: Eski → Yeni');
    expect(container.textContent).toContain('Rol');
  });

  it('değişiklik ve metadata yoksa "Ek detay bulunmuyor." göstermeli', async () => {
    const mockShowModal = vi.fn();
    vi.mocked(useModal).mockReturnValue({
      showModal: mockShowModal,
      closeModal: vi.fn(),
      showConfirm: vi.fn(),
    } as any);

    render(<PopUpColumn trigger="Detay" changes={[]} metadata={{}} />);
    await userEvent.click(screen.getByText('Detay'));

    const args = mockShowModal.mock.calls[0]?.[0];
    const onClose = vi.fn();
    const content = args!.content(onClose);

    const { container } = render(content as React.ReactElement);
    expect(container.textContent).toContain('Ek detay bulunmuyor.');
  });

  it('modal içindeki "Kapat" butonuna basınca onClose çağrılmalı', async () => {
    const mockShowModal = vi.fn();
    vi.mocked(useModal).mockReturnValue({
      showModal: mockShowModal,
      closeModal: vi.fn(),
      showConfirm: vi.fn(),
    } as any);

    render(<PopUpColumn trigger="Detay" />);
    await userEvent.click(screen.getByText('Detay'));

    const args = mockShowModal.mock.calls[0]?.[0];
    const onClose = vi.fn();
    const content = args!.content(onClose);

    const { getByText } = render(content as React.ReactElement);
    await userEvent.click(getByText('Kapat'));
    expect(onClose).toHaveBeenCalledWith(null);
  });

  it('metadata boolean değerler "Evet"/"Hayır" olarak gösterilmeli', async () => {
    const mockShowModal = vi.fn();
    vi.mocked(useModal).mockReturnValue({
      showModal: mockShowModal,
      closeModal: vi.fn(),
      showConfirm: vi.fn(),
    } as any);

    render(<PopUpColumn trigger="Detay" metadata={{ wageUpdated: true }} />);
    await userEvent.click(screen.getByText('Detay'));

    const args = mockShowModal.mock.calls[0]?.[0];
    const content = args!.content(vi.fn());
    const { container } = render(content as React.ReactElement);
    expect(container.textContent).toContain('Evet');
  });

  it('metadata dizi değerler virgülle ayrılmış gösterilmeli', async () => {
    const mockShowModal = vi.fn();
    vi.mocked(useModal).mockReturnValue({
      showModal: mockShowModal,
      closeModal: vi.fn(),
      showConfirm: vi.fn(),
    } as any);

    render(<PopUpColumn trigger="Detay" metadata={{ usernames: ['ali', 'veli'] }} />);
    await userEvent.click(screen.getByText('Detay'));

    const args = mockShowModal.mock.calls[0]?.[0];
    const content = args!.content(vi.fn());
    const { container } = render(content as React.ReactElement);
    expect(container.textContent).toContain('ali, veli');
  });
});
