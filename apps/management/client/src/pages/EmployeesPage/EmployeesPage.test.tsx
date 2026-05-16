import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EmployeesPage from './EmployeesPage';
import { ModalProvider } from '../../components/Modal/ModalContext';
import { ToastProvider } from '../../components/ToastBar/ToastContext';

/*
  EmployeesPage Entegrasyon Testi
  - Personellerin listelenmesi
  - Yeni personel ekleme modalının açılması
  - Silme işleminin onaylanması
*/

// framer-motion mock
vi.mock('framer-motion', () => ({
  motion: { 
    main: ({ children, ...props }: any) => <main {...props}>{children}</main>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div> 
  },
  AnimatePresence: ({ children }: any) => children,
}));

// useEmployees mock
const mockFetchEmployees = vi.fn();
const mockRemoveEmployee = vi.fn();
const mockAddEmployee = vi.fn();

const mockEmployees = [
  { 
    id: 'emp-1', 
    tcNo: '12345678901', 
    firstName: 'Ahmet', 
    lastName: 'Yılmaz', 
    isActive: true,
    unit: { name: 'IT', location: { name: 'Merkez' } }
  },
  { 
    id: 'emp-2', 
    tcNo: '98765432109', 
    firstName: 'Ayşe', 
    lastName: 'Demir', 
    isActive: false,
    unit: { name: 'HR', location: { name: 'Merkez' } }
  }
];

vi.mock('../../hooks/data/useEmployees', () => ({
  useEmployees: () => ({
    employees: mockEmployees,
    pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
    isLoading: false,
    fetchEmployees: mockFetchEmployees,
    addEmployee: mockAddEmployee,
    editEmployee: vi.fn(),
    removeEmployee: mockRemoveEmployee,
  }),
}));

// useLocationUnitFilter mock
vi.mock('../../hooks/data/useLocationUnitFilter', () => ({
  useLocationUnitFilter: () => ({
    locationOptions: [],
    unitOptions: [],
    isLoading: false
  }),
}));

// useAuth mock
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'ADMIN' } }),
}));

function renderEmployeesPage() {
  return render(
    <ToastProvider>
      <ModalProvider>
        <EmployeesPage />
      </ModalProvider>
    </ToastProvider>
  );
}

describe('EmployeesPage (Personel Yönetimi)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('personel listesini doğru şekilde render etmeli', () => {
    renderEmployeesPage();

    expect(screen.getByText('Çalışanlar')).toBeInTheDocument();
    expect(screen.getByText('Ahmet Yılmaz')).toBeInTheDocument();
    expect(screen.getByText('Ayşe Demir')).toBeInTheDocument();
    expect(screen.getByText('12345678901')).toBeInTheDocument();
  });

  it('"Yeni Çalışan Ekle" butonuna basıldığında modal açılmalı', async () => {
    renderEmployeesPage();

    const addBtn = screen.getByText('+ Yeni Çalışan Ekle');
    fireEvent.click(addBtn);

    expect(screen.getByText('Yeni Çalışan Ekle')).toBeInTheDocument();
  });

  it('bir personeli silmek istediğinde onay modali açılmalı ve onaylanınca silmeli', async () => {
    mockRemoveEmployee.mockResolvedValue({ success: true });
    const { container } = renderEmployeesPage();

    const deleteBtn = container.querySelector('.delete-btn');
    if (!deleteBtn) throw new Error('Silme butonu bulunamadı');

    fireEvent.click(deleteBtn);

    expect(screen.getByText('Çalışanı Sil')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Sil' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockRemoveEmployee).toHaveBeenCalledWith('emp-1');
    });

    expect(await screen.findByText('Çalışan başarıyla silindi')).toBeInTheDocument();
  });

  it('silme onayı reddedilirse removeEmployee çağrılmamalı', async () => {
    const { container } = renderEmployeesPage();

    const deleteBtn = container.querySelector('.delete-btn');
    if (!deleteBtn) throw new Error('Silme butonu bulunamadı');

    fireEvent.click(deleteBtn);
    expect(screen.getByText('Çalışanı Sil')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: 'Vazgeç' });
    fireEvent.click(cancelBtn);

    expect(mockRemoveEmployee).not.toHaveBeenCalled();
  });

  it('silme API hatası verince hata toast göstermeli', async () => {
    mockRemoveEmployee.mockResolvedValue({ success: false, error: 'Silme işlemi başarısız' });
    const { container } = renderEmployeesPage();

    const deleteBtn = container.querySelector('.delete-btn');
    if (!deleteBtn) throw new Error('Silme butonu bulunamadı');

    fireEvent.click(deleteBtn);
    const confirmBtn = screen.getByRole('button', { name: 'Sil' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText('Silme işlemi başarısız')).toBeInTheDocument();
    });
  });

  it('"Düzenle" butonuna basıldığında modal açılmalı', async () => {
    const { container } = renderEmployeesPage();

    const editBtn = container.querySelector('.edit-btn');
    if (!editBtn) throw new Error('Düzenleme butonu bulunamadı');

    fireEvent.click(editBtn);

    expect(screen.getByText('Çalışan Düzenle')).toBeInTheDocument();
  });

  it('arama kutusuna yazı yazıldığında fetchEmployees çağrılmalı', async () => {
    const { container } = renderEmployeesPage();

    const searchInput = container.querySelector('.filter-bar input[type="text"]');
    if (!searchInput) throw new Error('Arama kutusu bulunamadı');

    fireEvent.change(searchInput, { target: { value: 'Ahmet' } });

    await waitFor(() => {
      expect(mockFetchEmployees).toHaveBeenCalled();
    });
  });

  it('mount olduğunda fetchEmployees çağrılmalı', () => {
    renderEmployeesPage();
    expect(mockFetchEmployees).toHaveBeenCalled();
  });

  it('TC kimlik numarası tabloda görünmeli', () => {
    renderEmployeesPage();
    expect(screen.getByText('12345678901')).toBeInTheDocument();
  });
});
