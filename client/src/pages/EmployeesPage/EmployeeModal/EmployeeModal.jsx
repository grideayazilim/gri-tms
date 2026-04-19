import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { employeeSchema } from "../../../schemas/employee.schema";
import { useLocationsAndUnits } from "../../../hooks/data/useLocationsAndUnits";
import { FiUploadCloud, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import * as XLSX from "xlsx";
import * as importService from "../../../api/importService";
import "./EmployeeModal.scss";

// ── Sabit listeler ─────────────────────────────────────────────────────────────
const TURKISH_MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from(
  { length: currentYear - 2019 },
  (_, i) => currentYear - i,
);

// ── Yardımcı: Excel serial / Date → 'YYYY-MM-DD' ──────────────────────────────
function excelDateToStr(val) {
  if (!val) return "";
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof val === "number") {
    // xlsx serial number → JS Date (UTC)
    const epoch = new Date(Date.UTC(1899, 11, 30) + val * 86400000);
    const y = epoch.getUTCFullYear();
    const m = String(epoch.getUTCMonth() + 1).padStart(2, "0");
    const d = String(epoch.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  return "";
}

// ── Yardımcı: sekme adını esnek bul (Türkçe karakter farklarına karşı) ──────────
function findSheet(wb, ...candidates) {
  for (const name of candidates) {
    if (wb.Sheets[name]) return wb.Sheets[name];
  }
  // 2. yol: normalize karşılaştırma
  const lower = candidates.map((c) => c.toLowerCase());
  const found = wb.SheetNames.find((n) => lower.includes(n.toLowerCase()));
  return found ? wb.Sheets[found] : null;
}

// ── Yardımcı: Excel dosyasını parse et ────────────────────────────────────────
function parseExcel(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: "array", cellDates: true });

  console.log("[Import] Sekmeler:", wb.SheetNames);

  // Sekme adlarını esnek bul — Türkçe İ/i kodlama farkına karşı
  const infoSheet = findSheet(
    wb,
    "İşçi Bilgileri",
    "Isci Bilgileri",
    "işçi bilgileri",
  );
  const puantajSheet = findSheet(wb, "Puantaj", "puantaj");
  const verilerSheet = findSheet(
    wb,
    "VERİLER",
    "VERILER",
    "Veriler",
    "veriler",
  );

  if (!infoSheet)
    throw new Error(
      '"İşçi Bilgileri" sekmesi bulunamadı. Mevcut sekmeler: ' +
        wb.SheetNames.join(", "),
    );
  if (!puantajSheet)
    throw new Error(
      '"Puantaj" sekmesi bulunamadı. Mevcut sekmeler: ' +
        wb.SheetNames.join(", "),
    );

  // Orijinal şablonda: A4="GÜNLÜK ÜCRET", B4=değer
  // Export şablonunda (excelHandler): C5'e yazılır
  let dailyWage = null;
  if (verilerSheet) {
    const verilerRows = XLSX.utils.sheet_to_json(verilerSheet, {
      header: 1,
      defval: "",
      raw: true,
    });
    // Yöntem 1: "GÜNLÜK ÜCRET" etiketini A sütununda ara → B sütununu oku
    for (const row of verilerRows) {
      const label = String(row[0] || "")
        .toUpperCase()
        .trim();
      if (
        label.includes("GÜNLÜK ÜCRET") ||
        (label.includes("GÜNLÜK") && label.includes("ÜCRET"))
      ) {
        const val = parseFloat(row[1]);
        if (!isNaN(val) && val > 0) {
          dailyWage = val;
          break;
        }
      }
    }
    // Yöntem 2: export şablonu C5'e yazar — fallback
    if (dailyWage === null) {
      const c5 = verilerSheet["C5"]?.v;
      const parsed = parseFloat(c5);
      if (!isNaN(parsed) && parsed > 0) dailyWage = parsed;
    }
    console.log("[Import] Günlük ücret:", dailyWage);
  } else {
    console.warn("[Import] VERİLER sekmesi bulunamadı, günlük ücret alınamadı");
  }

  const infoRows = XLSX.utils.sheet_to_json(infoSheet, {
    header: 1,
    defval: "",
    raw: true,
  });
  const puantajRows = XLSX.utils.sheet_to_json(puantajSheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  console.log("[Import] İşçi Bilgileri toplam satır:", infoRows.length);
  console.log("[Import] Puantaj toplam satır:", puantajRows.length);

  // ── Çalışanları parse et ────────────────────────────────────────────────────
  // İşçi Bilgileri: satır 2'den (index 1), TC boşsa dur
  //   A=0(sıra) B=1(Ad Soyad) C=2 D=3(TC) E=4(Birim) F=5(IBAN) G=6 H=7 I=8(Giriş) J=9(Çıkış)
  //
  // Puantaj: satır 9'dan (index 8) — i. çalışan (i=1) → index 7+i = 8
  //   Gün d (1-31) → sütun index d+2 (D=3 for d=1, ..., AH=33 for d=31)
  const employees = [];

  for (let i = 1; i < infoRows.length; i++) {
    const infoRow = infoRows[i];
    const tcRaw = String(infoRow[3] || "").trim();
    if (!tcRaw) break;

    const fullName = String(infoRow[1] || "").trim();
    const nameParts = fullName.split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Puantaj'da aynı sıra numaralı satır
    const puantajRowIdx = 7 + i; // i=1→8, i=2→9, …
    const puantajRow = puantajRows[puantajRowIdx] || [];

    // Gün işaretleri
    const rawMarkers = {};
    for (let d = 1; d <= 31; d++) {
      const cellVal = String(puantajRow[d + 2] || "").trim();
      if (cellVal) rawMarkers[d] = cellVal;
    }

    const markerCount = Object.keys(rawMarkers).length;
    console.log(
      `[Import] Çalışan ${i}: ${fullName} TC:${tcRaw} — ${markerCount} işaret, puantaj satır index:${puantajRowIdx}`,
    );
    if (markerCount > 0) console.log("  İşaretler:", rawMarkers);

    employees.push({
      firstName,
      lastName,
      tcNo: tcRaw,
      unitName: String(infoRow[4] || "").trim(),
      ibanNo: String(infoRow[5] || "").trim(),
      startDate: excelDateToStr(infoRow[8]),
      endDate: excelDateToStr(infoRow[9]),
      rawMarkers,
    });
  }

  if (employees.length === 0) {
    throw new Error(
      '"İşçi Bilgileri" sekmesinde çalışan verisi bulunamadı (D sütununda TC No bekleniyor)',
    );
  }

  console.log(
    `[Import] Toplam ${employees.length} çalışan parse edildi, günlük ücret: ${dailyWage}`,
  );
  return { employees, dailyWage };
}

// ── Ana bileşen ────────────────────────────────────────────────────────────────
const EmployeeModal = ({ employee, onClose, onSave }) => {
  const [currentMode, setCurrentMode] = useState("SINGLE");
  const [apiError, setApiError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Bulk import state
  const [importLocationId, setImportLocationId] = useState("");
  const [importYear, setImportYear] = useState(currentYear);
  const [importMonth, setImportMonth] = useState(new Date().getMonth() + 1);
  const [importStatus, setImportStatus] = useState("idle"); // idle | importing | done
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
  });
  const [importErrors, setImportErrors] = useState([]);
  const [importSuccessCount, setImportSuccessCount] = useState(0);
  const fileInputRef = useRef(null);

  const { locations, units, fetchLocations, fetchUnitsByLocation } =
    useLocationsAndUnits();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
    reset,
  } = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      tcNo: employee?.tcNo ?? "",
      firstName: employee?.firstName ?? "",
      lastName: employee?.lastName ?? "",
      locationId: employee?.unit?.location?.id?.toString() ?? "",
      unitId: employee?.unit?.id?.toString() ?? "",
      startDate: employee?.startDate ? employee.startDate.slice(0, 10) : "",
      endDate: employee?.endDate ? employee.endDate.slice(0, 10) : "",
      ibanNo: employee?.ibanNo ?? "",
      isActive: employee?.isActive ?? true,
    },
  });

  const selectedLocationId = watch("locationId");

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    if (employee?.unit?.location?.id) {
      fetchUnitsByLocation(employee.unit.location.id);
    }
  }, [employee, fetchUnitsByLocation]);

  const handleLocationChange = (e) => {
    const locId = e.target.value;
    setValue("locationId", locId, { shouldDirty: true });
    setValue("unitId", "", { shouldDirty: true });
    if (locId) fetchUnitsByLocation(locId);
  };

  const onSubmit = async (data) => {
    setApiError(null);
    setIsSaving(true);
    try {
      const payload = {
        tcNo: data.tcNo,
        firstName: data.firstName,
        lastName: data.lastName,
        unitId: data.unitId,
        startDate: data.startDate,
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

  // ── Bulk: dosya seçildiğinde import başlat ────────────────────────────────
  const handleFileUpload = async (e) => {
    console.log("[Import] handleFileUpload tetiklendi");
    const file = e.target.files?.[0];
    if (!file) {
      console.log("[Import] Dosya seçilmedi");
      return;
    }
    console.log("[Import] Dosya:", file.name, "Boyut:", file.size);
    // input'u sıfırla (aynı dosyanın tekrar seçilebilmesi için)
    e.target.value = "";

    if (!importLocationId) {
      alert("Lütfen önce bir yerleşke seçin.");
      return;
    }

    const selectedLocation = locations.find(
      (l) => String(l.id) === String(importLocationId),
    );
    const locationName = selectedLocation?.name || "";
    console.log(
      "[Import] Yerleşke:",
      locationName,
      "id:",
      importLocationId,
      "Dönem:",
      importYear,
      "/",
      importMonth,
    );

    setImportStatus("importing");
    setImportProgress({ current: 0, total: 0 });
    setImportErrors([]);
    setImportSuccessCount(0);

    try {
      // 1) Client-side parse
      const arrayBuffer = await file.arrayBuffer();
      console.log("[Import] ArrayBuffer alındı, parse başlıyor...");
      const { employees, dailyWage } = parseExcel(arrayBuffer);
      console.log(
        "[Import] Parse tamamlandı — çalışan sayısı:",
        employees.length,
        "günlük ücret:",
        dailyWage,
      );

      setImportProgress({ current: 0, total: employees.length });

      let createdCount = 0;
      let skippedCount = 0;
      const errors = [];
      // Puantaj TIMESHEET audit logu için — işaret girilmiş çalışanlar
      const timesheetChanges = [];

      // 2) Her çalışan için API çağrısı
      for (let idx = 0; idx < employees.length; idx++) {
        const emp = employees[idx];

        // Gün numaralarını (1-31) YYYY-MM-DD formatına çevir
        const markers = {};
        for (const [day, code] of Object.entries(emp.rawMarkers)) {
          const dayNum = parseInt(day, 10);
          const dateStr = `${importYear}-${String(importMonth).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
          markers[dateStr] = code;
        }

        try {
          const res = await importService.importEmployee({
            tcNo: emp.tcNo,
            firstName: emp.firstName,
            lastName: emp.lastName,
            unitName: emp.unitName,
            ibanNo: emp.ibanNo,
            startDate: emp.startDate,
            endDate: emp.endDate,
            locationId: importLocationId,
            year: importYear,
            month: importMonth,
            markers,
          });
          const daysCount = Object.keys(markers).length;
          console.log(
            `[Import] ${emp.firstName} ${emp.lastName} → action:`,
            res?.data?.action,
            "markers:",
            daysCount,
          );
          if (res?.data?.action === "created") createdCount++;
          else skippedCount++;
          if (daysCount > 0) {
            timesheetChanges.push({
              name: `${emp.firstName} ${emp.lastName}`,
              daysCount,
            });
          }
        } catch (err) {
          console.error(`[Import] ${emp.firstName} ${emp.lastName} HATA:`, err);
          errors.push({
            name: `${emp.firstName} ${emp.lastName}`,
            tcNo: emp.tcNo,
            error: err?.message || "Bilinmeyen hata",
          });
        }

        setImportProgress({ current: idx + 1, total: employees.length });
      }

      // 3) Finalize: günlük ücret güncelle + audit log oluştur
      try {
        await importService.finalizeImport({
          locationId: importLocationId,
          locationName,
          year: importYear,
          month: importMonth,
          createdCount,
          skippedCount,
          dailyWage: dailyWage ?? null,
          timesheetChanges,
        });
      } catch {
        // finalize hatası ana akışı etkilemesin
      }

      const successCount = createdCount + skippedCount;

      setImportSuccessCount(successCount);
      setImportErrors(errors);
      setImportStatus("done");
    } catch (parseError) {
      console.error("[Import] KRİTİK HATA:", parseError);
      setImportErrors([
        {
          name: "—",
          tcNo: "—",
          error: parseError.message || String(parseError),
        },
      ]);
      setImportStatus("done");
    }
  };

  const resetImport = () => {
    setImportStatus("idle");
    setImportProgress({ current: 0, total: 0 });
    setImportErrors([]);
    setImportSuccessCount(0);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="employee-modal">
      {!employee && (
        <div className="employee-modal__tabs">
          <button
            type="button"
            className={`tab-btn ${currentMode === "SINGLE" ? "active" : ""}`}
            onClick={() => {
              setCurrentMode("SINGLE");
              resetImport();
            }}
          >
            Tekli Giriş
          </button>
          <button
            type="button"
            className={`tab-btn ${currentMode === "BULK" ? "active" : ""}`}
            onClick={() => setCurrentMode("BULK")}
          >
            Toplu Giriş
          </button>
        </div>
      )}

      {currentMode === "SINGLE" ? (
        /* ── TEKLİ GİRİŞ ── */
        <form className="modal-form" onSubmit={handleSubmit(onSubmit)}>
          {/* TC No */}
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
              <label htmlFor="tcNo" className="floating-group__label">
                TC No
              </label>
              {errors.tcNo && (
                <span className="input-error-message">
                  {errors.tcNo.message}
                </span>
              )}
            </div>
          </div>

          {/* Ad + Soyad */}
          <div className="settings-row">
            <div className="floating-group">
              <input
                type="text"
                id="firstName"
                className={`input ${errors.firstName ? "input--error" : ""}`}
                placeholder=" "
                {...register("firstName")}
              />
              <label htmlFor="firstName" className="floating-group__label">
                Ad
              </label>
              {errors.firstName && (
                <span className="input-error-message">
                  {errors.firstName.message}
                </span>
              )}
            </div>
            <div className="floating-group">
              <input
                type="text"
                id="lastName"
                className={`input ${errors.lastName ? "input--error" : ""}`}
                placeholder=" "
                {...register("lastName")}
              />
              <label htmlFor="lastName" className="floating-group__label">
                Soyad
              </label>
              {errors.lastName && (
                <span className="input-error-message">
                  {errors.lastName.message}
                </span>
              )}
            </div>
          </div>

          {/* Yerleşke + Birim */}
          <div className="settings-row">
            <div className="floating-group">
              <select
                id="locationId"
                className={`input ${errors.locationId ? "input--error" : ""}`}
                {...register("locationId")}
                onChange={handleLocationChange}
              >
                <option value="" disabled hidden></option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id.toString()}>
                    {loc.name}
                  </option>
                ))}
              </select>
              <label htmlFor="locationId" className="floating-group__label">
                Yerleşke
              </label>
              {errors.locationId && (
                <span className="input-error-message">
                  {errors.locationId.message}
                </span>
              )}
            </div>
            <div className="floating-group">
              <select
                id="unitId"
                className={`input ${errors.unitId ? "input--error" : ""}`}
                {...register("unitId")}
                disabled={!selectedLocationId}
              >
                <option value="" disabled hidden></option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id.toString()}>
                    {unit.name}
                  </option>
                ))}
              </select>
              <label htmlFor="unitId" className="floating-group__label">
                Birim
              </label>
              {errors.unitId && (
                <span className="input-error-message">
                  {errors.unitId.message}
                </span>
              )}
            </div>
          </div>

          {/* İşe Giriş + İşten Çıkış */}
          <div className="settings-row">
            <div className="floating-group">
              <input
                type="date"
                id="startDate"
                className={`input ${errors.startDate ? "input--error" : ""}`}
                placeholder=" "
                {...register("startDate")}
              />
              <label htmlFor="startDate" className="floating-group__label">
                İşe Giriş
              </label>
              {errors.startDate && (
                <span className="input-error-message">
                  {errors.startDate.message}
                </span>
              )}
            </div>
            <div className="floating-group">
              <input
                type="date"
                id="endDate"
                className={`input ${errors.endDate ? "input--error" : ""}`}
                placeholder=" "
                disabled={watch("isActive")}
                {...register("endDate")}
              />
              <label htmlFor="endDate" className="floating-group__label">
                İşten Çıkış
              </label>
              {errors.endDate && (
                <span className="input-error-message">
                  {errors.endDate.message}
                </span>
              )}
            </div>
          </div>

          <div
            style={{
              marginBottom: "16px",
              display: "flex",
              gap: "8px",
              alignItems: "center",
              cursor: "pointer",
              color: "var(--text-secondary)",
              fontSize: "14px",
            }}
          >
            <input
              type="checkbox"
              id="isActiveCheck"
              {...register("isActive")}
              style={{ width: "16px", height: "16px", cursor: "pointer" }}
            />
            <label htmlFor="isActiveCheck" style={{ cursor: "pointer" }}>
              Çalışmaya devam ediyor mu?
            </label>
          </div>

          {/* IBAN */}
          <div className="floating-group flex-full">
            <input
              type="text"
              id="ibanNo"
              className={`input ${errors.ibanNo ? "input--error" : ""}`}
              placeholder=" TR..."
              {...register("ibanNo")}
            />
            <label htmlFor="ibanNo" className="floating-group__label">
              IBAN
            </label>
            {errors.ibanNo && (
              <span className="input-error-message">
                {errors.ibanNo.message}
              </span>
            )}
          </div>

          {apiError && (
            <div
              style={{
                color: "#dc2626",
                fontSize: "13px",
                marginTop: "8px",
                padding: "8px 12px",
                background: "rgba(239,68,68,0.08)",
                borderRadius: "6px",
              }}
            >
              {apiError}
            </div>
          )}

          <div
            className="modal-form__actions"
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "8px",
              marginTop: "24px",
            }}
          >
            <button type="button" className="btn" onClick={onClose}>
              Vazgeç
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={isSaving || (employee ? !isDirty : false)}
            >
              {isSaving ? "Kaydediliyor..." : employee ? "Güncelle" : "Kaydet"}
            </button>
          </div>
        </form>
      ) : (
        /* ── TOPLU GİRİŞ ── */
        <div className="bulk-upload-section">
          {/* Dönem + Yerleşke Seçimi */}
          <div className="bulk-selectors">
            <div className="bulk-selectors__row">
              <div className="floating-group">
                <select
                  className="input"
                  value={importLocationId}
                  onChange={(e) => {
                    setImportLocationId(e.target.value);
                    resetImport();
                  }}
                  disabled={importStatus === "importing"}
                >
                  <option value="" disabled hidden></option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
                <label className="floating-group__label">Yerleşke</label>
              </div>

              <div className="floating-group">
                <select
                  className="input"
                  value={importYear}
                  onChange={(e) => {
                    setImportYear(Number(e.target.value));
                    resetImport();
                  }}
                  disabled={importStatus === "importing"}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <label className="floating-group__label">Yıl</label>
              </div>

              <div className="floating-group">
                <select
                  className="input"
                  value={importMonth}
                  onChange={(e) => {
                    setImportMonth(Number(e.target.value));
                    resetImport();
                  }}
                  disabled={importStatus === "importing"}
                >
                  {TURKISH_MONTHS.map((m, i) => (
                    <option key={i + 1} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <label className="floating-group__label">Ay</label>
              </div>
            </div>
          </div>

          {/* Kriterler + Upload kutusu */}
          {importStatus === "idle" && (
            <>
              <div className="upload-box">
                <FiUploadCloud className="upload-icon" />
                <h3>Excel Dosyası Yükle</h3>
                <p>
                  Yukarıdan yerleşke ve dönemi seçtikten sonra ilgili Excel
                  dosyasını yükleyin. Sistem dosyayı otomatik okuyarak
                  çalışanları, puantaj işaretlerini ve günlük ücreti aktarır.
                </p>

                {/* Kriterler */}
                <ul className="import-criteria">
                  <li>
                    Dosya, sistemden dışa aktarılan{" "}
                    <strong>puantaj şablonu</strong> (.xlsx) formatında
                    olmalıdır.
                  </li>
                  <li>
                    <strong>"İşçi Bilgileri"</strong> sekmesindeki çalışanlar
                    sisteme aktarılır. Aynı TC No'ya sahip çalışanlar tekrar
                    eklenmez; yalnızca puantaj bilgileri güncellenir.
                  </li>
                  <li>
                    <strong>"Puantaj"</strong> sekmesindeki günlük işaretler (
                    <strong>X</strong> = Çalışıldı, <strong>İ</strong> = İzin,{" "}
                    <strong>R</strong> = Rapor vb.) seçilen dönem için puantaj
                    tablosuna yansıtılır.
                  </li>
                  <li>
                    <strong>"VERİLER"</strong> sekmesindeki günlük ücret
                    bilgisi, Ayarlar sayfasındaki günlük ödenek değerini
                    otomatik olarak günceller.
                  </li>
                  <li>
                    Her çalışan için <strong>TC No zorunludur</strong>. Birim
                    adı, seçili yerleşkedeki birimlerden biriyle eşleşmelidir;
                    eşleşme sağlanamazsa çalışan mevcut birimine atanır.
                  </li>
                </ul>

                <input
                  ref={fileInputRef}
                  type="file"
                  id="excel-upload"
                  accept=".xlsx,.xls"
                  className="file-input-hidden"
                  onChange={handleFileUpload}
                  disabled={!importLocationId}
                />
                <label
                  htmlFor="excel-upload"
                  className={`btn btn--primary upload-btn ${!importLocationId ? "btn--disabled" : ""}`}
                  title={!importLocationId ? "Önce yerleşke seçin" : ""}
                >
                  Dosya Seç ve Aktar
                </label>
                {!importLocationId && (
                  <p className="import-hint">
                    Dosya seçmek için önce yerleşke seçin.
                  </p>
                )}
              </div>
            </>
          )}

          {/* İlerleme Çubuğu */}
          {importStatus === "importing" && (
            <div className="import-progress-area">
              <div className="import-progress__header">
                <span className="import-progress__label">Aktarılıyor...</span>
                <span className="import-progress__count">
                  {importProgress.current} / {importProgress.total}
                </span>
              </div>
              <div className="import-progress__bar-track">
                <div
                  className="import-progress__bar-fill"
                  style={{
                    width:
                      importProgress.total > 0
                        ? `${(importProgress.current / importProgress.total) * 100}%`
                        : "0%",
                  }}
                />
              </div>
            </div>
          )}

          {/* Sonuç */}
          {importStatus === "done" && (
            <div className="import-result">
              <div
                className={`import-result__summary ${importErrors.length === 0 ? "import-result__summary--success" : "import-result__summary--partial"}`}
              >
                <FiCheckCircle className="import-result__icon" />
                <span>
                  <strong>{importSuccessCount}</strong> çalışan başarıyla
                  aktarıldı
                  {importErrors.length > 0 && (
                    <>
                      , <strong>{importErrors.length}</strong> çalışan
                      aktarılamadı
                    </>
                  )}
                  .
                </span>
              </div>

              {importErrors.length > 0 && (
                <div className="import-errors">
                  <p className="import-errors__title">
                    <FiAlertCircle /> Aktarılamayan Çalışanlar
                  </p>
                  <ul className="import-errors__list">
                    {importErrors.map((err, i) => (
                      <li key={i} className="import-errors__item">
                        <span className="import-errors__name">{err.name}</span>
                        {err.tcNo !== "—" && (
                          <span className="import-errors__tc">
                            TC: {err.tcNo}
                          </span>
                        )}
                        <span className="import-errors__msg">{err.error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                type="button"
                className="btn btn--outline import-result__again-btn"
                onClick={resetImport}
              >
                Yeni Dosya Aktar
              </button>
            </div>
          )}

          <div
            className="modal-form__actions"
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "8px",
              marginTop: "24px",
            }}
          >
            <button
              type="button"
              className="btn"
              onClick={onClose}
              disabled={importStatus === "importing"}
            >
              {importStatus === "done" ? "Kapat" : "Vazgeç"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeModal;
