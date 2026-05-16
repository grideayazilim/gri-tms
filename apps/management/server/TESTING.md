# Testing Guide — Timesheet Management System (Server)

## Overview

This document describes the unit testing suite for the **timesheet management server** (`apps/management/server`) and **shared schemas** (`apps/management/shared`). The suite is built with **Vitest** and includes **27 test files** covering:

- **12 Schema Tests**: Zod schema validation for auth, user, employee, timesheet, and settings
- **9 Utils Tests**: Utility functions for dates, tokens, pagination, errors, responses, and Excel generation
- **6 Middleware Tests**: Express middleware for auth, validation, role-based access, error handling

**Total: 311 test cases, all passing** ✓

---

## Coverage Metrics

Final coverage after excluding unsuitable files:

| Metric | Coverage |
| ------ | -------- |
| Statements | 90.9% |
| Branches | 86.06% |
| Functions | 88.88% |
| Lines | 91.97% |

### Excluded Files

The following files are **intentionally excluded** from coverage reporting in [`vitest.config.ts`](vitest.config.ts):

- **`src/jobs/cronJobs.ts`** — Time-based scheduled jobs that require integration/E2E testing, not unit testable in isolation
- **`src/utils/logger.ts`** — Global Winston logger instance, mocked at setup level (`tests/setup.ts`), doesn't benefit from direct unit tests

These exclusions provide more accurate coverage metrics for code that can actually be unit tested.

---

## Running Tests

### Installation

All dependencies are already installed in `apps/management/server`:

```bash
npm i
# (vitest, @vitest/coverage-v8, @faker-js/faker are devDependencies)
```

### Test Commands

From the server workspace (`apps/management/server`):

```bash
# Run tests once
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report (CLI + HTML)
npm run test:coverage
```

From the project root:

```bash
# Run server tests from root
npm run test -w management-server

# Watch mode from root
npm run test:watch -w management-server

# Coverage from root
npm run test:coverage -w management-server
```

### Viewing Coverage Reports

After running `npm run test:coverage`, open the HTML report:

```
apps/management/server/coverage/index.html
```

The report shows line-by-line coverage for:
- `src/utils/**`
- `src/middlewares/**`
- `../shared/src/schemas/**`

---

## Directory Structure

```
apps/management/server/
├── vitest.config.ts                    ← Vitest configuration + coverage settings
├── TESTING.md                          ← This file
├── package.json                        ← Test scripts
├── tests/
│   ├── setup.ts                        ← Global mocks (Winston logger)
│   ├── helpers/
│   │   ├── testFactory.ts              ← Faker-based mock data generators
│   │   ├── mockRequest.ts              ← Express req/res/next mocks
│   │   └── mockDb.ts                   ← Drizzle ORM query builder mocks
│   └── unit/
│       ├── utils/
│       │   ├── dateUtils.test.ts       ← Date parsing, formatting, ISO weeks
│       │   ├── pagination.test.ts      ← Pagination bounds and calculation
│       │   ├── AppError.test.ts        ← Custom error status codes
│       │   ├── errors.test.ts          ← Error message formatting
│       │   ├── responses.test.ts       ← HTTP response envelopes
│       │   ├── tokenUtils.test.ts      ← JWT token generation/verification
│       │   ├── periodGenerator.test.ts ← Period auto-generation
│       │   ├── auditLogger.test.ts     ← Audit log creation and field diffing
│       │   └── excelHandler.test.ts    ← Excel file generation
│       └── middlewares/
│           ├── auth.test.ts            ← Token validation middleware
│           ├── validate.test.ts        ← Zod schema validation middleware
│           ├── admin.test.ts           ← Admin role check
│           ├── scope.test.ts           ← Unit/location scoping
│           ├── error.test.ts           ← Error handling and response formatting
│           └── asyncHandler.test.ts    ← Async route handler wrapper
│
apps/management/shared/
└── tests/
    └── schemas/
        ├── auth.test.ts                ← Sign-in/up validation
        ├── timesheet.test.ts           ← Date format, markers, constraints
        ├── employee.test.ts            ← TC No, IBAN, date transforms
        ├── user.test.ts                ← Role validation, password rules
        ├── holiday.test.ts             ← Year range, coercion
        ├── announcement.test.ts        ← Title/content length
        ├── export.test.ts              ← Export parameters validation
        ├── import.test.ts              ← Import data structure
        ├── location.test.ts            ← Location/unit nesting
        ├── settings.test.ts            ← Settings preprocessing, password rules
        ├── reset.test.ts               ← Date range validation
        └── auditLog.test.ts            ← Audit action enums, pagination
```

---

## Test File Overview

### Schema Tests (`apps/management/shared/tests/schemas/`)

Each file tests **Zod schema validation** with `.safeParse()`:

| Test File | Coverage | Key Test Areas |
| --------- | -------- | --------------- |
| **auth.test.ts** | 5 tests | Sign-in validation, sign-up with RESPONSIBLE role constraints |
| **timesheet.test.ts** | 5 tests | YYYY-MM-DD date format, markerCode enum, array length bounds |
| **employee.test.ts** | 6 tests | TC No (11 digits), IBAN (`TR` + 24 chars), date transforms |
| **user.test.ts** | 5 tests | Role validation, password sync, RESPONSIBLE field requirements |
| **holiday.test.ts** | 4 tests | Year coercion, range (2000–2100), invalid date handling |
| **announcement.test.ts** | 4 tests | Title (3–100), content (10–1000), trim transform |
| **export.test.ts** | 4 tests | Year/month coercion, valid ranges, invalid inputs |
| **import.test.ts** | 5 tests | TC/IBAN format, timesheetChanges structure, marker records |
| **location.test.ts** | 4 tests | programNo, nested units array, sync schema |
| **settings.test.ts** | 6 tests | Preprocess (empty → null), password superRefine, date regex |
| **reset.test.ts** | 3 tests | Date range (endDate > startDate), positive numbers |
| **auditLog.test.ts** | 5 tests | Action/entity enums, pagination preprocess |

**Schema test pattern:**

```typescript
import { describe, it, expect } from 'vitest'
import { mySchema } from '@timesheet/shared'

describe('mySchema', () => {
  it('accepts valid data', () => {
    const result = mySchema.safeParse({ field: 'value' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid field', () => {
    const result = mySchema.safeParse({ field: 'invalid' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].code).toBe('invalid_type')
  })
})
```

### Utils Tests (`apps/management/server/tests/unit/utils/`)

Unit tests for **standalone utility functions** and **error handling**:

| Test File | Tests | Key Test Areas |
| --------- | ----- | --------------- |
| **dateUtils.test.ts** | 8 tests | `toISODateString`, `parseLocalDate`, `isWeekend`, `getISOWeekKey`, leap years, year transitions |
| **pagination.test.ts** | 6 tests | Bounds checking (limit 1–100, page ≥1), offset calculation, default values |
| **AppError.test.ts** | 7 tests | Status factories (400/401/403/404/409/500), PG unique constraint detection |
| **errors.test.ts** | 4 tests | Error message extraction from Error, objects, primitives, null |
| **responses.test.ts** | 5 tests | HTTP response envelopes: ok/created/paginated/fail with correct status codes |
| **tokenUtils.test.ts** | 6 tests | JWT sign/verify mocks, token generation, expired/invalid token handling |
| **periodGenerator.test.ts** | 6 tests | Period creation for date ranges, deletion, month boundaries, year transitions |
| **auditLogger.test.ts** | 25 tests | Audit log insertion, field diffing, format functions (dates, money, active status), lookup mapping |
| **excelHandler.test.ts** | 8 tests | Excel buffer generation, timesheet/bot formats, empty employee handling |

**Utils test pattern (with mocks):**

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('jsonwebtoken', () => ({
  default: { sign: vi.fn(), verify: vi.fn() },
}))

import jwt from 'jsonwebtoken'

describe('tokenUtils', () => {
  beforeEach(() => vi.clearAllMocks())

  it('generates valid token', () => {
    jwt.sign.mockReturnValue('token.jwt.here')
    const token = generateAccessToken(payload)
    expect(token).toBe('token.jwt.here')
  })
})
```

### Middleware Tests (`apps/management/server/tests/unit/middlewares/`)

Tests for **Express middleware functions** with request/response/next mocks:

| Test File | Tests | Key Test Areas |
| --------- | ----- | --------------- |
| **auth.test.ts** | 5 tests | Valid token → `req.user` set, expired/invalid → 401, missing cookie handling |
| **validate.test.ts** | 6 tests | Valid data passes, invalid data → 400 with `fieldErrors`, target parameter (body/query/params) |
| **admin.test.ts** | 4 tests | ADMIN role passes, non-admin → 403, missing user → error |
| **scope.test.ts** | 7 tests | ADMIN full/filtered access, RESPONSIBLE self-scoping, PERSONEL limitations |
| **error.test.ts** | 6 tests | AppError → correct status, PG 23505 → 409, unknown error → 500 |
| **asyncHandler.test.ts** | 4 tests | Promise rejection → `next(err)`, resolved promise → `next` not called |

**Middleware test pattern:**

```typescript
import { mockReq, mockRes, mockNext } from '../../helpers/mockRequest'

describe('authMiddleware', () => {
  it('extracts user from valid token', () => {
    const req = mockReq({ cookies: { accessToken: 'valid.jwt' } })
    const res = mockRes()
    const next = mockNext()

    authMiddleware(req, res, next)

    expect(req.user).toEqual({ id: 'user-1', username: 'admin' })
    expect(next).toHaveBeenCalledOnce()
  })

  it('returns 401 for missing token', () => {
    const req = mockReq({})
    const res = mockRes()
    const next = mockNext()

    authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
  })
})
```

---

## Mock Strategy

### 1. Database (`drizzle-orm`)

**File:** [`tests/helpers/mockDb.ts`](tests/helpers/mockDb.ts)

The Drizzle ORM query builder is mocked to return chainable objects:

```typescript
const { executor, mockInsert, mockSelect } = createMockDb()

mockInsert.values.mockResolvedValue({ id: '123' })
mockSelect.where.mockReturnThis()

await executor.insert(table).values(data)
```

**When to use:** Utilities that interact with the database (periodGenerator, auditLogger).

### 2. JWT (`jsonwebtoken`)

**File:** Mocked in individual test files with `vi.hoisted()`

```typescript
const { mockSign, mockVerify } = vi.hoisted(() => ({
  mockSign: vi.fn(),
  mockVerify: vi.fn(),
}))

vi.mock('jsonwebtoken', () => ({
  default: { sign: mockSign, verify: mockVerify },
}))
```

**When to use:** Token generation/verification tests; auth middleware tests.

**Pattern:**
- `sign` returns a string token
- `verify` returns a decoded payload or throws `Error`
- No real cryptography; fast, deterministic testing

### 3. Winston Logger

**File:** [`tests/setup.ts`](tests/setup.ts)

Winston is globally mocked to suppress log output:

```typescript
vi.mock('winston', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
}))
```

**When to use:** Global setup; affects all tests.

### 4. ExcelJS / xlsx-populate

**File:** Mocked in `excelHandler.test.ts` with `vi.hoisted()`

```typescript
const { MockWorkbook, mockAddRow } = vi.hoisted(() => {
  const mockWorksheet = { addRow: vi.fn(), getColumn: vi.fn() }
  function MockWorkbook() {
    return { addWorksheet: vi.fn(() => mockWorksheet) }
  }
  return { MockWorkbook, mockAddRow: mockWorksheet.addRow }
})

vi.mock('exceljs', () => ({ default: { Workbook: MockWorkbook } }))
```

**When to use:** Testing Excel file generation; mocking workbook/worksheet creation.

### 5. File System (`fs`)

**File:** Mocked in `excelHandler.test.ts` with `vi.hoisted()`

```typescript
const { mockExistsSync } = vi.hoisted(() => ({
  mockExistsSync: vi.fn().mockReturnValue(true),
}))

vi.mock('fs', () => ({
  default: { existsSync: mockExistsSync },
  existsSync: mockExistsSync,
}))
```

**When to use:** Testing file operations; checking template existence.

### 6. Express Request/Response

**File:** [`tests/helpers/mockRequest.ts`](tests/helpers/mockRequest.ts)

Express objects are manually created; not mocked:

```typescript
const req = mockReq({
  body: { username: 'admin' },
  user: { id: 'user-1', role: 'ADMIN' },
})

const res = mockRes()
const next = vi.fn()

middleware(req, res, next)
```

**When to use:** All middleware tests.

### 7. Test Data (Faker)

**File:** [`tests/helpers/testFactory.ts`](tests/helpers/testFactory.ts)

Turkish locale Faker generates realistic test data:

```typescript
import { makeUser, makeEmployee, makeTimesheetDay } from '../../helpers/testFactory'

const user = makeUser({ role: 'ADMIN' })
const emp = makeEmployee({ tcNo: '12345678901' })
const day = makeTimesheetDay({ marker: 'X' })
```

**When to use:** Creating test fixtures with realistic values.

---

## Adding New Tests

### 1. Schema Test

Add to `apps/management/shared/tests/schemas/mySchema.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mySchema } from '@timesheet/shared'

describe('mySchema', () => {
  it('validates valid input', () => {
    const result = mySchema.safeParse({ field: 'value' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid input', () => {
    const result = mySchema.safeParse({ field: 123 })
    expect(result.success).toBe(false)
    expect(result.error?.issues).toHaveLength(1)
  })

  // Add 3+ more cases
})
```

**Coverage checklist:**
- ✓ Valid data passes
- ✓ Invalid types rejected
- ✓ Required fields enforced
- ✓ Constraints (length, range, regex) enforced
- ✓ Transforms/preprocessing applied

### 2. Utils Test

Add to `apps/management/server/tests/unit/utils/myUtil.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { myFunction } from '../../../src/utils/myUtil'

describe('myFunction', () => {
  it('returns expected value for valid input', () => {
    const result = myFunction('input')
    expect(result).toEqual('expected')
  })

  it('handles edge case', () => {
    const result = myFunction(null)
    expect(result).toBeNull()
  })

  // Add 3+ more cases
})
```

**Coverage checklist:**
- ✓ Happy path
- ✓ Null/undefined handling
- ✓ Type coercion/transforms
- ✓ Boundary values
- ✓ Error conditions

### 3. Middleware Test

Add to `apps/management/server/tests/unit/middlewares/myMiddleware.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { mockReq, mockRes, mockNext } from '../../helpers/mockRequest'
import { myMiddleware } from '../../../src/middlewares/myMiddleware'

describe('myMiddleware', () => {
  let req, res, next

  beforeEach(() => {
    req = mockReq()
    res = mockRes()
    next = mockNext()
  })

  it('calls next() on valid input', () => {
    myMiddleware(req, res, next)
    expect(next).toHaveBeenCalledOnce()
  })

  it('returns 400 on invalid input', () => {
    req.body = { invalid: 'data' }
    myMiddleware(req, res, next)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  // Add 3+ more cases
})
```

**Coverage checklist:**
- ✓ Success path
- ✓ 4xx error conditions (400/401/403/404)
- ✓ 5xx handling
- ✓ Edge cases (missing user, invalid scope, etc.)

---

## Test Configuration Reference

### `vitest.config.ts`

Key settings:

| Setting | Value | Purpose |
| ------- | ----- | ------- |
| `environment` | `'node'` | Test environment (no DOM) |
| `globals` | `false` | Explicit imports required (`import { describe, it }`) |
| `include` | `['tests/unit/**', '../shared/tests/**']` | Test file patterns |
| `setupFiles` | `['tests/setup.ts']` | Global setup (mock Winston) |
| `coverage.include` | `['src/utils/**', 'src/middlewares/**', '../shared/src/schemas/**']` | Files to measure |
| `coverage.exclude` | `['**/*.test.ts', '**/index.ts', 'src/jobs/cronJobs.ts', 'src/utils/logger.ts']` | Files to skip |

### Environment Variables

Set in `vitest.config.ts > test.env`:

```typescript
env: {
  ACCESS_TOKEN_SECRET: 'test-access-secret-min32chars-padding',
  REFRESH_TOKEN_SECRET: 'test-refresh-secret-min32chars-pad',
  NODE_ENV: 'test',
}
```

These are required by `jwtConfig` module-level code.

### Module Alias

```typescript
resolve: {
  alias: {
    '@timesheet/shared': path.resolve(__dirname, '../shared/src/index.ts'),
  },
}
```

Allows server code to import from shared **source** (TS) without needing a build step.

---

## CI Integration

### GitHub Actions Example

Add to `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test -w management-server
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./apps/management/server/coverage/lcov.info
```

---

## Troubleshooting

### "Cannot find module '@timesheet/shared'"

**Solution:** Vitest alias not resolved. Check `vitest.config.ts` > `resolve.alias`.

### "vi.mock not hoisted above import"

**Solution:** Use `vi.hoisted()` to declare mock functions at module level:

```typescript
const { mockFn } = vi.hoisted(() => ({
  mockFn: vi.fn(),
}))

vi.mock('module', () => ({ default: { fn: mockFn } }))
```

### "Cannot call constructor without 'new'"

**Solution:** For ExcelJS, return an object from the constructor:

```typescript
function MockWorkbook(this) {
  return mockWbInstance
}
```

### Coverage below 80%

**Solution:** Run `npm run test:coverage` and:
1. Open `coverage/index.html`
2. Click files with low coverage
3. Red lines = untested code; add test cases to cover branches
4. Use `vi.spyOn()` for tested-but-uncovered branches (e.g., error paths)

---

## Best Practices

### 1. Use `beforeEach` for mock reset

```typescript
beforeEach(() => {
  vi.clearAllMocks()
})
```

Prevents test pollution from prior test's mocked return values.

### 2. Test both success and failure

```typescript
it('creates user on valid input', () => { ... })
it('rejects invalid email', () => { ... })
it('handles database error gracefully', () => { ... })
```

### 3. Use meaningful test names

```typescript
// ✗ Bad
it('works', () => { ... })

// ✓ Good
it('returns 400 when email is missing', () => { ... })
```

### 4. Test behavior, not implementation

```typescript
// ✗ Bad: Testing internals
expect(myObject.internalField).toBe(value)

// ✓ Good: Testing output
expect(myFunction(input)).toEqual(expectedOutput)
```

### 5. Keep tests focused

```typescript
// ✗ Too broad
it('handles user creation', () => {
  // Tests validation, database insert, logging, email sending, ...
})

// ✓ Focused
it('inserts user record with correct fields', () => { ... })
it('sends welcome email to new user', () => { ... })
```

---

## Summary

| Aspect | Details |
| ------ | ------- |
| **Framework** | Vitest (v8 coverage) |
| **Test Files** | 27 files, 311 cases |
| **Coverage** | 90.9% statements, 86% branches, 89% functions, 92% lines |
| **Test Types** | Schema validation, utility functions, middleware |
| **Mock Strategy** | vi.mock for external deps; manual mocks for Express; Faker for test data |
| **Setup** | Config in `vitest.config.ts`, global mocks in `tests/setup.ts` |
| **Run Tests** | `npm run test -w management-server` or `npm run test:coverage -w management-server` |

---

**Last Updated:** 2026-05-16  
**Framework:** Vitest 2.x  
**Node Version:** 20+  
**Language:** TypeScript
