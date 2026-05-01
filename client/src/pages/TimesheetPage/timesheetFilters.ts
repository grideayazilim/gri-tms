/* ========================================================================
   TIMESHEET FILTERS (PUANTAJ FİLTRE KONFİGÜRASYONU)
   Puantaj sayfasındaki filtre barının (Dönem, Yerleşke, Birim) yapısını tanımlar.
   ======================================================================== */
import type { FilterField } from "../../hooks/data/useFilter";

export const getTimesheetFilterConfig = (
  periods: { value: string; label: string }[],
  locations: { value: string | number; label: string }[],
  units: { value: string | number; label: string }[],
  isAdmin: boolean
): FilterField[] => {
  const config = [
    {
      key: "period",
      apiParam: "month",
      label: "Dönem",
      type: "select" as const,
      options: periods,
    },
    {
      key: "location",
      apiParam: "locationId",
      label: "Yerleşke",
      type: "select" as const,
      options: locations,
      defaultOption: "Tüm Yerleşkeler",
    },
    {
      key: "unit",
      apiParam: "unitId",
      label: "Birim",
      type: "select" as const,
      options: units,
      defaultOption: "Tüm Birimler",
    },
    {
      key: "search",
      apiParam: "search",
      label: "Çalışan Ara",
      type: "text" as const,
    },
  ] as any;

  if (isAdmin) return config;

  // Sorumlu (RESPONSIBLE) kullanıcılar sadece kendi yerleşke ve birimlerini 
  // görebileceği için "Tüm Yerleşkeler" seçeneğini kaldırıyoruz.
  return config.map((field) => {
    if (field.key === "location" || field.key === "unit") {
      const { defaultOption, ...rest } = field as any;
      return rest as FilterField;
    }
    return field as FilterField;
  });
};

