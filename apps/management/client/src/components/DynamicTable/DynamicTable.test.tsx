// React bileşenlerini test etmek için gerekli kütüphaneler
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DynamicTable from './DynamicTable';
import type { Column } from './DynamicTable';

/*
  DynamicTable bileşeni:
  - columns ve data prop'larına göre dinamik tablo render eder
  - loading durumunda "Yükleniyor..." gösterir
  - data boş gelince "Veri bulunamadı." yazar
  - pagination prop'u ve onPageChange callback'i gelince sayfalama kontrolleri çıkar
*/

// Test için örnek veri tipi
interface TestRow {
  id: string;
  name: string;
  role: string;
}

const mockColumns: Column<TestRow>[] = [
  { header: 'Ad Soyad', accessor: 'name' },
  { header: 'Rol', accessor: 'role' },
  // render fonksiyonu ile özel hücre
  { header: 'Aksiyon', render: (row) => <button>Düzenle: {row.name}</button> },
];

const mockData: TestRow[] = [
  { id: 'u-1', name: 'Mustafa Bulut', role: 'Admin' },
  { id: 'u-2', name: 'Enes Yıldız', role: 'Yönetici' },
];

describe('DynamicTable bileşeni', () => {
  it('loading prop u verildiğinde "Yükleniyor..." mesajı göstermeli', () => {
    render(
      <DynamicTable columns={mockColumns} data={[]} loading={true} />
    );

    expect(screen.getByText('Yükleniyor...')).toBeInTheDocument();
    // Tablo render edilmemeli
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('data geldiğinde kolon başlıklarını (header) render etmeli', () => {
    render(
      <DynamicTable columns={mockColumns} data={mockData} />
    );

    expect(screen.getByText('Ad Soyad')).toBeInTheDocument();
    expect(screen.getByText('Rol')).toBeInTheDocument();
    expect(screen.getByText('Aksiyon')).toBeInTheDocument();
  });

  it('data geldiğinde satırları doğru render etmeli', () => {
    render(
      <DynamicTable columns={mockColumns} data={mockData} />
    );

    expect(screen.getByText('Mustafa Bulut')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Enes Yıldız')).toBeInTheDocument();
    expect(screen.getByText('Yönetici')).toBeInTheDocument();
  });

  it('render fonksiyonu olan kolonda özel içerik render edilmeli', () => {
    render(
      <DynamicTable columns={mockColumns} data={mockData} />
    );

    // render: (row) => <button>Düzenle: {row.name}</button> kontrolü
    expect(screen.getByText('Düzenle: Mustafa Bulut')).toBeInTheDocument();
    expect(screen.getByText('Düzenle: Enes Yıldız')).toBeInTheDocument();
  });

  it('data boş geldiğinde "Veri bulunamadı." mesajı göstermeli', () => {
    render(
      <DynamicTable columns={mockColumns} data={[]} />
    );

    expect(screen.getByText('Veri bulunamadı.')).toBeInTheDocument();
  });

  it('pagination ve onPageChange verildiğinde kayıt bilgisi ve butonlar render edilmeli', () => {
    const onPageChange = vi.fn();

    render(
      <DynamicTable
        columns={mockColumns}
        data={mockData}
        pagination={{ totalRecords: 25, totalPages: 3, currentPage: 1, limit: 10 }}
        onPageChange={onPageChange}
      />
    );

    // Kayıt sayısı göstergesi: "1–10 / 25"
    expect(screen.getByText('1–10 / 25')).toBeInTheDocument();

    // İleri butonu (currentPage 1 < totalPages 3 → aktif olmalı)
    const buttons = screen.getAllByRole('button');
    const nextBtn = buttons.find(b => b.textContent === '>');
    expect(nextBtn).not.toBeDisabled();
  });

  it('ilk sayfada geri butonu disabled olmalı', () => {
    const onPageChange = vi.fn();

    render(
      <DynamicTable
        columns={mockColumns}
        data={mockData}
        pagination={{ totalRecords: 25, totalPages: 3, currentPage: 1, limit: 10 }}
        onPageChange={onPageChange}
      />
    );

    const buttons = screen.getAllByRole('button');
    const prevBtn = buttons.find(b => b.textContent === '<');
    expect(prevBtn).toBeDisabled();
  });

  it('son sayfada ileri butonu disabled olmalı', () => {
    const onPageChange = vi.fn();

    render(
      <DynamicTable
        columns={mockColumns}
        data={mockData}
        pagination={{ totalRecords: 25, totalPages: 3, currentPage: 3, limit: 10 }}
        onPageChange={onPageChange}
      />
    );

    const buttons = screen.getAllByRole('button');
    const nextBtn = buttons.find(b => b.textContent === '>');
    expect(nextBtn).toBeDisabled();
  });

  it('ileri butona tıklayınca onPageChange doğru sayfa numarasıyla çağrılmalı', () => {
    const onPageChange = vi.fn();

    render(
      <DynamicTable
        columns={mockColumns}
        data={mockData}
        pagination={{ totalRecords: 25, totalPages: 3, currentPage: 2, limit: 10 }}
        onPageChange={onPageChange}
      />
    );

    const buttons = screen.getAllByRole('button');
    const nextBtn = buttons.find(b => b.textContent === '>')!;
    fireEvent.click(nextBtn);

    // currentPage 2 → 3 e geçmeli
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('data boş ve totalRecords 0 iken "Kayıt yok" metni göstermeli', () => {
    render(
      <DynamicTable
        columns={mockColumns}
        data={[]}
        pagination={{ totalRecords: 0, totalPages: 0, currentPage: 1, limit: 10 }}
        onPageChange={vi.fn()}
      />
    );

    expect(screen.getByText('Kayıt yok')).toBeInTheDocument();
  });
});
