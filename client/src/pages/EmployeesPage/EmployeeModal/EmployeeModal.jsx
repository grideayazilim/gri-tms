/* ========================================================================
   EMPLOYEE MODAL (ÇALIŞAN EKLEME/DÜZENLEME MODALI)
   Hem tekli manuel girişi hem de Excel üzerinden toplu içe aktarmayı (Import) destekler.
   "Smart Mapping" özelliği ile Excel sütun isimlerini otomatik tanır.
   ======================================================================== */
import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { employeeSchema } from "../../../schemas/employee.schema";
import { useLocationsAndUnits } from "../../../hooks/data/useLocationsAndUnits";
import { 
  FiUploadCloud, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiUser, 
  FiUsers, 
  FiX, 
  FiInfo, 
  FiLoader 
} from "react-icons/fi";
import * as XLSX from "xlsx";
import * as importService from "../../../api/importService";
import { useToast } from "../../../components/ToastBar/ToastContext";
import { toISODateString } from "../../../utils/dateUtils";
import "./EmployeeModal.scss";


// ── Smart Column Mapping ──────────────────────────────────────────────────────
// Kullanıcının yüklediği Excel'deki farklı başlık isimlerini (aliases) 
// veritabanındaki karşılıklarına (keys) eşleyen sözlük.
const COLUMN_MAP = {
  tcNo: ["tc", "kimlik", "tc no", "tc kimlik", "tc nk", "tckn"],
  fullName: ["ad soyad", "isim soyisim", "ad", "isim", "çalışan", "ogrenci", "öğrenci", "adsoy"],
  locationName: ["yerleşke", "yerleske", "şantiye", "santiye", "lokasyon", "yer"],
  unitName: ["birim", "departman", "bölüm", "bolum", "kısım", "kisim"],
  startDate: ["giriş", "işe giriş", "baslangic", "başlangıç", "tarih"],
  endDate: ["çıkış", "işten çıkış", "bitis", "bitiş"],
  ibanNo: ["iban", "iban no", "hesap", "hesap no"],
};


function getFieldKey(header) {
  const lower = header.toLowerCase().trim();
  const lowerTr = header.toLocaleLowerCase('tr-TR').trim();
    
  for (const [key, aliases] of Object.entries(COLUMN_MAP)) {
    if (aliases.some(alias => {
      const a = alias.toLowerCase();
      const aTr = alias.toLocaleLowerCase('tr-TR');
      return lower.includes(a) || lowerTr.includes(aTr);
    })) {
      return key;
    }
  }
  return null;
}

// ── Helper: Excel Tarih Formatı ──────────────────────────────────────────────
// Excel bazen tarihleri "serial number" (örn: 45321) olarak tutar. 
// Bu fonksiyon hem JS Date objelerini hem de bu sayısal formatı ISO date string'e çevirir.
function formatExcelDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split("T")[0];
  // Excel numeric date check (1900-01-01 tabanlı gün sayısı)
  if (typeof val === "number") {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return d.toISOString().split("T")[0];
  }
  return val;
}



// ── Progress Overlay Component ──────────────────────────────────────────────
const ProgressOverlay = ({ current, total }) => {
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

// ── Report Modal Component ──────────────────────────────────────────────────
const ReportModal = ({ report, onRestart, onClose }) => {
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

      {report.failures.length > 0 && (
        <div className="import-report__errors">
          <h3>Hata Detayları</h3>
          <div className="error-list">
            {report.failures.map((err, i) => (
              <div key={i} className="error-item">
                <span className="error-row">Satır {err.row}</span>
                <span className="error-name">{err.name}</span>
                <span className="error-msg">{err.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="import-report__actions">
        <button className="btn btn--secondary" onClick={onRestart}>Yeni Dosya Yükle</button>
        <button className="btn btn--secondary" onClick={onClose}>Vazgeç</button>
      </div>
    </div>
  );
};

// ── Ana Bileşen ─────────────────────────────────────────────────────────────
const EmployeeModal = ({ employee, onClose, onSave }) => {
  const toast = useToast();
  const [currentMode, setCurrentMode] = useState("SINGLE");
  const [apiError, setApiError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Bulk state
  const [importStatus, setImportStatus] = useState("idle"); // idle | importing | done
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importReport, setImportReport] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const { locations, units, fetchLocations, fetchUnitsByLocation } = useLocationsAndUnits();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
    reset
  } = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      tcNo: employee?.tcNo || "",
      firstName: employee?.firstName || "",
      lastName: employee?.lastName || "",
      locationId: employee?.unit?.location?.id?.toString() || "",
      unitId: employee?.unit?.id?.toString() || "",
      startDate: toISODateString(employee?.startDate),
      endDate: toISODateString(employee?.endDate),
      ibanNo: employee?.ibanNo || "",
      isActive: employee?.isActive !== undefined ? employee.isActive : true,
    },
  });

  const selectedLocationId = watch("locationId");
  const selectedUnitId = watch("unitId");

  const handleLocationChange = (e) => {
    const locId = e.target.value;
    setValue("locationId", locId, { shouldDirty: true });
    setValue("unitId", "", { shouldDirty: true });
    if (locId) fetchUnitsByLocation(locId);
  };

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    if (employee?.unit?.location?.id) {
      fetchUnitsByLocation(employee.unit.location.id);
    }
  }, [employee, fetchUnitsByLocation]);


  const onSubmit = async (data) => {
    setApiError(null);
    setIsSaving(true);
    try {
      const payload = {
        tcNo: data.tcNo,
        firstName: data.firstName,
        lastName: data.lastName,
        locationId: data.locationId,
        unitId: data.unitId,
        startDate: data.startDate,
        // Eğer çalışan hala aktifse işten çıkış tarihi veritabanına null olarak gider
        endDate: data.isActive ? null : data.endDate || null,
        ibanNo: data.ibanNo || null,
        isActive: data.isActive,
      };
      const result = await onSave(payload);
      if (result && result.success === false) {
        setApiError(result.error || "Çalışan kaydedilemedi");
      }
    } catch (err) {
      setApiError(err?.message || "İşlem sırasında bir hata oluştu");
    } finally {
      setIsSaving(false);
    }
  };


  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    e.target.value = "";
  };

  const startImport = async () => {
    if (!selectedFile) return;

    setImportStatus("importing");
    setImportProgress({ current: 0, total: 0 });

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (rows.length < 2) throw new Error("Dosya boş veya başlık satırı eksik.");

      const headers = rows[0].map((h) => String(h || ""));
      const mapping = {};
      headers.forEach((h, idx) => {
        const key = getFieldKey(h);
        if (key) mapping[key] = idx;
      });

      // Zorunlu alan kontrolü
      if (
        mapping.tcNo === undefined ||
        mapping.fullName === undefined ||
        mapping.locationName === undefined ||
        mapping.startDate === undefined ||
        mapping.ibanNo === undefined
      ) {
        throw new Error(
          "Gerekli sütunlar bulunamadı (TC No, Ad Soyad, Yerleşke, İşe Giriş, IBAN)."
        );
      }

      const employeesData = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row.some((cell) => cell !== null && cell !== "")) continue; // Boş satırı atla

        employeesData.push({
          tcNo: String(row[mapping.tcNo] || "").trim(),
          fullName: String(row[mapping.fullName] || "").trim(),
          locationName: String(row[mapping.locationName] || "").trim(),
          unitName:
            mapping.unitName !== undefined
              ? String(row[mapping.unitName] || "").trim()
              : null,
          ibanNo:
            mapping.ibanNo !== undefined
              ? String(row[mapping.ibanNo] || "").trim()
              : null,
          startDate:
            mapping.startDate !== undefined
              ? formatExcelDate(row[mapping.startDate])
              : null,
          endDate:
            mapping.endDate !== undefined
              ? formatExcelDate(row[mapping.endDate])
              : null,
        });
      }

      setImportProgress({ current: 0, total: employeesData.length });

      // Chunking (Toplu aktarımı parçalara bölme):
      // Tarayıcının timeout'a düşmesini önlemek ve kullanıcıya ilerleme bilgisini 
      // anlık gösterebilmek için verileri 200'erli paketler halinde sunucuya yolluyoruz.
      const CHUNK_SIZE = 200;
      let finalSuccessCount = 0;
      let finalFailures = [];

      for (let i = 0; i < employeesData.length; i += CHUNK_SIZE) {
        const chunk = employeesData.slice(i, i + CHUNK_SIZE);
        const res = await importService.bulkImportEmployees({ employees: chunk });

        if (res.data) {
          finalSuccessCount += res.data.successCount;
          finalFailures = [...finalFailures, ...res.data.failures];
        }

        setImportProgress((prev) => ({
          ...prev,
          current: Math.min(i + CHUNK_SIZE, employeesData.length),
        }));
      }


      setImportReport({
        successCount: finalSuccessCount,
        failures: finalFailures,
      });
      setImportStatus("done");
    } catch (err) {
      toast({ type: "error", message: err.message || "Dosya işlenirken hata oluştu" });
      setImportStatus("idle");
    }
  };

  const resetImport = () => {
    setImportStatus("idle");
    setImportReport(null);
  };

  return (
    <div className="employee-modal">
      {!employee && importStatus !== "importing" && importStatus !== "done" && (
        <div className="employee-modal__tabs">
          <button
            type="button"
            className={`btn tab-btn ${currentMode === "SINGLE" ? "active" : "btn--secondary"}`}
            onClick={() => {
              setCurrentMode("SINGLE");
              resetImport();
            }}
          >
            <FiUser />
            Tekli Giriş
          </button>
          <button
            type="button"
            className={`btn tab-btn ${currentMode === "BULK" ? "active" : "btn--secondary"}`}
            onClick={() => setCurrentMode("BULK")}
          >
            <FiUsers />
            Toplu Giriş
          </button>
        </div>
      )}

      {importStatus === "importing" && <ProgressOverlay {...importProgress} />}

      {importStatus === "done" && (
        <ReportModal 
          report={importReport} 
          onRestart={resetImport} 
          onClose={onClose} 
        />
      )}

      {importStatus === "idle" && (
        currentMode === "SINGLE" ? (
          <form className="modal-form" onSubmit={handleSubmit(onSubmit)}>
            {/* Tekli Giriş Formu (Değişmedi) */}
            <div className="settings-row">
              <div className="floating-group flex-full">
                <input
                  type="text"
                  id="tcNo"
                  className={`input ${errors.tcNo ? "input--error" : ""}`}
                  placeholder=" "
                  maxLength={11}
                  {...register("tcNo")}
                />
                <label htmlFor="tcNo" className="floating-group__label">TC No</label>
                {errors.tcNo && <span className="input-error-message">{errors.tcNo.message}</span>}
              </div>
            </div>

            <div className="settings-row">
              <div className="floating-group">
                <input
                  type="text"
                  id="firstName"
                  className={`input ${errors.firstName ? "input--error" : ""}`}
                  placeholder=" "
                  {...register("firstName")}
                />
                <label htmlFor="firstName" className="floating-group__label">Ad</label>
                {errors.firstName && <span className="input-error-message">{errors.firstName.message}</span>}
              </div>
              <div className="floating-group">
                <input
                  type="text"
                  id="lastName"
                  className={`input ${errors.lastName ? "input--error" : ""}`}
                  placeholder=" "
                  {...register("lastName")}
                />
                <label htmlFor="lastName" className="floating-group__label">Soyad</label>
                {errors.lastName && <span className="input-error-message">{errors.lastName.message}</span>}
              </div>
            </div>

            <div className="settings-row">
              <div className="floating-group">
                <select
                  id="locationId"
                  className={`input ${errors.locationId ? "input--error" : ""}`}
                  {...register("locationId")}
                  value={selectedLocationId}
                  onChange={handleLocationChange}
                >
                  <option value="" disabled hidden></option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id.toString()}>{loc.name}</option>
                  ))}
                </select>
                <label htmlFor="locationId" className="floating-group__label">Yerleşke</label>
                {errors.locationId && <span className="input-error-message">{errors.locationId.message}</span>}
              </div>
              <div className="floating-group">
                <select
                  id="unitId"
                  className={`input ${errors.unitId ? "input--error" : ""}`}
                  {...register("unitId")}
                  value={selectedUnitId}
                  disabled={!selectedLocationId}
                >
                  <option value="" disabled hidden></option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id.toString()}>{unit.name}</option>
                  ))}
                </select>
                <label htmlFor="unitId" className="floating-group__label">Birim</label>
                {errors.unitId && <span className="input-error-message">{errors.unitId.message}</span>}
              </div>
            </div>

            <div className="settings-row">
              <div className="floating-group">
                <input 
                  type="date" 
                  id="startDate" 
                  className={`input ${errors.startDate ? "input--error" : ""}`}
                  {...register("startDate")} 
                />
                <label htmlFor="startDate" className="floating-group__label">İşe Giriş</label>
                {errors.startDate && <span className="input-error-message">{errors.startDate.message}</span>}
              </div>
              <div className="floating-group">
                <input 
                  type="date" 
                  id="endDate" 
                  className={`input ${errors.endDate ? "input--error" : ""}`}
                  disabled={watch("isActive")} 
                  {...register("endDate")} 
                />
                <label htmlFor="endDate" className="floating-group__label">İşten Çıkış</label>
                {errors.endDate && <span className="input-error-message">{errors.endDate.message}</span>}
              </div>
            </div>

            <div className="isActive-checkbox">
              <input type="checkbox" id="isActiveCheck" {...register("isActive")} />
              <label htmlFor="isActiveCheck">Çalışmaya devam ediyor mu?</label>
            </div>

            <div className="floating-group flex-full">
              <input 
                type="text" 
                id="ibanNo" 
                className={`input ${errors.ibanNo ? "input--error" : ""}`}
                placeholder=" TR..." 
                {...register("ibanNo")} 
              />
              <label htmlFor="ibanNo" className="floating-group__label">IBAN</label>
              {errors.ibanNo && <span className="input-error-message">{errors.ibanNo.message}</span>}
            </div>

            {apiError && <div className="api-error-alert">{apiError}</div>}

            <div className="modal-form__actions">
              <button type="button" className="btn btn--secondary" onClick={onClose}>Vazgeç</button>
              <button type="submit" className="btn" disabled={isSaving || (!!employee && !isDirty)}>
                {isSaving ? "Kaydediliyor..." : employee ? "Güncelle" : "Kaydet"}
              </button>
            </div>
          </form>
        ) : (
            <div className="upload-box">
              <div className="upload-box__content">
                {!selectedFile ? (
                  <>
                    <FiUploadCloud className="upload-icon" />
                    <h3>Excel Dosyası Yükle</h3>
                    <p>
                      Toplu eklemek istediğiniz öğrenci/çalışan listesini
                      yükleyin.
                    </p>

                    <div className="import-info-banner">
                      <FiInfo />
                      <p>
                        Sistem Excel sütunlarını otomatik tanır.{" "}
                        <strong>
                          TC, Ad Soyad, Yerleşke, İşe Giriş ve IBAN
                        </strong>{" "}
                        sütunları zorunludur. <strong>İşten Çıkış</strong>{" "}
                        sütunu ise isteğe bağlıdır.
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
                    <label
                      htmlFor="excel-upload"
                      className="btn upload-btn"
                    >
                      Dosya Seç
                    </label>
                  </>
                ) : (
                  <div className="selected-file-area">
                    <FiCheckCircle className="file-ready-icon" />
                    <div className="file-info">
                      <span className="file-name">{selectedFile.name}</span>
                      <span className="file-size">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <p className="file-hint" onClick={() => setSelectedFile(null)}>
                      Bu dosyayı değiştirmek için <u>buraya tıklayın</u>.
                    </p>

                    <div className="file-actions">
                      <button
                        className="btn btn--secondary"
                        onClick={() => setSelectedFile(null)}
                      >
                        Vazgeç
                      </button>
                      <button
                        className="btn"
                        onClick={startImport}
                      >
                        İşlemi Başlat
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
        )
      )}
    </div>
  );
};

export default EmployeeModal;
