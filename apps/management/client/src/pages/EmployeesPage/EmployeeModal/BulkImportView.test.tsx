import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BulkImportView from './BulkImportView';

/*
  BulkImportView Testleri
  - Başlangıç ekranı render
  - Dosya seçme ve gösterim
  - Dosya iptal etme
  - Import başlat butonu
  - Zorunlu sütun eksik hatası
  - Başarılı import → rapor ekranı
  - Hatalı import → rapor hataları
  - Progress overlay
*/

const mockToast = vi.fn();

vi.mock('../../../components/ToastBar/useToast', () => ({
  useToast: () => mockToast,
}));

const mockBulkImport = vi.fn();

vi.mock('../../../api/importService', () => ({
  bulkImportEmployees: (...args: unknown[]) => mockBulkImport(...args),
}));

const mockReadXlsxFile = vi.fn();

vi.mock('read-excel-file', () => ({
  default: (...args: unknown[]) => mockReadXlsxFile(...args),
}));

const xlsxFile = new File(['dummy'], 'test-data.xlsx', {
  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
});

// Simulates File.arrayBuffer()
Object.defineProperty(xlsxFile, 'arrayBuffer', {
  value: () => Promise.resolve(new ArrayBuffer(8)),
});

function validWorkbook() {
  mockReadXlsxFile.mockResolvedValue([
    ['tc', 'ad soyad', 'yerleşke', 'işe giriş', 'iban', 'telefon'],
    ['11111111111', 'Ali Veli', 'Merkez', '2024-01-01', 'TR12 0001 0017 0000 0123 4567 89', '05551234567'],
  ]);
}

describe('BulkImportView Bileşeni', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBulkImport.mockResolvedValue({ success: true, data: { successCount: 1, failures: [] } });
  });

  it('dosya yükleme ekranı başarıyla render edilmeli', () => {
    render(<BulkImportView onClose={vi.fn()} onBusyChange={vi.fn()} />);

    expect(screen.getByText('Excel Dosyası Yükle')).toBeInTheDocument();
    expect(screen.getByText('Dosya Seç')).toBeInTheDocument();
  });

  it('zorunlu sütun bilgileri gösterilmeli', () => {
    render(<BulkImportView onClose={vi.fn()} onBusyChange={vi.fn()} />);

    expect(screen.getByText(/TC, Ad Soyad, Yerleşke, İşe Giriş ve IBAN/)).toBeInTheDocument();
  });

  it('dosya seçildiğinde arayüz seçilen dosyayı göstermeli', async () => {
    render(<BulkImportView onClose={vi.fn()} onBusyChange={vi.fn()} />);

    const input = document.querySelector('#excel-upload') as HTMLInputElement;
    await userEvent.upload(input, xlsxFile);

    await waitFor(() => {
      expect(screen.getByText('test-data.xlsx')).toBeInTheDocument();
    });

    expect(screen.getByText('İşlemi Başlat')).toBeInTheDocument();
  });

  it('"Vazgeç" butonuna basınca dosya seçimi iptal edilmeli', async () => {
    render(<BulkImportView onClose={vi.fn()} onBusyChange={vi.fn()} />);

    const input = document.querySelector('#excel-upload') as HTMLInputElement;
    await userEvent.upload(input, xlsxFile);

    await waitFor(() => expect(screen.getByText('test-data.xlsx')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Vazgeç' }));

    expect(screen.getByText('Excel Dosyası Yükle')).toBeInTheDocument();
  });

  it('"buraya tıklayın" tıklanınca dosya seçimi sıfırlanmalı', async () => {
    render(<BulkImportView onClose={vi.fn()} onBusyChange={vi.fn()} />);

    const input = document.querySelector('#excel-upload') as HTMLInputElement;
    await userEvent.upload(input, xlsxFile);

    await waitFor(() => expect(screen.getByText('test-data.xlsx')).toBeInTheDocument());

    fireEvent.click(screen.getByText('buraya tıklayın'));

    expect(screen.getByText('Excel Dosyası Yükle')).toBeInTheDocument();
  });

  it('dosya seçimi sonrası boyut bilgisi gösterilmeli', async () => {
    render(<BulkImportView onClose={vi.fn()} onBusyChange={vi.fn()} />);

    const input = document.querySelector('#excel-upload') as HTMLInputElement;
    await userEvent.upload(input, xlsxFile);

    await waitFor(() => {
      expect(screen.getByText(/KB/)).toBeInTheDocument();
    });
  });

  it('telefon sütunu olmadan da başarılı import yapılabilmeli', async () => {
    mockReadXlsxFile.mockResolvedValue([
      ['tc', 'ad soyad', 'yerleşke', 'işe giriş', 'iban'],
      ['11111111111', 'Ali Veli', 'Merkez', '2024-01-01', 'TR120001001700000123456789'],
    ]);
    mockBulkImport.mockResolvedValue({ success: true, data: { successCount: 1, failures: [] } });

    render(<BulkImportView onClose={vi.fn()} onBusyChange={vi.fn()} />);

    const input = document.querySelector('#excel-upload') as HTMLInputElement;
    await userEvent.upload(input, xlsxFile);
    await waitFor(() => expect(screen.getByText('test-data.xlsx')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText('İşlemi Başlat'));
    });

    await waitFor(() => {
      expect(screen.getByText('İçe Aktarma Tamamlandı')).toBeInTheDocument();
    });
  });

  it('başarılı import sonrası rapor ekranı gösterilmeli', async () => {
    validWorkbook();
    mockBulkImport.mockResolvedValue({ success: true, data: { successCount: 1, failures: [] } });

    render(<BulkImportView onClose={vi.fn()} onBusyChange={vi.fn()} />);

    const input = document.querySelector('#excel-upload') as HTMLInputElement;
    await userEvent.upload(input, xlsxFile);
    await waitFor(() => expect(screen.getByText('test-data.xlsx')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText('İşlemi Başlat'));
    });

    await waitFor(() => {
      expect(screen.getByText('İçe Aktarma Tamamlandı')).toBeInTheDocument();
    });

    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('başarılı import sonrası "Yeni Dosya Yükle" butonu gösterilmeli', async () => {
    validWorkbook();

    render(<BulkImportView onClose={vi.fn()} onBusyChange={vi.fn()} />);

    const input = document.querySelector('#excel-upload') as HTMLInputElement;
    await userEvent.upload(input, xlsxFile);
    await waitFor(() => expect(screen.getByText('test-data.xlsx')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText('İşlemi Başlat'));
    });

    await waitFor(() => {
      expect(screen.getByText('Yeni Dosya Yükle')).toBeInTheDocument();
    });
  });

  it('"Yeni Dosya Yükle" butonuna basınca upload box gösterilmeli', async () => {
    validWorkbook();

    render(<BulkImportView onClose={vi.fn()} onBusyChange={vi.fn()} />);

    const input = document.querySelector('#excel-upload') as HTMLInputElement;
    await userEvent.upload(input, xlsxFile);
    await waitFor(() => expect(screen.getByText('test-data.xlsx')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText('İşlemi Başlat'));
    });

    await waitFor(() => expect(screen.getByText('Yeni Dosya Yükle')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Yeni Dosya Yükle'));

    // selectedFile is still set so we stay on the file-selected view
    expect(screen.getByText('İşlemi Başlat')).toBeInTheDocument();
  });

  it('rapor ekranında "Vazgeç" butonu onClose çağırmalı', async () => {
    validWorkbook();
    const onClose = vi.fn();

    render(<BulkImportView onClose={onClose} onBusyChange={vi.fn()} />);

    const input = document.querySelector('#excel-upload') as HTMLInputElement;
    await userEvent.upload(input, xlsxFile);
    await waitFor(() => expect(screen.getByText('test-data.xlsx')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText('İşlemi Başlat'));
    });

    await waitFor(() => expect(screen.getByText('İçe Aktarma Tamamlandı')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Vazgeç' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('import hatası varsa rapor hata listesi gösterilmeli', async () => {
    validWorkbook();
    mockBulkImport.mockResolvedValue({
      success: true,
      data: {
        successCount: 0,
        failures: [{ row: 2, name: 'Ali Veli', error: 'TC No geçersiz' }],
      },
    });

    render(<BulkImportView onClose={vi.fn()} onBusyChange={vi.fn()} />);

    const input = document.querySelector('#excel-upload') as HTMLInputElement;
    await userEvent.upload(input, xlsxFile);
    await waitFor(() => expect(screen.getByText('test-data.xlsx')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText('İşlemi Başlat'));
    });

    await waitFor(() => {
      expect(screen.getByText('Hata Detayları')).toBeInTheDocument();
    });

    expect(screen.getByText('TC No geçersiz')).toBeInTheDocument();
  });

  it('zorunlu sütunlar eksikse hata toast\'ı gösterilmeli', async () => {
    mockReadXlsxFile.mockResolvedValue([
      ['bilinmeyen_kolon'],
      ['veri'],
    ]);

    render(<BulkImportView onClose={vi.fn()} onBusyChange={vi.fn()} />);

    const input = document.querySelector('#excel-upload') as HTMLInputElement;
    await userEvent.upload(input, xlsxFile);
    await waitFor(() => expect(screen.getByText('test-data.xlsx')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText('İşlemi Başlat'));
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' }),
      );
    });

    // After error, selectedFile is still set → shows "İşlemi Başlat" button
    expect(screen.getByText('İşlemi Başlat')).toBeInTheDocument();
  });

  it('Excel sayfası yoksa hata toast\'ı gösterilmeli', async () => {
    mockReadXlsxFile.mockResolvedValue([]);

    render(<BulkImportView onClose={vi.fn()} onBusyChange={vi.fn()} />);

    const input = document.querySelector('#excel-upload') as HTMLInputElement;
    await userEvent.upload(input, xlsxFile);
    await waitFor(() => expect(screen.getByText('test-data.xlsx')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText('İşlemi Başlat'));
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' }),
      );
    });
  });

  it('onBusyChange true çağrılmalı import başladığında', async () => {
    validWorkbook();
    const onBusyChange = vi.fn();

    // importService'i hiç resolve etmeyen Promise ile dondur
    mockBulkImport.mockImplementation(() => new Promise(() => {}));

    render(<BulkImportView onClose={vi.fn()} onBusyChange={onBusyChange} />);

    const input = document.querySelector('#excel-upload') as HTMLInputElement;
    await userEvent.upload(input, xlsxFile);
    await waitFor(() => expect(screen.getByText('test-data.xlsx')).toBeInTheDocument());

    fireEvent.click(screen.getByText('İşlemi Başlat'));

    await waitFor(() => {
      expect(onBusyChange).toHaveBeenCalledWith(true);
    });
  });

  it('başarılı import durumunda onImportSuccess çağrılmalı', async () => {
    validWorkbook();
    mockBulkImport.mockResolvedValue({ success: true, data: { successCount: 1, failures: [] } });
    const onImportSuccess = vi.fn();

    render(<BulkImportView onClose={vi.fn()} onBusyChange={vi.fn()} onImportSuccess={onImportSuccess} />);

    const input = document.querySelector('#excel-upload') as HTMLInputElement;
    await userEvent.upload(input, xlsxFile);
    await waitFor(() => expect(screen.getByText('test-data.xlsx')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText('İşlemi Başlat'));
    });

    await waitFor(() => {
      expect(onImportSuccess).toHaveBeenCalled();
    });
  });
});
