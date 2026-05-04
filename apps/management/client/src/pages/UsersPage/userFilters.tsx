import { USER_ROLE, USER_STATUS } from '@timesheet/shared';
import type { FilterField } from '../../hooks/data/useFilter';

export const userFilterConfig = (
  locations: { label: string; value: string }[],
  units: { label: string; value: string }[]
): FilterField[] => [
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
      { value: USER_ROLE.ADMIN, label: 'Admin' },
      { value: USER_ROLE.RESPONSIBLE, label: 'Sorumlu' },
    ],
    defaultOption: 'Tüm Roller',
  },
  {
    key: 'status',
    apiParam: 'status',
    label: 'Durum',
    type: 'select',
    options: [
      { value: USER_STATUS.ACTIVE, label: 'Aktif' },
      { value: USER_STATUS.PENDING, label: 'Onay Bekliyor' },
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
