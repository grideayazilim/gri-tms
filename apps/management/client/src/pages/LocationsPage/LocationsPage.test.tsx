import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LocationsPage from './LocationsPage';
import { ToastProvider } from '../../components/ToastBar/ToastContext';
import * as useLocationSyncModule from './useLocationSync';

/*
  LocationsPage Entegrasyon Testi - Fix Edition
*/

// framer-motion mock
vi.mock('framer-motion', () => ({
  motion: { 
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    main: ({ children, ...props }: any) => <main {...props}>{children}</main>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// API Service mocks
vi.mock('../../api/timesheetService', () => ({
  getPeriods: vi.fn().mockResolvedValue({ 
    success: true, 
    data: { periods: [{ id: '1', year: 2024, month: 5 }] } 
  }),
}));

// AuthContext mock
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'ADMIN' } }),
  AuthProvider: ({ children }: any) => <div>{children}</div>
}));

// useLocationSync mock (Initial)
const mockAddLocation = vi.fn();
const mockRemoveLocation = vi.fn();
const mockHandleSave = vi.fn();
const mockToggleLocationCollapse = vi.fn();

const mockLocations = [
  { 
    id: 'loc-1', 
    name: 'Merkez Yerleşke', 
    programNo: '101',
    units: [{ id: 'unit-1', name: 'Yazılım Birimi' }]
  }
];

const defaultMockValue = {
  locations: mockLocations,
  isLoading: false,
  isSaving: false,
  deletedLocationIds: [],
  deletedUnitIds: [],
  expandedLocations: ['loc-1'],
  hasUnsavedChanges: false,
  toggleLocationCollapse: mockToggleLocationCollapse,
  handleLocationChange: vi.fn(),
  addLocation: mockAddLocation,
  removeLocation: mockRemoveLocation,
  undoLocation: vi.fn(),
  handleUnitChange: vi.fn(),
  addUnit: vi.fn(),
  removeUnit: vi.fn(),
  undoUnit: vi.fn(),
  handleSave: mockHandleSave,
  isLocationDirty: () => false,
  isUnitDirty: () => false,
};

vi.mock('./useLocationSync', () => ({
  useLocationSync: vi.fn()
}));

function renderLocationsPage() {
  return render(
    <ToastProvider>
      <LocationsPage />
    </ToastProvider>
  );
}

describe('LocationsPage (Yerleşke Yönetimi)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useLocationSyncModule.useLocationSync).mockReturnValue(defaultMockValue as any);
  });

  it('yerleşke ve birimleri hiyerarşik olarak render etmeli', () => {
    renderLocationsPage();
    expect(screen.getByDisplayValue('Merkez Yerleşke')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Yazılım Birimi')).toBeInTheDocument();
  });

  it('yerleşkeyi daraltmak için toggle butonuna basılabilmeli', () => {
    renderLocationsPage();
    const toggleBtn = screen.getByTitle('Gizle');
    fireEvent.click(toggleBtn);
    expect(mockToggleLocationCollapse).toHaveBeenCalledWith('loc-1');
  });

  it('yeni yerleşke ekleme butonuna basılabilmeli', () => {
    renderLocationsPage();
    const addBtn = screen.getByText('+ Yeni Yerleşke Ekle');
    fireEvent.click(addBtn);
    expect(mockAddLocation).toHaveBeenCalled();
  });

  it('silme butonuna basıldığında removeLocation çağrılmalı', () => {
    renderLocationsPage();
    const deleteBtn = screen.getByTitle('Yerleşkeyi Sil');
    fireEvent.click(deleteBtn);
    expect(mockRemoveLocation).toHaveBeenCalled();
  });

  it('kaydedilmemiş değişiklik olduğunda "Değişiklikleri Kaydet" butonu görünmeli', () => {
    vi.mocked(useLocationSyncModule.useLocationSync).mockReturnValue({
      ...defaultMockValue,
      hasUnsavedChanges: true,
      isLocationDirty: () => true,
    } as any);

    renderLocationsPage();
    const saveBtn = screen.getByText('Değişiklikleri Kaydet');
    fireEvent.click(saveBtn);
    expect(mockHandleSave).toHaveBeenCalled();
  });
});
