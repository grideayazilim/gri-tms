import { AUDIT_EVENT_LIST } from '../../constants/auditEvents';

export const logFilterConfig = [
  { 
    key: 'action', 
    label: 'İşlem Tipi', 
    type: 'select', 
    options: AUDIT_EVENT_LIST.map(e => ({ value: e.code, label: e.label })), 
    defaultOption: 'Tüm İşlemler',
    apply: (log, value) => log.action === value
  },
  { 
    key: 'beforeDate', 
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
    label: 'İşlem Yapan Ara', 
    type: 'text',
    apply: (log, value) => {
      const searchStr = value.toLowerCase();
      const matchUsername = log.actorUsername && log.actorUsername.toLowerCase().includes(searchStr);
      const matchName = log.actorName && log.actorName.toLowerCase().includes(searchStr);
      return matchUsername || matchName;
    }
  },
];
