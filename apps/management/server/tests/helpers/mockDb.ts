import { vi } from 'vitest'

export function createMockDb() {
  const mockInsert = {
    values: vi.fn().mockResolvedValue([]),
  }
  const mockUpdate = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
  }
  const mockDelete = {
    where: vi.fn().mockResolvedValue([]),
  }
  const mockSelectBase = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
    leftJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
  }

  const executor = {
    insert: vi.fn().mockReturnValue(mockInsert),
    update: vi.fn().mockReturnValue(mockUpdate),
    delete: vi.fn().mockReturnValue(mockDelete),
    select: vi.fn().mockReturnValue(mockSelectBase),
  }

  return { executor, mockInsert, mockUpdate, mockDelete, mockSelectBase }
}
