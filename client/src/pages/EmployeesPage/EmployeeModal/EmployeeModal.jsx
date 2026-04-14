import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { employeeSchema } from "../../../schemas/employee.schema";
import { useLocationsAndUnits } from "../../../hooks/data/useLocationsAndUnits";
import { FiUploadCloud } from "react-icons/fi";
import "./EmployeeModal.scss";

const EmployeeModal = ({ employee, onClose, onSave }) => {
  const [currentMode, setCurrentMode] = useState("SINGLE");
  const [apiError, setApiError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

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

  // Modal ilk açıldığında yerleşkeleri getir
  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Edit modunda modal açıldığında, kullanıcının mevcut yerleşkesinin birimlerini önceden yükle
  useEffect(() => {
    if (employee?.unit?.location?.id) {
      fetchUnitsByLocation(employee.unit.location.id);
    }
  }, [employee, fetchUnitsByLocation]);

  // "Yerleşke" dropdown'u değiştiğinde çalışacak özel onChange fonksiyonu.
  // Bu sayede sadece KULLANICI seçimi değiştirdiğinde unitId sıfırlanır,
  // hook-form'un kendi setValue'su veya ilk render tetiklenmesinde sıfırlanmaz.
  const handleLocationChange = (e) => {
    const locId = e.target.value;
    setValue("locationId", locId, { shouldDirty: true });
    // Yerleşke değiştiği için seçili birimi sıfırla
    setValue("unitId", "", { shouldDirty: true });

    if (locId) {
      fetchUnitsByLocation(locId);
    }
  };

  const onSubmit = async (data) => {
    setApiError(null);
    setIsSaving(true);
    try {
      // Backend'in beklediği temiz payload'u oluştur (özellikle unitId integer gitmeli)
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

  const handleFileUpload = (e) => {
    console.log("File selected:", e.target.files[0]);
  };

  return (
    <div className="employee-modal">
      {!employee && (
        <div className="employee-modal__tabs">
          <button
            type="button"
            className={`tab-btn ${currentMode === "SINGLE" ? "active" : ""}`}
            onClick={() => setCurrentMode("SINGLE")}
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
                // Standart register yerine onChange'i kendimiz yönetiyoruz:
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

          <div style={{ marginBottom: "16px", display: "flex", gap: "8px", alignItems: "center", cursor: "pointer", color: "var(--text-secondary)", fontSize: "14px" }}>
            <input
              type="checkbox"
              id="isActiveCheck"
              {...register("isActive")}
              style={{ width: "16px", height: "16px", cursor: "pointer" }}
            />
            <label htmlFor="isActiveCheck" style={{ cursor: "pointer" }}>Çalışmaya devam ediyor mu?</label>
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

          {/* API Hatası */}
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
        <div className="bulk-upload-section">
          <div className="upload-box">
            <FiUploadCloud className="upload-icon" />
            <h3>Excel Dosyası Yükle</h3>
            <p>
              Çalışan listesini şablona uygun bir Excel (.xlsx, .xls) dosyası
              olarak yükleyin.
            </p>
            <input
              type="file"
              id="excel-upload"
              accept=".xlsx, .xls"
              className="file-input-hidden"
              onChange={handleFileUpload}
            />
            <label
              htmlFor="excel-upload"
              className="btn btn--primary upload-btn"
            >
              Dosya Seç
            </label>
          </div>
          <div className="template-download">
            <a href="#" className="link-text">
              Örnek Excel Şablonunu İndir
            </a>
          </div>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeModal;
