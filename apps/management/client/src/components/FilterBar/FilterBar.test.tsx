// React bileşenlerini test etmek için gerekli kütüphaneler
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FilterBar from './FilterBar';
import type { FilterField } from '../../hooks/data/useFilter';

/*
  FilterBar bileşeni, sayfa içindeki filtre alanlarını (select, text, date)
  config dizisine göre dinamik olarak render eder.
  Kullanıcı bir değer seçtiğinde onFilterChange callback'ini çağırır.
*/

// Test için örnek filtre konfigürasyonu
const mockConfig: ReadonlyArray<FilterField> = [
  {
    key: 'role',
    apiParam: 'roleId',
    label: 'Rol',
    type: 'select',
    options: [
      { value: 'admin', label: 'Admin' },
      { value: 'manager', label: 'Yönetici' },
    ],
    defaultOption: 'Tümü',
  },
  {
    key: 'search',
    apiParam: 'q',
    label: 'Arama',
    type: 'text',
  },
  {
    key: 'startDate',
    apiParam: 'date_gte',
    label: 'Başlangıç Tarihi',
    type: 'date',
  },
] as const;

describe('FilterBar bileşeni', () => {
  it('config deki tüm alanlar doğru render edilmeli', () => {
    render(
      <FilterBar
        config={mockConfig}
        filters={{}}
        onFilterChange={vi.fn()}
      />
    );

    // Her alanın etiketi (label) ekranda görünmeli
    expect(screen.getByText('Rol')).toBeInTheDocument();
    expect(screen.getByText('Arama')).toBeInTheDocument();
    expect(screen.getByText('Başlangıç Tarihi')).toBeInTheDocument();
  });

  it('select alanı doğru options ile render edilmeli', () => {
    render(
      <FilterBar
        config={mockConfig}
        filters={{}}
        onFilterChange={vi.fn()}
      />
    );

    // defaultOption görünmeli
    expect(screen.getByText('Tümü')).toBeInTheDocument();
    // Seçenekler görünmeli
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Yönetici')).toBeInTheDocument();
  });

  it('select değiştiğinde onFilterChange doğru parametrelerle çağrılmalı', () => {
    const onFilterChange = vi.fn();

    render(
      <FilterBar
        config={mockConfig}
        filters={{}}
        onFilterChange={onFilterChange}
      />
    );

    // Select elemanını bul ve değerini değiştir
    const selectEl = screen.getByRole('combobox'); // <select> ARIA rolü combobox'tır
    fireEvent.change(selectEl, { target: { value: 'admin' } });

    expect(onFilterChange).toHaveBeenCalledTimes(1);
    expect(onFilterChange).toHaveBeenCalledWith('role', 'admin');
  });

  it('text input değiştiğinde onFilterChange doğru parametrelerle çağrılmalı', () => {
    const onFilterChange = vi.fn();

    render(
      <FilterBar
        config={mockConfig}
        filters={{}}
        onFilterChange={onFilterChange}
      />
    );

    // Text input'u bul — placeholder=" " (boşluk) ile ayrılıyor
    const textInputs = screen.getAllByRole('textbox');
    fireEvent.change(textInputs[0]!, { target: { value: 'mustafa' } });

    expect(onFilterChange).toHaveBeenCalledWith('search', 'mustafa');
  });

  it('filters prop u dolu geldiğinde inputlar doğru değeri göstermeli', () => {
    render(
      <FilterBar
        config={mockConfig}
        filters={{ role: 'admin', search: 'mevcut değer' }}
        onFilterChange={vi.fn()}
      />
    );

    const selectEl = screen.getByRole('combobox') as HTMLSelectElement;
    expect(selectEl.value).toBe('admin');

    const textInputs = screen.getAllByRole('textbox');
    expect((textInputs[0] as HTMLInputElement).value).toBe('mevcut değer');
  });

  it('config boş diziyse hiçbir alan render edilmemeli', () => {
    render(
      <FilterBar
        config={[]}
        filters={{}}
        onFilterChange={vi.fn()}
      />
    );

    // Hiçbir input veya select olmamalı
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
