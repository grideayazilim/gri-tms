/* ========================================================================
   TIMESHEET FILTERS (PUANTAJ FİLTRE KONFİGÜRASYONU)
   Puantaj sayfasındaki filtre barının (Dönem, Yerleşke, Birim) yapısını tanımlar.
   ======================================================================== */
import type { FilterField, SelectField } from "../../hooks/data/useFilter";

export const getTimesheetFilterConfig = (
  periods: { value: string; label: string }[],
  locations: { value: string | number; label: string }[],
  units: { value: string | number; label: string }[],
  isAdmin: boolean
): FilterField[] => {
  const config: FilterField[] = [
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
      options: locations.map(l => ({ value: String(l.value), label: l.label })),
      defaultOption: "Tüm Yerleşkeler",
    },
    {
      key: "unit",
      apiParam: "unitId",
      label: "Birim",
      type: "select" as const,
      options: units.map(u => ({ value: String(u.value), label: u.label })),
      defaultOption: "Tüm Birimler",
    },
    {
      key: "search",
      apiParam: "search",
      label: "Çalışan Ara",
      type: "text" as const,
    },
  ];

  if (isAdmin) return config;

  // Sorumlu (RESPONSIBLE) kullanıcılar sadece kendi yerleşke ve birimlerini
  // görebileceği için "Tüm Yerleşkeler" seçeneğini kaldırıyoruz.
  return config.map((field): FilterField => {
    if ((field.key === "location" || field.key === "unit") && field.type === "select") {
      const { defaultOption: _defaultOption, ...rest } = field as SelectField;
      return rest;
    }
    return field;
  });
};
