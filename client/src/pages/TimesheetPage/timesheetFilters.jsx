/* ========================================================================
   TIMESHEET FILTERS (PUANTAJ FİLTRE KONFİGÜRASYONU)
   Puantaj sayfasındaki filtre barının (Dönem, Yerleşke, Birim) yapısını tanımlar.
   ======================================================================== */
export const getTimesheetFilterConfig = (periods, locations, units, isAdmin) => {

  const config = [
    {
      key: "period",
      apiParam: "month",
      label: "Dönem",
      type: "select",
      options: periods,
    },
    {
      key: "location",
      apiParam: "locationId",
      label: "Yerleşke",
      type: "select",
      options: locations,
      defaultOption: "Tüm Yerleşkeler",
    },
    {
      key: "unit",
      apiParam: "unitId",
      label: "Birim",
      type: "select",
      options: units,
      defaultOption: "Tüm Birimler",
    },
    {
      key: "search",
      apiParam: "search",
      label: "Çalışan Ara",
      type: "text",
    },
  ];

  if (isAdmin) return config;

  // Sorumlu (RESPONSIBLE) kullanıcılar sadece kendi yerleşke ve birimlerini 
  // görebileceği için "Tüm Yerleşkeler" seçeneğini kaldırıyoruz.
  return config.map((field) => {
    if (field.key === "location" || field.key === "unit") {
      const { defaultOption, ...rest } = field;
      return rest;
    }
    return field;
  });
};

