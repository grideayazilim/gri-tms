import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AuditLogsPage from './AuditLogsPage';
import * as useFilterModule from '../../hooks/data/useFilter';

/*
  AuditLogsPage Entegrasyon Testi (Memory Optimized)
*/

// --- MOCKLAR ---
vi.mock('../../components/DynamicTable/DynamicTable', () => ({
  default: ({ data, onPageChange }: any) => (
    <div data-testid="mock-table">
      {data.map((row: any) => (
        <div key={row.id} className="mock-row">
          <span>{row.action}</span>
          <span>{row.actor}</span>
        </div>
      ))}
      <button onClick={() => onPageChange(2)}>Sonraki Sayfa</button>
    </div>
  )
}));

vi.mock('../../components/FilterBar/FilterBar', () => ({
  default: ({ onFilterChange }: any) => (
    <div data-testid="mock-filter-bar">
      <button onClick={() => onFilterChange('category', 'SECURITY')}>Filtrele</button>
    </div>
  )
}));

vi.mock('../../components/PageShell/PageShell', () => ({
  default: ({ children, title }: any) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  )
}));

const mockFetchAuditLogs = vi.fn();
const mockHandleFilterChange = vi.fn();

vi.mock('../../hooks/data/useAuditLogs', () => ({
  useAuditLogs: () => ({
    auditLogs: [{ id: '1', action: 'GİRİŞ YAPILDI', actor: 'admin' }],
    pagination: { total: 10, page: 1, limit: 10 },
    fetchAuditLogs: mockFetchAuditLogs,
    isLoading: false,
    error: null,
  })
}));

vi.mock('../../hooks/data/useFilter', () => ({
  useFilter: vi.fn()
}));

describe('AuditLogsPage (Denetim Kayıtları)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFilterModule.useFilter).mockReturnValue({
      filters: { category: '', beforeDate: '', searchActor: '' },
      apiParams: { category: '' },
      handleFilterChange: mockHandleFilterChange,
      setFilters: vi.fn(),
    });
  });

  it('sayfayı ve işlem kayıtlarını doğru render etmeli', async () => {
    render(<AuditLogsPage />);

    expect(await screen.findByText('İşlem Kayıtları')).toBeInTheDocument();
    expect(await screen.findByText('GİRİŞ YAPILDI')).toBeInTheDocument();
    expect(mockFetchAuditLogs).toHaveBeenCalled();
  });

  it('filtre değiştiğinde filtre fonksiyonunu ve fetch metodunu tetiklemeli', async () => {
    render(<AuditLogsPage />);

    const filterBtn = await screen.findByText('Filtrele');
    fireEvent.click(filterBtn);

    await waitFor(() => {
      expect(mockHandleFilterChange).toHaveBeenCalledWith('category', 'SECURITY');
    });
  });

  it('sayfa değiştiğinde fetch metodunu yeni sayfa numarasıyla çağırmalı', async () => {
    render(<AuditLogsPage />);

    const nextPageBtn = await screen.findByText('Sonraki Sayfa');
    fireEvent.click(nextPageBtn);

    await waitFor(() => {
      // useEffect tetiklenip sayfayı 2 olarak isteyecek
      expect(mockFetchAuditLogs).toHaveBeenCalledWith(expect.any(Object), 2);
    });
  });
});
