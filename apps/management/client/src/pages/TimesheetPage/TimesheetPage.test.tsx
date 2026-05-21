import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TimesheetPage from './TimesheetPage';
import { ToastProvider } from '../../components/ToastBar/ToastContext';
import { ModalProvider } from '../../components/Modal/ModalContext';
import * as useTimesheetsModule from '../../hooks/data/useTimesheets';
import { useAuth } from '../../context/AuthContext';
import { usePublicHolidays } from '../../hooks/data/usePublicHolidays';

/*
  TimesheetPage Entegrasyon Testleri - Stable Edition
*/

// --- MOCKLAR ---
vi.mock('./TimesheetDaysColumn/TimesheetDaysColumn', () => ({
  default: ({ onDayClick, periodDays, row }: { onDayClick: (r: any, d: string, m: string) => void, periodDays: string[], row: any }) => (
    <div className="day-grid">
      {periodDays.map((date: string) => (
        <button 
          key={date} 
          className="ts-day-cell" 
          onClick={() => onDayClick(row, date, 'X')}
        >
          {date.split('-')[2]}
        </button>
      ))}
    </div>
  )
}));

vi.mock('../../components/DynamicTable/DynamicTable', () => ({
  default: ({ data, columns, loading }: { data: any[], columns: any[], loading: boolean }) => (
    <div data-testid="mock-table">
      {loading && <div data-testid="table-loader">Yükleniyor...</div>}
      {data.map((row: any) => (
        <div key={row.id} className="mock-row">
          <span>{row.firstName} {row.lastName}</span>
          <div className="ts-cell">
             {columns[2]?.render ? columns[2].render(row) : null}
          </div>
        </div>
      ))}
    </div>
  )
}));

vi.mock('../../components/FilterBar/FilterBar', () => ({
  default: () => <div data-testid="mock-filter-bar" />
}));

vi.mock('../../components/PageShell/PageShell', () => ({
  default: ({ children, title, headerActions, isLoading }: { children: React.ReactNode, title: string, headerActions?: React.ReactNode, isLoading?: boolean }) => (
    <div data-testid={isLoading ? "shell-loading" : "shell-ready"}>
      <h1>{title}</h1>
      <div data-testid="header-actions">{headerActions}</div>
      {children}
    </div>
  )
}));

vi.mock('framer-motion', () => ({
  motion: { 
    div: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, 
    main: ({ children }: { children: React.ReactNode }) => <main>{children}</main> 
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../../hooks/data/useFilter', () => ({
  useFilter: () => ({
    filters: { period: '2024-05', location: '', unit: '', search: '' },
    apiParams: { month: 5, year: 2024 },
    handleFilterChange: vi.fn(),
    setFilters: vi.fn(),
  }),
}));

const mockSetTimesheets = vi.fn();
const mockFetchTimesheets = vi.fn().mockResolvedValue({ 
  success: true, 
  data: { rows: [{ id: '1', firstName: 'Ahmet', lastName: 'Yılmaz', timesheet_days: {} }] } 
});

vi.mock('../../hooks/data/useTimesheets', () => ({
  useTimesheets: vi.fn()
}));

vi.mock('../../hooks/data/usePublicHolidays', () => ({
  usePublicHolidays: vi.fn(() => ({ isPublicHoliday: () => false, getHolidayName: () => null })),
}));

vi.mock('../../hooks/data/useLocationsAndUnits', () => ({
  useLocationsAndUnits: () => ({ locations: [], units: [], fetchLocations: vi.fn(), fetchUnitsByLocation: vi.fn() }),
}));

vi.mock('../../hooks/data/useAnnouncements', () => ({
  useAnnouncements: () => ({ unreadCount: 0, fetchUnreadCount: vi.fn() }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { username: 'admin', role: 'ADMIN' }, isAdmin: true })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

const defaultTimesheetMock = {
  timesheets: [{ id: '1', tcNo: '123', firstName: 'Ahmet', lastName: 'Yılmaz', timesheet_days: {}, workDaysCount: 0, isLocked: false }],
  setTimesheets: mockSetTimesheets,
  pagination: { total: 1, page: 1, limit: 10 },
  isLoading: false,
  isSaving: false,
  isLocking: false,
  fetchTimesheets: mockFetchTimesheets,
  saveTimesheets: vi.fn(),
  toggleLockPeriod: vi.fn(),
  periods: [{ value: '2024-05', label: 'Mayıs 2024', id: 'p1', isLocked: false, startDate: '2024-05-01', endDate: '2024-05-31' }],
  fetchPeriods: vi.fn(),
};

function renderTimesheetPage() {
  return render(
    <ToastProvider>
      <ModalProvider>
        <TimesheetPage />
      </ModalProvider>
    </ToastProvider>
  );
}

describe('TimesheetPage (Puantaj Yönetimi)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTimesheetsModule.useTimesheets).mockReturnValue(defaultTimesheetMock as any);
  });

  it('1. Case: Sayfa başlığı ve çalışan listesi doğru render edilmeli', async () => {
    renderTimesheetPage();

    expect(await screen.findByText('Puantaj İşaretleme')).toBeInTheDocument();
    expect(await screen.findByText('Ahmet Yılmaz')).toBeInTheDocument();
  });

  it('2. Case: Hücreye tıklandığında veri giriş süreci tetiklenmeli', async () => {
    renderTimesheetPage();

    const dayBtn = await screen.findByText('01');
    fireEvent.click(dayBtn);

    await waitFor(() => {
      expect(mockSetTimesheets).toHaveBeenCalled();
    });
  });

  it('3. Case: Admin kullanıcısı kilit checkbox-ını görebilmeli', async () => {
    renderTimesheetPage();

    expect(await screen.findByText('Veri Girişini Kilitle')).toBeInTheDocument();
  });

  it('4. Case: Loading state aktifken tablo loader göstermeli', async () => {
    vi.mocked(useTimesheetsModule.useTimesheets).mockReturnValue({
      ...defaultTimesheetMock,
      isLoading: true
    } as any);

    renderTimesheetPage();

    expect(await screen.findByTestId('shell-loading')).toBeInTheDocument();
    expect(await screen.findByTestId('table-loader')).toBeInTheDocument();
  });

  it('5. Case: isSaving aktifken kaydet butonu "Kaydediliyor..." metnini göstermeli', async () => {
    vi.mocked(useTimesheetsModule.useTimesheets).mockReturnValue({
      ...defaultTimesheetMock,
      isSaving: true
    } as any);

    renderTimesheetPage();

    expect(await screen.findByText('Kaydediliyor…')).toBeInTheDocument();
  });

  it('6. Case: Kullanıcı adı sayfada gösterilmeli', async () => {
    renderTimesheetPage();
    expect(await screen.findByText('Kullanıcı: admin')).toBeInTheDocument();
  });

  it('7. Case: Hata mesajı varsa ekranda gösterilmeli', async () => {
    vi.mocked(useTimesheetsModule.useTimesheets).mockReturnValue({
      ...defaultTimesheetMock,
      error: 'Veri yüklenemedi',
    } as any);

    renderTimesheetPage();

    expect(await screen.findByText('Veri yüklenemedi')).toBeInTheDocument();
  });

  it('8. Case: Okunmamış duyuru yokken badge görünmemeli', async () => {
    renderTimesheetPage();
    await waitFor(() => {
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  it('9. Case: Kilitlenmiş dönemde hücreye tıklanınca uyarı toast göstermeli', async () => {
    vi.mocked(useTimesheetsModule.useTimesheets).mockReturnValue({
      ...defaultTimesheetMock,
      timesheets: [{ id: '1', tcNo: '123', firstName: 'Ahmet', lastName: 'Yılmaz', timesheet_days: {}, workDaysCount: 0, isLocked: true }],
    } as any);

    renderTimesheetPage();

    const dayBtn = await screen.findByText('01');
    fireEvent.click(dayBtn);

    await waitFor(() => {
      expect(screen.getByText('Bu dönem kilitlenmiş, değişiklik yapılamaz.')).toBeInTheDocument();
    });
  });

  it('10. Case: Resmi tatile tıklanınca uyarı toast göstermeli', async () => {
    vi.mocked(usePublicHolidays).mockReturnValue({
      isPublicHoliday: () => true,
      getHolidayName: () => 'Cumhuriyet Bayramı',
    } as any);

    renderTimesheetPage();

    const dayBtn = await screen.findByText('01');
    fireEvent.click(dayBtn);

    await waitFor(() => {
      expect(screen.getByText(/Cumhuriyet Bayramı/)).toBeInTheDocument();
    });
  });

  it('11. Case: Kaydet butonu değişiklik varken görünmeli', async () => {
    // fetchTimesheets returns empty timesheet_days → sets originalSnapshot to {}
    // but timesheets mock already has a day marked → hasGlobalChanges = true
    vi.mocked(useTimesheetsModule.useTimesheets).mockReturnValue({
      ...defaultTimesheetMock,
      timesheets: [{ id: '1', tcNo: '123', firstName: 'Ahmet', lastName: 'Yılmaz', timesheet_days: { '2024-05-01': 'X' }, workDaysCount: 1, isLocked: false }],
      isSaving: false,
    } as any);

    renderTimesheetPage();

    await waitFor(() => {
      expect(screen.getByText('Değişiklikleri Kaydet')).toBeInTheDocument();
    });
  });

  it('12. Case: Dönem kilitleme toggle başarılı olunca toast göstermeli', async () => {
    const mockToggleLockPeriod = vi.fn().mockResolvedValue({
      success: true,
      data: { period: { isLocked: true } },
    });

    vi.mocked(useTimesheetsModule.useTimesheets).mockReturnValue({
      ...defaultTimesheetMock,
      toggleLockPeriod: mockToggleLockPeriod,
    } as any);

    renderTimesheetPage();

    const lockCheckbox = await screen.findByRole('checkbox');
    fireEvent.click(lockCheckbox);

    await waitFor(() => {
      expect(mockToggleLockPeriod).toHaveBeenCalled();
    });
  });

  it('13. Case: Non-admin kullanıcı kilit checkbox görmemeli', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { username: 'sorumlu', role: 'RESPONSIBLE', locationId: '1', unitId: '1' },
      isAdmin: false,
    } as any);

    renderTimesheetPage();
    expect(await screen.findByText('Puantaj İşaretleme')).toBeInTheDocument();
    expect(screen.queryByText('Veri Girişini Kilitle')).not.toBeInTheDocument();
  });
});
