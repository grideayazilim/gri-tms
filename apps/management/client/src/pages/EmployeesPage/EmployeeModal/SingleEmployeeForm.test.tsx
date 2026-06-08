import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SingleEmployeeForm from './SingleEmployeeForm';
import { useLocationsAndUnits } from '../../../hooks/data/useLocationsAndUnits';

vi.mock('../../../hooks/data/useLocationsAndUnits', () => ({
  useLocationsAndUnits: vi.fn(),
}));

const mockFetchLocations = vi.fn();
const mockFetchUnitsByLocation = vi.fn();

const defaultMockValue = {
  locations: [
    { id: 1, name: 'Merkez Yerleşke' },
  ],
  units: [
    { id: 1, name: 'Yazılım Birimi' },
  ],
  fetchLocations: mockFetchLocations,
  fetchUnitsByLocation: mockFetchUnitsByLocation,
};

describe('SingleEmployeeForm Bileşeni', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useLocationsAndUnits).mockReturnValue(defaultMockValue as any);
  });

  it('form başarıyla render edilmeli ve boş alanlarla submit edildiğinde validasyon hatası vermelidir', async () => {
    const mockOnSave = vi.fn();
    const mockOnClose = vi.fn();

    render(<SingleEmployeeForm onClose={mockOnClose} onSave={mockOnSave} />);

    expect(screen.getByLabelText('Ad')).toBeInTheDocument();
    
    const submitBtn = screen.getByText('Kaydet');

    await userEvent.click(submitBtn);

    // tcNo required uyarısını vb görelim (zod mesajı genelde "Required" veya Türkçe özel mesajı olur, burada form submit engelleniyor mu kontrol edelim)
    await waitFor(() => {
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  it('form verileri doldurulduğunda onSave çağrılmalıdır', async () => {
    const mockOnSave = vi.fn().mockResolvedValue({ success: true, data: {} });
    const mockOnClose = vi.fn();

    render(<SingleEmployeeForm onClose={mockOnClose} onSave={mockOnSave} />);

    // Zorunlu alanları doldur (tcNo, firstName, lastName, locationId, startDate, ibanNo)
    await userEvent.type(screen.getByLabelText('TC No'), '12345678901');
    await userEvent.type(screen.getByLabelText('Ad'), 'Ahmet');
    await userEvent.type(screen.getByLabelText('Soyad'), 'Yılmaz');
    await userEvent.selectOptions(screen.getByLabelText('Yerleşke'), '1');
    // UnitId dropdown'u locationId seçilince aktif olur ve unit listesi dolar
    await waitFor(() => expect(screen.getByLabelText('Birim')).not.toBeDisabled());
    await userEvent.selectOptions(screen.getByLabelText('Birim'), '1');
    
    // date
    fireEventChangeDate(screen.getByLabelText('İşe Giriş'), '2024-01-01');
    
    await userEvent.type(screen.getByLabelText('IBAN'), 'TR123456789012345678901234');
    await userEvent.type(screen.getByLabelText('Telefon No'), '05551234567');

    const submitBtn = screen.getByText('Kaydet');
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });
  });

  it('telefon alanı boş bırakılabilmeli ve form submit olabilmeli', async () => {
    const mockOnSave = vi.fn().mockResolvedValue({ success: true, data: {} });

    render(<SingleEmployeeForm onClose={vi.fn()} onSave={mockOnSave} />);

    await userEvent.type(screen.getByLabelText('TC No'), '12345678901');
    await userEvent.type(screen.getByLabelText('Ad'), 'Ahmet');
    await userEvent.type(screen.getByLabelText('Soyad'), 'Yılmaz');
    await userEvent.selectOptions(screen.getByLabelText('Yerleşke'), '1');
    await waitFor(() => expect(screen.getByLabelText('Birim')).not.toBeDisabled());
    await userEvent.selectOptions(screen.getByLabelText('Birim'), '1');
    fireEventChangeDate(screen.getByLabelText('İşe Giriş'), '2024-01-01');
    await userEvent.type(screen.getByLabelText('IBAN'), 'TR123456789012345678901234');
    // Telefon alanı boş bırakıldı

    await userEvent.click(screen.getByText('Kaydet'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1);
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({ phoneNo: null }),
      );
    });
  });
});

// Helper for date inputs
import { fireEvent } from '@testing-library/react';
function fireEventChangeDate(element: HTMLElement, value: string) {
  fireEvent.change(element, { target: { value } });
}
