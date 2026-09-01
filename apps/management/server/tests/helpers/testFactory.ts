import { faker } from '@faker-js/faker/locale/tr'
import type { JwtPayload } from '@timesheet/shared'

export function makeUser(overrides: Partial<JwtPayload> = {}): JwtPayload {
  return {
    id: faker.string.uuid(),
    username: faker.internet.username().replace(/\s/g, '_'),
    role: 'ADMIN',
    locationId: faker.string.uuid(),
    unitId: faker.string.uuid(),
    mustChangePassword: false,
    tokenVersion: 0,
    ...overrides,
  }
}

export function makeTcNo(): string {
  return faker.string.numeric(11)
}

export function makeIban(): string {
  return 'TR' + faker.string.numeric(24)
}

export function makeEmployee(overrides: Record<string, unknown> = {}) {
  return {
    tcNo: makeTcNo(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    locationId: faker.string.uuid(),
    unitId: faker.string.uuid(),
    startDate: '2024-01-01',
    endDate: null,
    ibanNo: makeIban(),
    isActive: true,
    ...overrides,
  }
}

export function makeTimesheetDay(overrides: Record<string, unknown> = {}) {
  return {
    day: '2024-01-15',
    markerCode: 'X' as const,
    note: null,
    ...overrides,
  }
}

export function makeTimesheetRow(overrides: Record<string, unknown> = {}) {
  return {
    employeeId: faker.string.uuid(),
    days: [makeTimesheetDay()],
    ...overrides,
  }
}

export function makeLocation(overrides: Record<string, unknown> = {}) {
  return {
    name: faker.location.city(),
    programNo: faker.string.alphanumeric(6).toUpperCase(),
    ...overrides,
  }
}

export function makeUnit(overrides: Record<string, unknown> = {}) {
  return {
    locationId: faker.string.uuid(),
    name: faker.commerce.department(),
    ...overrides,
  }
}

export function makeAnnouncement(overrides: Record<string, unknown> = {}) {
  return {
    title: faker.lorem.words(4),
    content: faker.lorem.sentences(2),
    ...overrides,
  }
}

export function makeHoliday(overrides: Record<string, unknown> = {}) {
  return {
    year: faker.number.int({ min: 2000, max: 2100 }),
    ...overrides,
  }
}
