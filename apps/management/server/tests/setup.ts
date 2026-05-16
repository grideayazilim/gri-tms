import { vi, beforeEach } from 'vitest'

vi.mock('winston', () => {
  const noop = vi.fn()
  const mockLogger = {
    info: noop,
    warn: noop,
    error: noop,
    debug: noop,
  }
  return {
    default: {
      createLogger: vi.fn(() => mockLogger),
      format: {
        combine: vi.fn(() => ({})),
        colorize: vi.fn(() => ({})),
        timestamp: vi.fn(() => ({})),
        errors: vi.fn(() => ({})),
        printf: vi.fn(() => ({})),
        json: vi.fn(() => ({})),
      },
      transports: { Console: vi.fn() },
    },
  }
})

beforeEach(() => {
  vi.clearAllMocks()
})
