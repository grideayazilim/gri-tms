import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PendingUserList from './PendingUserList';

/*
  PendingUserList Testleri
  - Pending kullanıcı listesini render etmeli
  - Onaylama butonuna basınca onApprove çağrılmalı
  - Reddetme butonuna basınca onReject çağrılmalı
  - Boş liste durumu
  - Rol bilgisi gösterimi
*/

const mockOnApprove = vi.fn();
const mockOnReject = vi.fn();

const adminPendingUser = {
  id: 'u1',
  username: 'bekleyen_admin',
  role: 'ADMIN' as const,
  unit: null,
};

const responsiblePendingUser = {
  id: 'u2',
  username: 'bekleyen_sorumlu',
  role: 'RESPONSIBLE' as const,
  unit: {
    id: 10,
    name: 'Yazılım Birimi',
    location: { id: 1, name: 'Merkez Yerleşke' },
  },
};

const responsibleNoUnit = {
  id: 'u3',
  username: 'sorumlu_birimsiz',
  role: 'RESPONSIBLE' as const,
  unit: null,
};

describe('PendingUserList bileşeni', () => {
  it('bekleyen kullanıcıları listeler', () => {
    render(
      <PendingUserList
        pendingUsers={[adminPendingUser]}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />,
    );

    expect(screen.getByText('bekleyen_admin')).toBeInTheDocument();
    expect(screen.getByText('Onay Bekleyen Kullanıcılar (1)')).toBeInTheDocument();
  });

  it('birden fazla kullanıcı render edilmeli', () => {
    render(
      <PendingUserList
        pendingUsers={[adminPendingUser, responsiblePendingUser]}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />,
    );

    expect(screen.getByText('bekleyen_admin')).toBeInTheDocument();
    expect(screen.getByText('bekleyen_sorumlu')).toBeInTheDocument();
    expect(screen.getByText('Onay Bekleyen Kullanıcılar (2)')).toBeInTheDocument();
  });

  it('admin kullanıcı için "Yönetici" rol etiketi göstermeli', () => {
    render(
      <PendingUserList
        pendingUsers={[adminPendingUser]}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />,
    );

    expect(screen.getByText('Yönetici')).toBeInTheDocument();
  });

  it('responsible kullanıcı için lokasyon/birim bilgisi göstermeli', () => {
    render(
      <PendingUserList
        pendingUsers={[responsiblePendingUser]}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />,
    );

    expect(screen.getByText(/Birim Sorumlusu/)).toBeInTheDocument();
    expect(screen.getByText(/Merkez Yerleşke/)).toBeInTheDocument();
    expect(screen.getByText(/Yazılım Birimi/)).toBeInTheDocument();
  });

  it('responsible kullanıcı birimsiz ise sadece "Birim Sorumlusu" göstermeli', () => {
    render(
      <PendingUserList
        pendingUsers={[responsibleNoUnit]}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />,
    );

    expect(screen.getByText('Birim Sorumlusu')).toBeInTheDocument();
  });

  it('Onayla butonuna basınca onApprove doğru id ile çağrılmalı', () => {
    render(
      <PendingUserList
        pendingUsers={[adminPendingUser]}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />,
    );

    fireEvent.click(screen.getByTitle('Onayla'));
    expect(mockOnApprove).toHaveBeenCalledWith('u1');
  });

  it('Reddet butonuna basınca onReject doğru id ile çağrılmalı', () => {
    render(
      <PendingUserList
        pendingUsers={[adminPendingUser]}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />,
    );

    fireEvent.click(screen.getByTitle('Reddet'));
    expect(mockOnReject).toHaveBeenCalledWith('u1');
  });

  it('boş liste durumunda "Onay bekleyen kullanıcı bulunmuyor." mesajı göstermeli', () => {
    render(
      <PendingUserList
        pendingUsers={[]}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />,
    );

    expect(screen.getByText('Onay bekleyen kullanıcı bulunmuyor.')).toBeInTheDocument();
    expect(screen.getByText('Onay Bekleyen Kullanıcılar (0)')).toBeInTheDocument();
  });

  it('her kullanıcı için Onayla ve Reddet butonları render edilmeli', () => {
    render(
      <PendingUserList
        pendingUsers={[adminPendingUser, responsiblePendingUser]}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />,
    );

    const approveBtns = screen.getAllByTitle('Onayla');
    const rejectBtns = screen.getAllByTitle('Reddet');
    expect(approveBtns).toHaveLength(2);
    expect(rejectBtns).toHaveLength(2);
  });
});
