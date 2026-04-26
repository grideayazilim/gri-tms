/* ========================================================================
   AUDIT LOG FILTERS (SİSTEM LOGLARI FİLTRELERİ)
   Geçmişe dönük işlem kayıtlarını filtrelemek için kullanılan konfigürasyon.
   ======================================================================== */
import { AUDIT_CATEGORY_LIST } from '@timesheet/shared';

export const auditLogFilterConfig = [

  {
    key: 'category',
    apiParam: 'category',
    label: 'Kategori',
    type: 'select',
    options: AUDIT_CATEGORY_LIST.map((c) => ({ value: c.code, label: c.label })),
    defaultOption: 'Tüm Kategoriler',
  },
  {
    key: 'beforeDate',
    apiParam: 'endDate',
    label: 'Şu Tarihten Önce',
    type: 'date',
  },
  {
    key: 'searchActor',
    apiParam: 'actor',
    label: 'İşlem Yapan Ara',
    // İşlemi gerçekleştiren admin/sorumlu ismine göre arama yapar
    type: 'text',
  },
];

