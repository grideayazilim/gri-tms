export const getEmployeeFilterConfig = (locations, units) => [
  { 
    key: 'location', 
    label: 'Yerleşke', 
    type: 'select', 
    options: locations, 
    defaultOption: 'Tüm Yerleşkeler',
    apply: (item, value) => item.location === value
  },
  { 
    key: 'unit', 
    label: 'Birim', 
    type: 'select', 
    options: units, 
    defaultOption: 'Tüm Birimler',
    apply: (item, value) => item.unit === value
  },
  { 
    key: 'search', 
    label: 'Çalışan Adı Ara', 
    type: 'text',
    apply: (item, value) => 
      item.name.toLowerCase().includes(value.toLowerCase()) || 
      item.tc.includes(value)
  },
];
