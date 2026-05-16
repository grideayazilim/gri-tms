import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TimesheetPage from './TimesheetPage';
import { ToastProvider } from '../../components/ToastBar/ToastContext';
import { ModalProvider } from '../../components/Modal/ModalContext';
import * as useTimesheetsModule from '../../hooks/data/useTimesheets';

/*
  TimesheetPage Entegrasyon Testleri - Stable Edition
*/

// --- MOCKLAR ---
vi.mock('./TimesheetDaysColumn/TimesheetDaysColumn', () => ({
  default: ({ onDayClick, periodDays }: any) => (
    <div className="day-grid">
      {periodDays.map((date: string) => (
        <button 
          key={date} 
          className="ts-day-cell" 
          onClick={() => onDayClick(date, 'X')}
        >
          {date.split('-')[2]}
        </button>
      ))}
    </div>
  )
}));

vi.mock('../../components/DynamicTable/DynamicTable', () => ({
  default: ({ data, columns }: any) => (
    <div data-testid="mock-table">
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
  default: ({ children, title, headerActions }: any) => (
    <div>
      <h1>{title}</h1>
      <div data-testid="header-actions">{headerActions}</div>
      {children}
    </div>
  )
}));

vi.mock('framer-motion', () => ({
  motion: { div: ({ children }: any) => <div>{children}</div>, main: ({ children }: any) => <main>{children}</main> },
  AnimatePresence: ({ children }: any) => children,
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
  usePublicHolidays: () => ({ isPublicHoliday: () => false, getHolidayName: () => null }),
}));

vi.mock('../../hooks/data/useLocationsAndUnits', () => ({
  useLocationsAndUnits: () => ({ locations: [], units: [], fetchLocations: vi.fn(), fetchUnitsByLocation: vi.fn() }),
}));

vi.mock('../../hooks/data/useAnnouncements', () => ({
  useAnnouncements: () => ({ unreadCount: 0, fetchUnreadCount: vi.fn() }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { username: 'admin', role: 'ADMIN' }, isAdmin: true }),
  AuthProvider: ({ children }: any) => <div>{children}</div>
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

describe('TimesheetPage (Puantaj Yönetimi)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTimesheetsModule.useTimesheets).mockReturnValue(defaultTimesheetMock as any);
  });

  it('1. Case: Sayfa başlığı ve çalışan listesi doğru render edilmeli', async () => {
    render(
      <ToastProvider>
        <ModalProvider>
          <TimesheetPage />
        </ModalProvider>
      </ToastProvider>
    );
    
    expect(await screen.findByText('Puantaj İşaretleme')).toBeInTheDocument();
    expect(await screen.findByText('Ahmet Yılmaz')).toBeInTheDocument();
  });

  it('2. Case: Hücreye tıklandığında veri giriş süreci tetiklenmeli', async () => {
    render(
      <ToastProvider>
        <ModalProvider>
          <TimesheetPage />
        </ModalProvider>
      </ToastProvider>
    );

    // Gün hücresinin gelmesini bekle
    const dayBtn = await screen.findByText('01');
    fireEvent.click(dayBtn);
    
    await waitFor(() => {
      expect(mockSetTimesheets).toHaveBeenCalled();
    });
  });

  it('3. Case: Admin kullanıcısı kilit checkbox-ını görebilmeli', async () => {
    render(
      <ToastProvider>
        <ModalProvider>
          <TimesheetPage />
        </ModalProvider>
      </ToastProvider>
    );
    
    expect(await screen.findByText('Veri Girişini Kilitle')).toBeInTheDocument();
  });
});
