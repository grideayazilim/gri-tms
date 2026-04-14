export const getEmployeeFilterConfig = (locations, units) => [
  {
    key: 'locationId',
    apiParam: 'locationId',
    label: 'Yerleşke',
    type: 'select',
    options: locations,
    defaultOption: 'Tüm Yerleşkeler',
  },
  {
    key: 'unitId',
    apiParam: 'unitId',
    label: 'Birim',
    type: 'select',
    options: units,
    defaultOption: 'Tüm Birimler',
  },
  {
    key: 'status',
    apiParam: 'status',
    label: 'Durum',
    type: 'select',
    options: [
      { label: "Devam edenler", value: "active" },
      { label: "İşten çıkarılanlar", value: "inactive" },
    ],
    defaultOption: 'Tüm durumlar',
  },
  {
    key: 'search',
    apiParam: 'search',
    label: 'Çalışan Ara',
    type: 'text',
  },
];
