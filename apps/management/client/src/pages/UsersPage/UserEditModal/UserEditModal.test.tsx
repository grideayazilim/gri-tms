import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserEditModal from './UserEditModal';
import { ToastProvider } from '../../../components/ToastBar/ToastContext';

/*
  UserEditModal Testleri
  - Kullanıcı bilgileriyle form pre-fill edilmeli
  - Rol değiştirme
  - Lokasyon seçilince fetchUnitsByLocation çağrılmalı
  - Submit → onSave çağrılmalı
  - Cancel → onClose çağrılmalı
  - Şifre değiştir checkbox'ı
*/

const mockFetchLocations = vi.fn();
const mockFetchUnitsByLocation = vi.fn();

vi.mock('../../../hooks/data/useLocationsAndUnits', () => ({
  useLocationsAndUnits: () => ({
    locations: [
      { id: 1, name: 'Merkez Yerleşke' },
      { id: 2, name: 'Ek Yerleşke' },
    ],
    units: [
      { id: 10, name: 'Yazılım Birimi' },
    ],
    fetchLocations: mockFetchLocations,
    fetchUnitsByLocation: mockFetchUnitsByLocation,
  }),
}));

const adminUser = {
  id: 'u1',
  username: 'admin_user',
  role: 'ADMIN' as const,
  isActive: true,
  expiryDate: null,
  unit: null,
};

const responsibleUser = {
  id: 'u2',
  username: 'sorumlu',
  role: 'RESPONSIBLE' as const,
  isActive: true,
  expiryDate: '2025-12-31',
  unit: {
    id: 10,
    name: 'Yazılım Birimi',
    location: { id: 1, name: 'Merkez Yerleşke' },
  },
};

function renderModal(user = adminUser, onClose = vi.fn(), onSave = vi.fn()) {
  return render(
    <ToastProvider>
      <UserEditModal user={user as any} onClose={onClose} onSave={onSave} />
    </ToastProvider>,
  );
}

describe('UserEditModal bileşeni', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mount olunca fetchLocations çağrılmalı', () => {
    renderModal();
    expect(mockFetchLocations).toHaveBeenCalled();
  });

  it('admin kullanıcının rol seçimi doğru yüklenmeli', () => {
    renderModal(adminUser);
    const roleSelect = screen.getByLabelText('Rol') as HTMLSelectElement;
    expect(roleSelect.value).toBe('ADMIN');
  });

  it('responsible kullanıcının lokasyon ve birim değerleri pre-fill edilmeli', () => {
    renderModal(responsibleUser);
    expect(mockFetchUnitsByLocation).toHaveBeenCalledWith(1);
  });

  it('Vazgeç butonuna basınca onClose çağrılmalı', () => {
    const onClose = vi.fn();
    renderModal(adminUser, onClose);
    fireEvent.click(screen.getByText('Vazgeç'));
    expect(onClose).toHaveBeenCalledWith(null);
  });

  it('form değişmeden Güncelle butonu disabled olmalı', () => {
    renderModal(adminUser);
    const updateBtn = screen.getByText('Güncelle');
    expect(updateBtn).toBeDisabled();
  });

  it('rol değiştirilince Güncelle butonu aktif olmalı', () => {
    renderModal(adminUser);
    const roleSelect = screen.getByLabelText('Rol');
    fireEvent.change(roleSelect, { target: { value: 'RESPONSIBLE' } });

    const updateBtn = screen.getByText('Güncelle');
    expect(updateBtn).not.toBeDisabled();
  });

  it('form submit edilince onSave çağrılmalı', async () => {
    const onSave = vi.fn();
    // responsibleUser has all required fields; changing to ADMIN is always valid
    renderModal(responsibleUser, vi.fn(), onSave);

    const roleSelect = screen.getByLabelText('Rol');
    fireEvent.change(roleSelect, { target: { value: 'ADMIN' } });

    fireEvent.click(screen.getByText('Güncelle'));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
  });

  it('onSave çağrısı doğru veri yapısı içermeli', async () => {
    const onSave = vi.fn();
    renderModal(responsibleUser, vi.fn(), onSave);

    const roleSelect = screen.getByLabelText('Rol');
    fireEvent.change(roleSelect, { target: { value: 'ADMIN' } });

    fireEvent.click(screen.getByText('Güncelle'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'ADMIN' }),
      );
    });
  });

  it('"Şifreyi değiştir" checkbox\'ı görünmeli', () => {
    renderModal(adminUser);
    expect(screen.getByText('Şifreyi değiştir')).toBeInTheDocument();
  });

  it('"Şifreyi değiştir" işaretlenince şifre alanı görünmeli', () => {
    renderModal(adminUser);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(screen.getByLabelText(/Yeni şifre/i)).toBeInTheDocument();
  });

  it('"Şifreyi değiştir" kaldırılınca şifre alanı kaybolmalı', () => {
    renderModal(adminUser);
    const checkbox = screen.getByRole('checkbox');

    fireEvent.click(checkbox);
    expect(screen.getByLabelText(/Yeni şifre/i)).toBeInTheDocument();

    fireEvent.click(checkbox);
    expect(screen.queryByLabelText(/Yeni şifre/i)).not.toBeInTheDocument();
  });

  it('şifre değiştir aktifken Güncelle butonu aktif olmalı', () => {
    renderModal(adminUser);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    const updateBtn = screen.getByText('Güncelle');
    expect(updateBtn).not.toBeDisabled();
  });

  it('lokasyon seçilince fetchUnitsByLocation çağrılmalı', async () => {
    renderModal(adminUser);
    const locationSelect = screen.getByLabelText('Yerleşke');
    fireEvent.change(locationSelect, { target: { value: '1' } });

    expect(mockFetchUnitsByLocation).toHaveBeenCalledWith('1');
  });

  it('geçerlilik tarihi input\'u render edilmeli', () => {
    renderModal(adminUser);
    expect(screen.getByLabelText('Geçerlilik Tarihi')).toBeInTheDocument();
  });
});
