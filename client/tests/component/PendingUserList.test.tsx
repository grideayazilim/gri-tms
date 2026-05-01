/**
 * PendingUserList component tests (Phase 4 — Team B)
 * Coverage:
 *  1. Liste doluyken kullanıcı adları render edilir
 *  2. Liste boşken empty state gösterilir
 *  3. Onayla butonu → onApprove(userId) çağrılır
 *  4. Reddet butonu → onReject(userId) çağrılır
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PendingUserList from '@/pages/SettingsPage/PendingUserList/PendingUserList';

const pendingUsers = [
  {
    id: 'u1',
    username: 'yeni_kullanici',
    role: 'RESPONSIBLE' as const,
    unit: { id: 'unit1', name: 'A Birimi', location: { id: 'loc1', name: 'Merkez' } },
  },
];

describe('PendingUserList', () => {
  it('boş listede empty state gösterilir', () => {
    render(
      <PendingUserList pendingUsers={[]} onApprove={vi.fn()} onReject={vi.fn()} />,
    );
    expect(screen.getByText(/onay bekleyen kullanıcı bulunmuyor/i)).toBeInTheDocument();
  });

  it('dolu listede kullanıcı adı görünür', () => {
    render(
      <PendingUserList
        pendingUsers={pendingUsers}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    expect(screen.getByText('yeni_kullanici')).toBeInTheDocument();
  });

  it('"Onayla" butonuna tıklayınca onApprove(userId) çağrılır', async () => {
    const onApprove = vi.fn();
    const user = userEvent.setup();
    render(
      <PendingUserList
        pendingUsers={pendingUsers}
        onApprove={onApprove}
        onReject={vi.fn()}
      />,
    );
    await user.click(screen.getByTitle('Onayla'));
    expect(onApprove).toHaveBeenCalledWith('u1');
  });

  it('"Reddet" butonuna tıklayınca onReject(userId) çağrılır', async () => {
    const onReject = vi.fn();
    const user = userEvent.setup();
    render(
      <PendingUserList
        pendingUsers={pendingUsers}
        onApprove={vi.fn()}
        onReject={onReject}
      />,
    );
    await user.click(screen.getByTitle('Reddet'));
    expect(onReject).toHaveBeenCalledWith('u1');
  });
});
