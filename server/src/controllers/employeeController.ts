/* ========================================================================
   EMPLOYEE CONTROLLER (ÇALIŞAN YÖNETİMİ)
   Çalışan listeleme, ekleme, güncelleme ve silme işlemlerini yönetir.
   ======================================================================== */
import { db, withDrizzleTransaction } from '../config/database.js';
import { createAuditLog, buildActor, diffEntityWithLookups, toSnakeCaseKeys } from '../utils/auditLogger.js';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from '@timesheet/shared';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { notFound, conflict } from '../utils/AppError.js';
import { buildPagination, paginationParams } from '../utils/pagination.js';
import { ok, created, paginated } from '../utils/responses.js';
import * as employeeRepo from '../repositories/employeeRepo.js';
import type { DatabaseError } from 'pg';


function buildEmployeeResponse(
  row: { id: string; tcNo: string | null; firstName: string; lastName: string; ibanNo: string | null; startDate: string; endDate: string | null; isActive: boolean; createdAt: Date; updatedAt: Date },
  unit: { id: string; name: string; locationId: string; locationName: string },
) {
  return {
    id: row.id,
    tcNo: row.tcNo,
    firstName: row.firstName,
    lastName: row.lastName,
    ibanNo: row.ibanNo,
    startDate: row.startDate,
    endDate: row.endDate,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    unit: {
      id: unit.id,
      name: unit.name,
      location: { id: unit.locationId, name: unit.locationName },
    },
  };
}

export const getEmployees = asyncHandler(async (req, res) => {
  const { unitId, locationId, search, status } = req.query as {
    unitId?: string;
    locationId?: string;
    search?: string;
    status?: string;
  };

  const { page, limit, offset } = paginationParams({ ...req.query, limit: req.query.limit ?? 50 } as Record<string, unknown>);

  const filters = {
    ...(unitId !== undefined ? { unitId } : {}),
    ...(locationId !== undefined ? { locationId } : {}),
    ...(search !== undefined ? { search } : {}),
    ...(status !== undefined ? { status: status as 'active' | 'inactive' } : {}),
  };

  const result = await employeeRepo.list(db, filters, limit, offset);

  const employees = result.employees.map((row) => ({
    id: row.id,
    tcNo: row.tcNo,
    firstName: row.firstName,
    lastName: row.lastName,
    ibanNo: row.ibanNo,
    startDate: row.startDate,
    endDate: row.endDate,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    unit: {
      id: row.unitId,
      name: row.unitName,
      location: { id: row.locationId, name: row.locationName },
    },
  }));

  return paginated(res, 'employees', employees, buildPagination(page, limit, result.total));
});

export const createEmployee = asyncHandler(async (req, res) => {
  const { tcNo, firstName, lastName, ibanNo, unitId, startDate, endDate } = req.body as {
    tcNo: string;
    firstName: string;
    lastName: string;
    ibanNo?: string;
    unitId: string;
    startDate: string;
    endDate?: string;
  };

  let result: { employee: ReturnType<typeof buildEmployeeResponse> };
  try {
    result = await withDrizzleTransaction(async (tx) => {
      const employee = await employeeRepo.create(tx, {
        tcNo,
        firstName,
        lastName,
        ibanNo: ibanNo ?? null,
        unitId,
        startDate,
        endDate: endDate ?? null,
        isActive: (req.body as { isActive?: boolean }).isActive !== undefined
          ? (req.body as { isActive?: boolean }).isActive!
          : true,
      });

      const unit = await employeeRepo.findUnitWithLocation(tx, unitId);

      await createAuditLog(tx, {
        action: AUDIT_ACTION.EMPLOYEE_CREATE,
        actor: buildActor(req),
        entityType: AUDIT_ENTITY_TYPE.EMPLOYEE,
        entityId: employee.id,
        summary: `${firstName} ${lastName} adlı çalışan eklendi.`,
        metadata: {
          tcNo: employee.tcNo,
          unitName: unit?.name ?? null,
          locationName: unit?.locationName ?? null,
        },
      });

      return {
        employee: unit
          ? buildEmployeeResponse(employee, unit)
          : buildEmployeeResponse(employee, { id: unitId, name: '', locationId: '', locationName: '' }),
      };
    });
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as DatabaseError).code === '23505') {
      throw conflict('Bu TC No zaten kayıtlı');
    }
    throw err;
  }

  return created(res, { employee: result.employee });
});

export const updateEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const { tcNo, firstName, lastName, ibanNo, unitId, startDate, endDate } = req.body as {
    tcNo?: string;
    firstName?: string;
    lastName?: string;
    ibanNo?: string;
    unitId?: string;
    startDate?: string;
    endDate?: string | null;
  };

  let result: { employee: ReturnType<typeof buildEmployeeResponse> };
  try {
    result = await withDrizzleTransaction(async (tx) => {
      const oldRow = await employeeRepo.findById(tx, id);

      const updatedEmployee = await employeeRepo.update(tx, id, {
        ...(tcNo != null ? { tcNo } : {}),
        ...(firstName != null ? { firstName } : {}),
        ...(lastName != null ? { lastName } : {}),
        ...(ibanNo !== undefined ? { ibanNo: ibanNo ?? null } : {}),
        ...(unitId != null ? { unitId } : {}),
        ...(startDate != null ? { startDate } : {}),
        ...(endDate !== undefined ? { endDate: endDate ?? null } : {}),
        ...((req.body as { isActive?: boolean }).isActive !== undefined
          ? { isActive: (req.body as { isActive?: boolean }).isActive! }
          : {}),
      });

      if (!updatedEmployee) throw notFound('Çalışan bulunamadı');

      const unit = await employeeRepo.findUnitWithLocation(tx, updatedEmployee.unitId);

      // Audit diff
      const unitLookup: Record<string, string> = {};
      if (oldRow && oldRow.unitId !== updatedEmployee.unitId) {
        const ids = [oldRow.unitId, updatedEmployee.unitId].filter((v): v is string => v != null);
        Object.assign(unitLookup, await employeeRepo.lookupUnitNames(tx, ids));
      }

      const changes = diffEntityWithLookups(
        AUDIT_ENTITY_TYPE.EMPLOYEE,
        oldRow ? toSnakeCaseKeys(oldRow as unknown as Record<string, unknown>) : {},
        toSnakeCaseKeys(updatedEmployee as unknown as Record<string, unknown>),
        { unit_id: unitLookup },
      );

      const fullName = `${updatedEmployee.firstName} ${updatedEmployee.lastName}`;

      await createAuditLog(tx, {
        action: AUDIT_ACTION.EMPLOYEE_UPDATE,
        actor: buildActor(req),
        entityType: AUDIT_ENTITY_TYPE.EMPLOYEE,
        entityId: id,
        summary: changes.length > 0
          ? `${fullName} adlı çalışan güncellendi (${changes.length} alan değişti).`
          : `${fullName} adlı çalışan güncellendi.`,
        changes,
        metadata: {
          unitName: unit?.name ?? null,
          locationName: unit?.locationName ?? null,
        },
      });

      return {
        employee: unit
          ? buildEmployeeResponse(updatedEmployee, unit)
          : buildEmployeeResponse(updatedEmployee, { id: updatedEmployee.unitId, name: '', locationId: '', locationName: '' }),
      };
    });
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as DatabaseError).code === '23505') {
      throw conflict('Bu TC No zaten kayıtlı');
    }
    throw err;
  }

  return ok(res, { employee: result.employee });
});

export const deleteEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };

  const result = await withDrizzleTransaction(async (tx) => {
    const oldRow = await employeeRepo.findById(tx, id);
    const deleted = await employeeRepo.remove(tx, id);

    if (!deleted) return null;

    const fullName = `${deleted.firstName} ${deleted.lastName}`;

    await createAuditLog(tx, {
      action: AUDIT_ACTION.EMPLOYEE_DELETE,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.EMPLOYEE,
      entityId: id,
      summary: `${fullName} adlı çalışan silindi.`,
      metadata: oldRow ? {
        tcNo: oldRow.tcNo,
        unitId: oldRow.unitId,
      } : {},
    });

    return deleted;
  });

  if (!result) throw notFound('Çalışan bulunamadı');

  return ok(res, undefined, 'Çalışan başarıyla silindi');
});
