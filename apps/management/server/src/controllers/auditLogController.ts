/* ========================================================================
   AUDIT LOG CONTROLLER (DENETİM KAYITLARI KONTROLCÜSÜ)
   Sistemde yapılan tüm işlemlerin geçmişini filtreleyerek listeler.
   ======================================================================== */
import type { Request, Response } from 'express';
import { db } from '../config/database.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { buildPagination } from '../utils/pagination.js';
import { auditLogRepo } from '../repositories/auditLogRepo.js';
import { AuditLogQueryType } from '@timesheet/shared';

export const getAuditLogs = asyncHandler<Record<string, string>, unknown, unknown, AuditLogQueryType>(async (req, res) => {
  const { actor, action, category, entityType, startDate, endDate, page = 1, limit = 50 } = req.query;
  const p = Number(page);
  const l = Number(limit);
  const offset = (p - 1) * l;

  const { logs: logsResult, totalRecords } = await auditLogRepo.getLogs(db, {
    ...(actor ? { actor } : {}),
    ...(action ? { action } : {}),
    ...(category ? { category } : {}),
    ...(entityType ? { entityType } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    limit: l,
    offset: offset,
  });

  const auditLogs = logsResult.map((row) => ({
    id: row.id,
    action: row.action,
    actorUsername: row.actorUsername,
    actorRole: row.actorRole,
    entityType: row.entityType,
    entityId: row.entityId,
    summary: row.summary,
    changes: Array.isArray(row.changes) ? row.changes : [],
    metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
    createdAt: row.createdAt.toISOString(),
  }));

  res.json({
    success: true,
    data: {
      auditLogs,
      pagination: buildPagination(page, limit, totalRecords),
    },
  });
});
