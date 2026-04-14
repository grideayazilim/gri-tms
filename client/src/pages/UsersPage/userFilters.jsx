export const userFilterConfig = (locations, units) => [
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
    key: 'role',
    apiParam: 'role',
    label: 'Rol',
    type: 'select',
    options: [
      { value: 'ADMIN', label: 'Admin' },
      { value: 'RESPONSIBLE', label: 'Sorumlu' }
    ],
    defaultOption: 'Tüm Roller',
  },
  {
    key: 'status',
    apiParam: 'status',
    label: 'Durum',
    type: 'select',
    options: [
      { value: 'ACTIVE', label: 'Aktif' },
      { value: 'PENDING', label: 'Onay Bekliyor' }
    ],
    defaultOption: 'Tüm Durumlar',
  },
  {
    key: 'search',
    apiParam: 'search',
    label: 'Kullanıcı Ara',
    type: 'text',
  },
];
