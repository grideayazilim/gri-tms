/* ========================================================================
   EMPLOYEE FILTERS (ÇALIŞAN FİLTRE KONFİGÜRASYONU)
   Çalışan listesi sayfasındaki filtre barının yapısını tanımlar.
   ======================================================================== */
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
    // Ad, Soyad veya TC No ile arama yapar
    type: 'text',
  },
];

