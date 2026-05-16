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

  it('yerleşke ve birimleri hiyerarşik olarak render etmeli', async () => {
    renderLocationsPage();
    expect(await screen.findByDisplayValue('Merkez Yerleşke')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('Yazılım Birimi')).toBeInTheDocument();
  });

  it('yerleşkeyi daraltmak için toggle butonuna basılabilmeli', async () => {
    renderLocationsPage();
    const toggleBtn = await screen.findByTitle('Gizle');
    fireEvent.click(toggleBtn);
    expect(mockToggleLocationCollapse).toHaveBeenCalledWith('loc-1');
  });

  it('yeni yerleşke ekleme butonuna basılabilmeli', async () => {
    renderLocationsPage();
    const addBtn = await screen.findByText('+ Yeni Yerleşke Ekle');
    fireEvent.click(addBtn);
    expect(mockAddLocation).toHaveBeenCalled();
  });

  it('silme butonuna basıldığında removeLocation çağrılmalı', async () => {
    renderLocationsPage();
    const deleteBtn = await screen.findByTitle('Yerleşkeyi Sil');
    fireEvent.click(deleteBtn);
    expect(mockRemoveLocation).toHaveBeenCalled();
  });

  it('kaydedilmemiş değişiklik olduğunda "Değişiklikleri Kaydet" butonu görünmeli', async () => {
    vi.mocked(useLocationSyncModule.useLocationSync).mockReturnValue({
      ...defaultMockValue,
      hasUnsavedChanges: true,
      isLocationDirty: () => true,
    } as any);

    renderLocationsPage();
    const saveBtn = await screen.findByText('Değişiklikleri Kaydet');
    fireEvent.click(saveBtn);
    expect(mockHandleSave).toHaveBeenCalled();
  });

  it('yükleme durumunda "Yükleniyor..." göstermeli', async () => {
    vi.mocked(useLocationSyncModule.useLocationSync).mockReturnValue({
      ...defaultMockValue,
      isLoading: true,
    } as any);

    renderLocationsPage();
    expect(await screen.findByText('Yükleniyor...')).toBeInTheDocument();
  });

  it('kaydedilme durumunda "Kaydediliyor..." göstermeli', async () => {
    vi.mocked(useLocationSyncModule.useLocationSync).mockReturnValue({
      ...defaultMockValue,
      hasUnsavedChanges: true,
      isSaving: true,
    } as any);

    renderLocationsPage();
    expect(await screen.findByText('Kaydediliyor...')).toBeInTheDocument();
  });

  it('silinmiş lokasyon undo butonu göstermeli', async () => {
    const mockUndoLocation = vi.fn();
    vi.mocked(useLocationSyncModule.useLocationSync).mockReturnValue({
      ...defaultMockValue,
      deletedLocationIds: ['loc-1'],
      undoLocation: mockUndoLocation,
    } as any);

    renderLocationsPage();
    const undoBtn = await screen.findByTitle('Geri Al');
    fireEvent.click(undoBtn);
    expect(mockUndoLocation).toHaveBeenCalledWith('loc-1');
  });

  it('yeni birim ekleme butonuna basılabilmeli', async () => {
    const mockAddUnit = vi.fn();
    vi.mocked(useLocationSyncModule.useLocationSync).mockReturnValue({
      ...defaultMockValue,
      addUnit: mockAddUnit,
    } as any);

    renderLocationsPage();
    const addUnitBtn = await screen.findByText('+ Yeni Birim Ekle');
    fireEvent.click(addUnitBtn);
    expect(mockAddUnit).toHaveBeenCalledWith('loc-1');
  });

  it('birim silme butonuna basılabilmeli', async () => {
    const mockRemoveUnit = vi.fn();
    vi.mocked(useLocationSyncModule.useLocationSync).mockReturnValue({
      ...defaultMockValue,
      removeUnit: mockRemoveUnit,
    } as any);

    renderLocationsPage();
    const unitDeleteBtn = await screen.findByTitle('Birimi Sil');
    fireEvent.click(unitDeleteBtn);
    expect(mockRemoveUnit).toHaveBeenCalled();
  });

  it('silinmiş birim için undo butonu göstermeli', async () => {
    const mockUndoUnit = vi.fn();
    vi.mocked(useLocationSyncModule.useLocationSync).mockReturnValue({
      ...defaultMockValue,
      deletedUnitIds: ['unit-1'],
      undoUnit: mockUndoUnit,
    } as any);

    renderLocationsPage();
    const undoBtns = await screen.findAllByTitle('Geri Al');
    fireEvent.click(undoBtns[0]!);
    expect(mockUndoUnit).toHaveBeenCalledWith('unit-1');
  });

  it('program no inputu değişince handleLocationChange çağrılmalı', async () => {
    const mockHandleChange = vi.fn();
    vi.mocked(useLocationSyncModule.useLocationSync).mockReturnValue({
      ...defaultMockValue,
      handleLocationChange: mockHandleChange,
    } as any);

    renderLocationsPage();
    const programInput = await screen.findByDisplayValue('101');
    fireEvent.change(programInput, { target: { value: '999' } });
    expect(mockHandleChange).toHaveBeenCalledWith('loc-1', 'programNo', '999');
  });

  it('isExpanded false olan lokasyon "is-collapsed" sınıfı almalı', async () => {
    vi.mocked(useLocationSyncModule.useLocationSync).mockReturnValue({
      ...defaultMockValue,
      expandedLocations: [],
    } as any);

    renderLocationsPage();
    await waitFor(() => {
      const locationNode = document.querySelector('.location-node');
      expect(locationNode).toHaveClass('is-collapsed');
    });
  });

  it('lokasyon adı inputu değişince handleLocationChange çağrılmalı', async () => {
    const mockHandleChange = vi.fn();
    vi.mocked(useLocationSyncModule.useLocationSync).mockReturnValue({
      ...defaultMockValue,
      handleLocationChange: mockHandleChange,
    } as any);

    renderLocationsPage();
    const nameInput = await screen.findByDisplayValue('Merkez Yerleşke');
    fireEvent.change(nameInput, { target: { value: 'Yeni İsim' } });
    expect(mockHandleChange).toHaveBeenCalledWith('loc-1', 'name', 'Yeni İsim');
  });

  it('yeni (isNew) lokasyon için export butonu tıklandığında toast göstermeli', async () => {
    vi.mocked(useLocationSyncModule.useLocationSync).mockReturnValue({
      ...defaultMockValue,
      locations: [{ ...mockLocations[0], isNew: true }],
    } as any);

    renderLocationsPage();
    const excelBtn = await screen.findByTitle('Puantaj Export Al');
    fireEvent.click(excelBtn);

    expect(await screen.findByText('Önce değişiklikleri kaydedin')).toBeInTheDocument();
  });
});
