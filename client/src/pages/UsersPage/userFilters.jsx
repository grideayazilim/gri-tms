export const userFilterConfig = [
  { 
    key: 'role', 
    label: 'Rol', 
    type: 'select', 
    options: [
      { value: 'ADMIN', label: 'Admin' }, 
      { value: 'RESPONSIBLE', label: 'Sorumlu' }
    ], 
    defaultOption: 'Tüm Roller',
    apply: (user, value) => user.role === value
  },
  { 
    key: 'status', 
    label: 'Durum', 
    type: 'select', 
    options: [
      { value: 'ACTIVE', label: 'Aktif' }, 
      { value: 'PENDING', label: 'Onay Bekliyor' }
    ], 
    defaultOption: 'Tüm Durumlar',
    apply: (user, value) => user.status === value
  },
  {
    key: 'location',
    label: 'Yerleşke',
    type: 'select',
    options: [
      { value: 'Merkez Kampüs', label: 'Merkez Kampüs' },
      { value: 'Kuzey Kampüs', label: 'Kuzey Kampüs' }
    ],
    defaultOption: 'Tüm Yerleşkeler',
    apply: (user, value) => user.location === value
  },
  {
    key: 'unit',
    label: 'Birim',
    type: 'select',
    options: [
      { value: 'Bilgisayar Mühendisliği', label: 'Bilgisayar Mühendisliği' },
      { value: 'Yazılım Mühendisliği', label: 'Yazılım Mühendisliği' }
    ],
    defaultOption: 'Tüm Birimler',
    apply: (user, value) => user.unit === value
  },
  { 
    key: 'search', 
    label: 'Kullanıcı Adı Ara', 
    type: 'text',
    apply: (user, value) => user.username.toLowerCase().includes(value.toLowerCase())
  },
];
