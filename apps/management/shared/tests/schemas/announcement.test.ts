import { describe, it, expect } from 'vitest'
import { announcementSchema } from '../../src/schemas/announcement.schema.js'

describe('announcementSchema', () => {
  const validAnnouncement = {
    title: 'Test Başlığı',
    content: 'Bu bir test içeriğidir ve yeterince uzun olmalıdır.',
  }

  it('geçerli duyuru ile başarılı olur', () => {
    const result = announcementSchema.safeParse(validAnnouncement)
    expect(result.success).toBe(true)
  })

  it('başlık 3 karakterden kısaysa reddeder', () => {
    const result = announcementSchema.safeParse({ ...validAnnouncement, title: 'AB' })
    expect(result.success).toBe(false)
  })

  it('başlık tam 3 karakter ile başarılı olur', () => {
    const result = announcementSchema.safeParse({ ...validAnnouncement, title: 'ABC' })
    expect(result.success).toBe(true)
  })

  it('başlık 100 karakterden uzunsa reddeder', () => {
    const result = announcementSchema.safeParse({ ...validAnnouncement, title: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('başlık tam 100 karakter ile başarılı olur', () => {
    const result = announcementSchema.safeParse({ ...validAnnouncement, title: 'a'.repeat(100) })
    expect(result.success).toBe(true)
  })

  it('içerik 10 karakterden kısaysa reddeder', () => {
    const result = announcementSchema.safeParse({ ...validAnnouncement, content: 'Kısa' })
    expect(result.success).toBe(false)
  })

  it('içerik tam 10 karakter ile başarılı olur', () => {
    const result = announcementSchema.safeParse({ ...validAnnouncement, content: 'a'.repeat(10) })
    expect(result.success).toBe(true)
  })

  it('içerik 1000 karakterden uzunsa reddeder', () => {
    const result = announcementSchema.safeParse({ ...validAnnouncement, content: 'a'.repeat(1001) })
    expect(result.success).toBe(false)
  })

  it('başlık trim edilir', () => {
    const result = announcementSchema.safeParse({ ...validAnnouncement, title: '  Test Başlığı  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.title).toBe('Test Başlığı')
  })

  it('içerik trim edilir', () => {
    const result = announcementSchema.safeParse({ ...validAnnouncement, content: '  ' + validAnnouncement.content + '  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.content).toBe(validAnnouncement.content)
  })
})
