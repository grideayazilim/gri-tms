import { z } from 'zod';
import { AUDIT_ACTION, AUDIT_CATEGORIES, AUDIT_ENTITY_TYPE } from '../constants/auditEventTypes';

export const auditLogQuerySchema = z.object({
  actor: z.string().optional(),
  action: z.enum(Object.values(AUDIT_ACTION) as [string, ...string[]]).optional(),
  category: z.enum(Object.keys(AUDIT_CATEGORIES) as [string, ...string[]]).optional(),
  entityType: z.enum(Object.values(AUDIT_ENTITY_TYPE) as [string, ...string[]]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.preprocess((v) => Number(v) || 1, z.number().min(1)).optional(),
  limit: z.preprocess((v) => Number(v) || 50, z.number().min(1).max(100)).optional(),
});

export type AuditLogQueryType = z.infer<typeof auditLogQuerySchema>;
