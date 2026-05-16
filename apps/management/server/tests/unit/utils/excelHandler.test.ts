import { vi, describe, it, expect, beforeEach } from 'vitest'

const {
  mockOutputAsync,
  mockSheetCell,
  mockSheet,
  mockWorkbookXlsx,
  mockAddRow,
  MockWorkbook,
  MockXlsxPopulate,
  mockExistsSync,
} = vi.hoisted(() => {
  const mockOutputAsync = vi.fn().mockResolvedValue(Buffer.from('mock-timesheet'))
  const mockCellFn = vi.fn().mockReturnThis()
  const mockCell = { value: mockCellFn, style: vi.fn().mockReturnThis(), formula: vi.fn().mockReturnThis() }
  const mockSheetCell = vi.fn(() => mockCell)
  const mockSheet = { cell: mockSheetCell, row: vi.fn(() => ({ cell: vi.fn(() => mockCell) })) }
  const mockXlsxWorkbook = { sheet: vi.fn(() => mockSheet), outputAsync: mockOutputAsync }
  const MockXlsxPopulate = { fromFileAsync: vi.fn().mockResolvedValue(mockXlsxWorkbook) }

  const mockWriteBuffer = vi.fn().mockResolvedValue(Buffer.from('mock-bot-excel'))
  const mockCell2 = { fill: undefined, border: undefined, alignment: undefined }
  const mockEachCell = vi.fn((cb?: (c: typeof mockCell2) => void) => { if (cb) cb(mockCell2) })
  const mockRowGetCell = vi.fn(() => ({ alignment: undefined }))
  const mockAddRow = vi.fn().mockReturnValue({ font: undefined, eachCell: mockEachCell, getCell: mockRowGetCell })
  const mockGetColumn = vi.fn(() => ({ width: 0 }))
  const mockWorksheet = { addRow: mockAddRow, getColumn: mockGetColumn, views: [] }
  const mockWorkbookXlsx = { xlsx: { writeBuffer: mockWriteBuffer } }
  const mockWbInstance = { addWorksheet: vi.fn(() => mockWorksheet), ...mockWorkbookXlsx }
  function MockWorkbook(this: unknown) { return mockWbInstance }

  const mockExistsSync = vi.fn().mockReturnValue(true)

  return {
    mockOutputAsync, mockSheetCell, mockSheet,
    mockWorkbookXlsx, mockAddRow, MockWorkbook,
    MockXlsxPopulate, mockExistsSync,
  }
})

vi.mock('xlsx-populate', () => ({ default: MockXlsxPopulate }))

vi.mock('exceljs', () => ({ default: { Workbook: MockWorkbook } }))

vi.mock('fs', () => ({
  default: { existsSync: mockExistsSync },
  existsSync: mockExistsSync,
}))

import { generateTimesheetExcel, generateBotExcel } from '../../../src/utils/excelHandler.js'
import { AppError } from '../../../src/utils/AppError.js'
import type { ExcelEmployee, TimesheetExcelOptions } from '../../../src/utils/excelHandler.js'

beforeEach(() => {
  vi.clearAllMocks()
  mockOutputAsync.mockResolvedValue(Buffer.from('mock-timesheet'))
  mockExistsSync.mockReturnValue(true)
  mockSheet.sheet = vi.fn(() => mockSheet)
  mockAddRow.mockReturnValue({
    font: undefined,
    eachCell: vi.fn((cb?: (c: Record<string, unknown>) => void) => { if (cb) cb({ fill: undefined, border: undefined, alignment: undefined }) }),
    getCell: vi.fn(() => ({ alignment: undefined })),
  })
})

const sampleEmployee: ExcelEmployee = {
  id: 'emp-1',
  tcNo: '12345678901',
  firstName: 'Ahmet',
  lastName: 'Yılmaz',
}

const timesheetOpts: TimesheetExcelOptions = {
  employees: [sampleEmployee],
  daysMap: { 'emp-1': { '2024-01-15': 'X' } },
  dailyWage: 500,
  year: 2024,
  month: 1,
  locationName: 'Merkez',
}

describe('generateTimesheetExcel', () => {
  it('Buffer döner', async () => {
    const result = await generateTimesheetExcel(timesheetOpts)
    expect(result).toBeInstanceOf(Buffer)
  })

  it('workbook outputAsync çağrılır', async () => {
    await generateTimesheetExcel(timesheetOpts)
    expect(mockOutputAsync).toHaveBeenCalledOnce()
  })

  it('şablon bulunamazsa AppError (501) fırlatır', async () => {
    mockExistsSync.mockReturnValue(false)
    await expect(generateTimesheetExcel(timesheetOpts)).rejects.toThrow(AppError)
  })

  it('şablon yokken fırlatılan AppError 501 status içerir', async () => {
    mockExistsSync.mockReturnValue(false)
    try {
      await generateTimesheetExcel(timesheetOpts)
      expect.fail('hata fırlatılmalıydı')
    } catch (err) {
      expect((err as AppError).status).toBe(501)
    }
  })

  it('boş employees dizisi ile çalışır', async () => {
    await expect(generateTimesheetExcel({ ...timesheetOpts, employees: [] })).resolves.toBeInstanceOf(Buffer)
  })

  it('xlsx-populate fromFileAsync çağrılır', async () => {
    await generateTimesheetExcel(timesheetOpts)
    expect(MockXlsxPopulate.fromFileAsync).toHaveBeenCalledOnce()
  })
})

describe('generateBotExcel', () => {
  const botOpts = {
    employees: [sampleEmployee],
    daysMap: { 'emp-1': { '2024-01-15': 'X' as const } },
    year: 2024,
    month: 1,
    locationName: 'Merkez',
  }

  it('Buffer döner', async () => {
    const result = await generateBotExcel(botOpts)
    expect(result).toBeInstanceOf(Buffer)
  })

  it('xlsx writeBuffer çağrılır', async () => {
    await generateBotExcel(botOpts)
    expect(mockWorkbookXlsx.xlsx.writeBuffer).toHaveBeenCalledOnce()
  })

  it('başlık satırı eklenir (IBAN, TC KİMLİK NO, ADI SOYADI)', async () => {
    await generateBotExcel(botOpts)
    const firstCall = mockAddRow.mock.calls[0][0] as string[]
    expect(firstCall).toContain('IBAN')
    expect(firstCall).toContain('TC KİMLİK NO')
    expect(firstCall).toContain('ADI SOYADI')
  })

  it('her çalışan için bir satır eklenir', async () => {
    const employees: ExcelEmployee[] = [
      { id: 'e1', tcNo: '11111111111', firstName: 'Ahmet', lastName: 'Demir' },
      { id: 'e2', tcNo: '22222222222', firstName: 'Zeynep', lastName: 'Akar' },
    ]
    await generateBotExcel({ ...botOpts, employees, daysMap: {} })
    // başlık + 2 çalışan = 3 satır
    expect(mockAddRow).toHaveBeenCalledTimes(3)
  })

  it('boş employees ile sadece başlık satırı eklenir', async () => {
    await generateBotExcel({ ...botOpts, employees: [] })
    expect(mockAddRow).toHaveBeenCalledTimes(1)
  })
})
