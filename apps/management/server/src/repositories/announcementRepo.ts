import { eq, and, desc, sql } from 'drizzle-orm';
import { announcements, announcementReads } from '../../database/schema.js';
import type { DbExecutor } from '../types/db.js';

export const announcementRepo = {
  /**
   * Toplam duyuru sayısını getirir
   */
  async getCount(executor: DbExecutor): Promise<number> {
    const res = await executor.select({ count: sql<number>`COUNT(*)::int` }).from(announcements);
    return res[0]?.count || 0;
  },

  /**
   * Okunmamış duyuru sayısını getirir
   */
  async getUnreadCount(executor: DbExecutor, userId: string): Promise<number> {
    // Okunmamış: announcements tablosunda olup, announcement_reads tablosunda bu kullanıcı için olmayan
    const res = await executor.select({ count: sql<number>`COUNT(*)::int` })
      .from(announcements)
      .where(sql`NOT EXISTS (
        SELECT 1 FROM ${announcementReads} r 
        WHERE r.announcement_id = ${announcements.id} AND r.user_id = ${userId}
      )`);
    return res[0]?.count || 0;
  },

  /**
   * Duyuruları listeleyerek kullanıcının okuyup okumadığını belirler
   */
  async listWithReadStatus(executor: DbExecutor, userId: string, limit: number, offset: number) {
    return await executor.select({
      id: announcements.id,
      title: announcements.title,
      content: announcements.content,
      createdAt: announcements.createdAt,
      isRead: sql<boolean>`CASE WHEN ${announcementReads.announcementId} IS NOT NULL THEN true ELSE false END`,
    })
    .from(announcements)
    .leftJoin(announcementReads, and(
      eq(announcementReads.announcementId, announcements.id),
      eq(announcementReads.userId, userId)
    ))
    .orderBy(desc(announcements.createdAt))
    .limit(limit)
    .offset(offset);
  },

  /**
   * Duyuruyu okundu olarak işaretler
   */
  async markAsRead(executor: DbExecutor, userId: string, announcementId: string): Promise<void> {
    await executor.insert(announcementReads)
      .values({ userId, announcementId })
      .onConflictDoNothing();
  },

  /**
   * Duyuruyu ID ile getirir
   */
  async findById(executor: DbExecutor, id: string) {
    const res = await executor.select().from(announcements).where(eq(announcements.id, id)).limit(1);
    return res[0];
  },

  /**
   * Yeni duyuru ekler
   */
  async create(executor: DbExecutor, data: { title: string; content: string }) {
    const res = await executor.insert(announcements)
      .values(data)
      .returning();
    const row = res[0];
    if (!row) throw new Error('Insert returned no rows');
    return row;
  },

  /**
   * Duyuruyu günceller
   */
  async update(executor: DbExecutor, id: string, data: { title: string; content: string }) {
    const res = await executor.update(announcements)
      .set(data)
      .where(eq(announcements.id, id))
      .returning();
    const row = res[0];
    if (!row) throw new Error('Update returned no rows');
    return row;
  },

  /**
   * Duyuruyu siler
   */
  async delete(executor: DbExecutor, id: string): Promise<void> {
    await executor.delete(announcements).where(eq(announcements.id, id));
  }
};
