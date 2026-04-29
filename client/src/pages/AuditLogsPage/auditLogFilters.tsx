import { AUDIT_CATEGORY_LIST } from '@timesheet/shared';
import type { FilterField } from '../../hooks/data/useFilter';

export const auditLogFilterConfig: FilterField[] = [
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
    type: 'text',
  },
];
