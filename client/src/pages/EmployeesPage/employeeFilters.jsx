export const getEmployeeFilterConfig = (locations, units) => [
  { 
    key: 'locationName', 
    label: 'Yerleşke', 
    type: 'select', 
    options: locations,
    defaultOption: 'Tüm Yerleşkeler',
    // Client-side apply for instant filtering
    apply: (item, value) => item.unit?.location?.name === value,
  },
  { 
    key: 'unitName', 
    label: 'Birim', 
    type: 'select', 
    options: units,
    defaultOption: 'Tüm Birimler',
    apply: (item, value) => item.unit?.name === value,
  },
  { 
    key: 'search', 
    label: 'Çalışan Ara', 
    type: 'text',
    apply: (item, value) => {
      const fullName = `${item.firstName} ${item.lastName}`.toLowerCase();
      return (
        fullName.includes(value.toLowerCase()) ||
        (item.tcNo || '').includes(value)
      );
    },
  },
];
