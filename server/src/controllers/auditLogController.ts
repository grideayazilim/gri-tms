/* ========================================================================
   AUDIT LOG CONTROLLER (DENETİM KAYITLARI KONTROLCÜSÜ)
   Sistemde yapılan tüm işlemlerin geçmişini filtreleyerek listeler.
   ======================================================================== */
import type { Request, Response } from 'express';
import { db } from '../config/database.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { buildPagination } from '../utils/pagination.js';
import { auditLogRepo } from '../repositories/auditLogRepo.js';

export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const actor = req.query.actor as string | undefined;
  const action = req.query.action as string | undefined;
  const category = req.query.category as string | undefined;
  const entityType = req.query.entityType as string | undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const pageStr = req.query.page as string | undefined;
  const limitStr = req.query.limit as string | undefined;

  const page = parseInt(pageStr || '1', 10);
  const limit = parseInt(limitStr || '50', 10);
  const offset = (page - 1) * limit;

  const { logs: logsResult, totalRecords } = await auditLogRepo.getLogs(db, {
    ...(actor ? { actor } : {}),
    ...(action ? { action } : {}),
    ...(category ? { category } : {}),
    ...(entityType ? { entityType } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    limit,
    offset,
  });

  const auditLogs = logsResult.map((row) => ({
    id: row.id,
    action: row.action,
    actor: {
      username: row.actorUsername,
      role: row.actorRole,
    },
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
