import { useState, useRef } from 'react';
// xlsx (CVE-2023-30533) kaldırıldı; read-excel-file ile değiştirildi
import readXlsxFile from 'read-excel-file';
import { FiUploadCloud, FiCheckCircle, FiInfo, FiLoader } from 'react-icons/fi';
import type { BulkImportResult } from '@timesheet/shared';
import * as importService from '../../../api/importService';
import type { BulkEmployeeInput } from '../../../api/importService';
import { useToast } from '../../../components/ToastBar/useToast';

// ── Smart Column Mapping ──────────────────────────────────────────────────────

const COLUMN_MAP: Record<string, string[]> = {
  tcNo: ['tc', 'kimlik', 'tc no', 'tc kimlik', 'tc nk', 'tckn'],
  fullName: ['ad soyad', 'isim soyisim', 'ad', 'isim', 'çalışan', 'ogrenci', 'öğrenci', 'adsoy'],
  locationName: ['yerleşke', 'yerleske', 'şantiye', 'santiye', 'lokasyon', 'yer'],
  unitName: ['birim', 'departman', 'bölüm', 'bolum', 'kısım', 'kisim'],
  startDate: ['giriş', 'işe giriş', 'baslangic', 'başlangıç', 'tarih'],
  endDate: ['çıkış', 'işten çıkış', 'bitis', 'bitiş'],
  ibanNo: ['iban', 'iban no', 'hesap', 'hesap no'],
  phoneNo: ['telefon', 'tel', 'tel no', 'phone', 'gsm', 'cep', 'cep tel', 'cep telefonu', 'telefon no'],
};

function getFieldKey(header: string): string | null {
  const lower = header.toLowerCase().trim();
  const lowerTr = header.toLocaleLowerCase('tr-TR').trim();
  for (const [key, aliases] of Object.entries(COLUMN_MAP)) {
    if (aliases.some((alias) => {
      const a = alias.toLowerCase();
      const aTr = alias.toLocaleLowerCase('tr-TR');
      return lower.includes(a) || lowerTr.includes(aTr);
    })) {
      return key;
    }
  }
  return null;
}

function formatExcelDate(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split('T')[0] ?? null;
  return String(val);
}

// ── Internal Sub-components ──────────────────────────────────────────────────

const ProgressOverlay = ({ current, total }: { current: number; total: number }) => {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="import-overlay">
      <div className="import-overlay__card">
        <div className="import-overlay__spinner">
          <FiLoader className="spin" />
        </div>
        <h3>Veriler Aktarılıyor</h3>
        <p>Lütfen işlem tamamlanana kadar sayfayı kapatmayın.</p>
        <div className="import-overlay__progress">
          <div className="progress-text">
            <span>İşleniyor...</span>
            <span>{current} / {total}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};

const ReportModal = ({ report, onRestart, onClose }: {
  report: BulkImportResult;
  onRestart: () => void;
  onClose: () => void;
}) => {
  const MAX_DISPLAY = 30;
  const successes = report.successes || [];
  const displaySuccesses = successes.slice(0, MAX_DISPLAY);
  const truncatedSuccessesCount = successes.length - MAX_DISPLAY;

  const failures = report.failures || [];
  const displayFailures = failures.slice(0, MAX_DISPLAY);
  const truncatedFailuresCount = failures.length - MAX_DISPLAY;

  return (
    <div className="import-report">
      <div className="import-report__header">
        <FiCheckCircle className="success-icon" />
        <h2>İçe Aktarma Tamamlandı</h2>
      </div>
      <div className="import-report__stats">
        <div className="stat-card success">
          <span className="stat-value">{report.successCount}</span>
          <span className="stat-label">Başarıyla Eklendi</span>
        </div>
        <div className="stat-card failure">
          <span className="stat-value">{report.failures.length}</span>
          <span className="stat-label">Hatalı Satır</span>
        </div>
      </div>

      <div className="import-report__details">
        {successes.length > 0 && (
          <div className="import-report__section import-report__successes">
            <h3>Eklenen Çalışanlar</h3>
            <div className="success-list">
              {displaySuccesses.map((suc, i) => (
                <div key={i} className="success-item">
                  <span className="success-row">Satır {suc.row}</span>
                  <span className="success-name">{suc.name}</span>
                </div>
              ))}
              {truncatedSuccessesCount > 0 && (
                <div className="truncated-info">
                  ... ve {truncatedSuccessesCount} diğer çalışan başarıyla eklendi.
                </div>
              )}
            </div>
          </div>
        )}

        {failures.length > 0 && (
          <div className="import-report__section import-report__errors">
            <h3>Hata Detayları</h3>
            <div className="error-list">
              {displayFailures.map((err, i) => (
                <div key={i} className="error-item">
                  <span className="error-row">Satır {err.row}</span>
                  <span className="error-name">{err.name}</span>
                  <span className="error-msg">{err.error}</span>
                </div>
              ))}
              {truncatedFailuresCount > 0 && (
                <div className="truncated-info">
                  ... ve {truncatedFailuresCount} diğer satırda hata oluştu.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="import-report__actions">
        <button className="btn btn--secondary" onClick={onRestart}>Yeni Dosya Yükle</button>
        <button className="btn btn--secondary" onClick={onClose}>Vazgeç</button>
      </div>
    </div>
  );
};

// ── Ana Bileşen ──────────────────────────────────────────────────────────────

interface BulkImportViewProps {
  onClose: () => void;
  onBusyChange: (busy: boolean) => void;
  onImportSuccess?: () => void;
}

const BulkImportView = ({ onClose, onBusyChange, onImportSuccess }: BulkImportViewProps) => {
  const toast = useToast();
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'done'>('idle');
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importReport, setImportReport] = useState<BulkImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setStatus = (status: 'idle' | 'importing' | 'done') => {
    setImportStatus(status);
    onBusyChange(status !== 'idle');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    e.target.value = '';
  };

  const startImport = async () => {
    if (!selectedFile) return;
    setStatus('importing');
    setImportProgress({ current: 0, total: 0 });

    try {
      const rows = await readXlsxFile(selectedFile);

      if (rows.length < 2) throw new Error('Dosya boş veya başlık satırı eksik.');

      const firstRow = rows[0];
      if (!Array.isArray(firstRow)) throw new Error('Başlık satırı okunamadı.');
      const headers = firstRow.map((h) => String(h ?? ''));
      const mapping: Record<string, number> = {};
      headers.forEach((h, idx) => {
        const key = getFieldKey(h);
        if (key) mapping[key] = idx;
      });

      if (
        mapping.tcNo === undefined ||
        mapping.fullName === undefined ||
        mapping.locationName === undefined ||
        mapping.startDate === undefined ||
        mapping.ibanNo === undefined
      ) {
        throw new Error('Gerekli sütunlar bulunamadı (TC No, Ad Soyad, Yerleşke, İşe Giriş, IBAN).');
      }

      const employeesData: BulkEmployeeInput[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row) || !row.some((cell) => cell !== null && cell !== '')) continue;
        // Çalışan adı, yerleşke ve birim adları büyük harfle kaydedilir (resmi belge gereği)
        employeesData.push({
          tcNo: String(row[mapping.tcNo] ?? '').trim(),
          fullName: String(row[mapping.fullName] ?? '').trim().toLocaleUpperCase('tr-TR'),
          locationName: String(row[mapping.locationName] ?? '').trim().toLocaleUpperCase('tr-TR'),
          unitName: mapping.unitName !== undefined ? String(row[mapping.unitName] ?? '').trim().toLocaleUpperCase('tr-TR') || null : null,
          ibanNo: mapping.ibanNo !== undefined ? String(row[mapping.ibanNo] ?? '').trim() || null : null,
          phoneNo: mapping.phoneNo !== undefined ? String(row[mapping.phoneNo] ?? '').trim() || null : null,
          startDate: mapping.startDate !== undefined ? formatExcelDate(row[mapping.startDate]) : null,
          endDate: mapping.endDate !== undefined ? formatExcelDate(row[mapping.endDate]) : null,
        });
      }

      setImportProgress({ current: 0, total: employeesData.length });

      const CHUNK_SIZE = 200;
      let finalSuccessCount = 0;
      let finalSuccesses: NonNullable<BulkImportResult['successes']> = [];
      let finalFailures: BulkImportResult['failures'] = [];

      for (let i = 0; i < employeesData.length; i += CHUNK_SIZE) {
        const chunk = employeesData.slice(i, i + CHUNK_SIZE);
        const res = await importService.bulkImportEmployees({ employees: chunk });
        if (res.success && res.data) {
          finalSuccessCount += res.data.successCount;
          finalFailures = [...finalFailures, ...res.data.failures];
          if (res.data.successes) {
            finalSuccesses = [...finalSuccesses, ...res.data.successes];
          }
        }
        setImportProgress((prev) => ({
          ...prev,
          current: Math.min(i + CHUNK_SIZE, employeesData.length),
        }));
      }

      setImportReport({
        successCount: finalSuccessCount,
        successes: finalSuccesses,
        failures: finalFailures,
      });
      setStatus('done');
      if (finalSuccessCount > 0 && onImportSuccess) {
        onImportSuccess();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Dosya işlenirken hata oluştu';
      toast({ type: 'error', message });
      setStatus('idle');
    }
  };

  const resetImport = () => {
    setImportReport(null);
    setStatus('idle');
  };

  if (importStatus === 'importing') {
    return <ProgressOverlay {...importProgress} />;
  }

  if (importStatus === 'done' && importReport) {
    return <ReportModal report={importReport} onRestart={resetImport} onClose={onClose} />;
  }

  return (
    <div className="upload-box">
      <div className="upload-box__content">
        {!selectedFile ? (
          <>
            <FiUploadCloud className="upload-icon" />
            <h3>Excel Dosyası Yükle</h3>
            <p>Toplu eklemek istediğiniz öğrenci/çalışan listesini yükleyin.</p>
            <div className="import-info-banner">
              <FiInfo />
              <p>
                Sistem Excel sütunlarını otomatik tanır.{' '}
                <strong>TC, Ad Soyad, Yerleşke, İşe Giriş ve IBAN</strong>{' '}
                sütunları zorunludur. <strong>Telefon No</strong> ve <strong>İşten Çıkış</strong>{' '}
                sütunları ise isteğe bağlıdır.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              id="excel-upload"
              accept=".xlsx,.xls"
              className="file-input-hidden"
              onChange={handleFileUpload}
            />
            <label htmlFor="excel-upload" className="btn upload-btn">
              Dosya Seç
            </label>
          </>
        ) : (
          <div className="selected-file-area">
            <FiCheckCircle className="file-ready-icon" />
            <div className="file-info">
              <span className="file-name">{selectedFile.name}</span>
              <span className="file-size">{(selectedFile.size / 1024).toFixed(1)} KB</span>
            </div>
            <p className="file-hint" onClick={() => setSelectedFile(null)}>
              Bu dosyayı değiştirmek için <u>buraya tıklayın</u>.
            </p>
            <div className="file-actions">
              <button className="btn btn--secondary" onClick={() => setSelectedFile(null)}>
                Vazgeç
              </button>
              <button className="btn" onClick={() => void startImport()}>
                İşlemi Başlat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkImportView;
