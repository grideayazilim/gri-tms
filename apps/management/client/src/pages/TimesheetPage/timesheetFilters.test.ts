import { describe, it, expect } from 'vitest';
import { getTimesheetFilterConfig } from './timesheetFilters';

/*
  timesheetFilters Testleri
  - getTimesheetFilterConfig doğru filter alanlarını döndürmeli
  - Admin için defaultOption alanları mevcut olmalı
  - Sorumlu için defaultOption alanları kaldırılmalı
*/

const mockPeriods = [
  { value: '2024-05', label: 'Mayıs 2024' },
  { value: '2024-06', label: 'Haziran 2024' },
];

const mockLocations = [
  { value: 1, label: 'Merkez Yerleşke' },
  { value: 2, label: 'Ek Yerleşke' },
];

const mockUnits = [
  { value: 10, label: 'Yazılım Birimi' },
  { value: 11, label: 'İK Birimi' },
];

describe('getTimesheetFilterConfig', () => {
  describe('Admin kullanıcı (isAdmin: true)', () => {
    it('4 filtre alanı döndürmeli', () => {
      const config = getTimesheetFilterConfig(mockPeriods, mockLocations, mockUnits, true);
      expect(config).toHaveLength(4);
    });

    it('ilk alan "period" key\'ine ve "Dönem" label\'ına sahip olmalı', () => {
      const config = getTimesheetFilterConfig(mockPeriods, mockLocations, mockUnits, true);
      expect(config[0]!.key).toBe('period');
      expect(config[0]!.label).toBe('Dönem');
      expect(config[0]!.type).toBe('select');
    });

    it('"period" alanı period seçeneklerini içermeli', () => {
      const config = getTimesheetFilterConfig(mockPeriods, mockLocations, mockUnits, true);
      const periodField = config[0]!;
      if (periodField.type === 'select') {
        expect(periodField.options).toHaveLength(2);
        expect(periodField.options[0]!.value).toBe('2024-05');
      }
    });

    it('"location" alanı defaultOption içermeli', () => {
      const config = getTimesheetFilterConfig(mockPeriods, mockLocations, mockUnits, true);
      const locationField = config[1]!;
      if (locationField.type === 'select') {
        expect(locationField.defaultOption).toBe('Tüm Yerleşkeler');
      }
    });

    it('"unit" alanı defaultOption içermeli', () => {
      const config = getTimesheetFilterConfig(mockPeriods, mockLocations, mockUnits, true);
      const unitField = config[2]!;
      if (unitField.type === 'select') {
        expect(unitField.defaultOption).toBe('Tüm Birimler');
      }
    });

    it('"search" alanı text tipinde olmalı', () => {
      const config = getTimesheetFilterConfig(mockPeriods, mockLocations, mockUnits, true);
      const searchField = config[3]!;
      expect(searchField.key).toBe('search');
      expect(searchField.type).toBe('text');
      expect(searchField.label).toBe('Çalışan Ara');
    });

    it('apiParam\'ları doğru map\'lenmeli', () => {
      const config = getTimesheetFilterConfig(mockPeriods, mockLocations, mockUnits, true);
      expect(config[0]!.apiParam).toBe('month');
      expect(config[1]!.apiParam).toBe('locationId');
      expect(config[2]!.apiParam).toBe('unitId');
      expect(config[3]!.apiParam).toBe('search');
    });

    it('lokasyon options\'ları string value\'ya dönüştürülmeli', () => {
      const config = getTimesheetFilterConfig(mockPeriods, mockLocations, mockUnits, true);
      const locationField = config[1]!;
      if (locationField.type === 'select') {
        expect(locationField.options[0]!.value).toBe('1');
        expect(locationField.options[0]!.label).toBe('Merkez Yerleşke');
      }
    });
  });

  describe('Sorumlu kullanıcı (isAdmin: false)', () => {
    it('4 filtre alanı döndürmeli', () => {
      const config = getTimesheetFilterConfig(mockPeriods, mockLocations, mockUnits, false);
      expect(config).toHaveLength(4);
    });

    it('"location" alanında defaultOption olmamalı', () => {
      const config = getTimesheetFilterConfig(mockPeriods, mockLocations, mockUnits, false);
      const locationField = config[1]!;
      if (locationField.type === 'select') {
        expect(locationField.defaultOption).toBeUndefined();
      }
    });

    it('"unit" alanında defaultOption olmamalı', () => {
      const config = getTimesheetFilterConfig(mockPeriods, mockLocations, mockUnits, false);
      const unitField = config[2]!;
      if (unitField.type === 'select') {
        expect(unitField.defaultOption).toBeUndefined();
      }
    });

    it('"period" alanı değişmemeli', () => {
      const adminConfig = getTimesheetFilterConfig(mockPeriods, mockLocations, mockUnits, true);
      const respConfig = getTimesheetFilterConfig(mockPeriods, mockLocations, mockUnits, false);
      expect(respConfig[0]).toEqual(adminConfig[0]);
    });

    it('"search" alanı değişmemeli', () => {
      const adminConfig = getTimesheetFilterConfig(mockPeriods, mockLocations, mockUnits, true);
      const respConfig = getTimesheetFilterConfig(mockPeriods, mockLocations, mockUnits, false);
      expect(respConfig[3]).toEqual(adminConfig[3]);
    });
  });

  describe('Boş listelerle', () => {
    it('boş period listesiyle hata fırlatmamalı', () => {
      expect(() => getTimesheetFilterConfig([], [], [], true)).not.toThrow();
    });

    it('boş listelerle 4 alan döndürmeli', () => {
      const config = getTimesheetFilterConfig([], [], [], true);
      expect(config).toHaveLength(4);
    });
  });
});
