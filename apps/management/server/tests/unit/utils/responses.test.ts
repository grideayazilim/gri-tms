import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ok, created, paginated, fail } from '../../../src/utils/responses.js'
import { mockRes } from '../../helpers/mockRequest.js'
import type { Response } from 'express'

let res: Response

beforeEach(() => {
  res = mockRes()
})

describe('ok', () => {
  it('200 status ile success:true ve data döner', () => {
    ok(res, { id: 1 })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1 } })
  })

  it('isteğe bağlı message ile birlikte döner', () => {
    ok(res, { id: 1 }, 'Başarılı')
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1 }, message: 'Başarılı' })
  })

  it('null data ile çalışır', () => {
    ok(res, null)
    expect(res.json).toHaveBeenCalledWith({ success: true, data: null })
  })

  it('message undefined ise response\'da message alanı olmaz', () => {
    ok(res, {})
    const callArg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect('message' in callArg).toBe(false)
  })
})

describe('created', () => {
  it('201 status ile success:true ve data döner', () => {
    created(res, { id: 2 })
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 2 } })
  })

  it('isteğe bağlı message ile birlikte döner', () => {
    created(res, { id: 2 }, 'Oluşturuldu')
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 2 }, message: 'Oluşturuldu' })
  })
})

describe('paginated', () => {
  const pagination = { currentPage: 1, totalPages: 5, totalRecords: 50, limit: 10 }

  it('200 status ve sayfalı yapıyla döner', () => {
    paginated(res, 'users', [{ id: 1 }], pagination)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { users: [{ id: 1 }], pagination },
    })
  })

  it('boş dizi ile çalışır', () => {
    paginated(res, 'items', [], pagination)
    const callArg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArg.data.items).toEqual([])
  })
})

describe('fail', () => {
  it('belirtilen status ve mesaj ile success:false döner', () => {
    fail(res, 400, 'Geçersiz veri')
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Geçersiz veri' })
  })

  it('errors parametresi verilirse response\'a eklenir', () => {
    fail(res, 422, 'Hata', { field: ['Zorunludur'] })
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Hata',
      errors: { field: ['Zorunludur'] },
    })
  })

  it('500 status ile çalışır', () => {
    fail(res, 500, 'Sunucu hatası')
    expect(res.status).toHaveBeenCalledWith(500)
  })
})
