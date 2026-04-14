export const getTimesheetFilterConfig = (periods, locations, units) => [
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
