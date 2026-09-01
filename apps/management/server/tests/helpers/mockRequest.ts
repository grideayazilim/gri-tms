import { vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import type { JwtPayload } from '@timesheet/shared'

interface MockReqOptions {
  body?: Record<string, unknown>
  query?: Record<string, unknown>
  params?: Record<string, unknown>
  cookies?: Record<string, unknown>
  user?: JwtPayload
  scope?: { unitId: string; locationId: string } | null
  path?: string
  originalUrl?: string
  method?: string
  ip?: string
}

export function mockReq(opts: MockReqOptions = {}): Request {
  return {
    body: opts.body ?? {},
    query: opts.query ?? {},
    params: opts.params ?? {},
    cookies: opts.cookies ?? {},
    user: opts.user,
    scope: opts.scope,
    path: opts.path ?? '/test',
    originalUrl: opts.originalUrl ?? opts.path ?? '/test',
    url: opts.originalUrl ?? opts.path ?? '/test',
    method: opts.method ?? 'GET',
    ip: opts.ip ?? '127.0.0.1',
  } as unknown as Request
}

export function mockRes(): Response {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
    send: vi.fn(),
  } as unknown as Response
  ;(res.status as ReturnType<typeof vi.fn>).mockReturnValue(res)
  ;(res.json as ReturnType<typeof vi.fn>).mockReturnValue(res)
  return res
}

export const mockNext: NextFunction = vi.fn() as unknown as NextFunction
