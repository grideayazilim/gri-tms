/* ========================================================================
   AUDIT LOG SERVICE (DENETİM KAYITLARI SERVİSİ)
   İşlem geçmişi listeleme.
   ======================================================================== */
import { api } from './httpClient';


export const getAuditLogs = async (params = {}) => {
  const response = await api.get('/audit-logs', { params });
  return response;
};