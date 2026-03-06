import { AUDIT_EVENT_LIST } from '../../constants/auditEvents';

export const auditLogFilterConfig = [
  { 
    key: 'action', 
    apiParam: 'eventType',
    label: 'İşlem Tipi', 
    type: 'select', 
    options: AUDIT_EVENT_LIST.map(e => ({ value: e.code, label: e.label })), 
    defaultOption: 'Tüm İşlemler',
    apply: (log, value) => log.eventType === value
  },
  { 
    key: 'beforeDate', 
    apiParam: 'endDate',
    label: 'Şu Tarihten Önce', 
    type: 'date',
    apply: (log, value) => {
      const logDate = new Date(log.createdAt).getTime();
      const filterDate = new Date(value).getTime();
      return logDate <= filterDate;
    }
  },
  { 
    key: 'searchActor', 
    apiParam: 'username',
    label: 'İşlem Yapan Ara', 
    type: 'text',
    apply: (log, value) => {
      const searchStr = value.toLowerCase();
      const matchUsername = log.username && log.username.toLowerCase().includes(searchStr);
      return matchUsername;
    }
  },
];
