import { getDb } from '../db/connection';
import { reports } from '../db/schema';
import { AppError } from '../middleware/errorHandler';
import { generateUUID } from '../utils/helpers';
import { desc, eq, and, sql } from 'drizzle-orm';

export class ReportService {
  async create(data: {
    title: string;
    fileName?: string | null;
    originalName?: string | null;
    fileSize?: number;
    mimeType?: string;
    sourceType?: 'upload' | 'link';
    externalUrl?: string;
    reportDate?: string;
    createdBy: string;
  }) {
    const db = getDb();
    const id = generateUUID();
    await db.insert(reports).values({
      id,
      title: data.title,
      fileName: data.fileName || null,
      originalName: data.originalName || null,
      fileSize: data.fileSize || null,
      mimeType: data.mimeType || null,
      sourceType: data.sourceType || 'upload',
      externalUrl: data.externalUrl || null,
      reportDate: data.reportDate ? new Date(data.reportDate) : new Date(),
      createdBy: data.createdBy,
    });
    return this.getById(id);
  }

  async list(filters: { year?: number; month?: number; startDate?: string; endDate?: string } = {}) {
    const db = getDb();
    const conditions: any[] = [];

    if (filters.year && filters.month) {
      const start = new Date(filters.year, filters.month - 1, 1);
      const end = new Date(filters.year, filters.month, 0, 23, 59, 59);
      conditions.push(sql`${reports.reportDate} >= ${start}`, sql`${reports.reportDate} <= ${end}`);
    } else if (filters.startDate && filters.endDate) {
      conditions.push(
        sql`${reports.reportDate} >= ${new Date(filters.startDate)}`,
        sql`${reports.reportDate} <= ${new Date(filters.endDate)}`,
      );
    }

    return db.select({
      id: reports.id,
      title: reports.title,
      fileName: reports.fileName,
      originalName: reports.originalName,
      fileSize: reports.fileSize,
      mimeType: reports.mimeType,
      sourceType: reports.sourceType,
      externalUrl: reports.externalUrl,
      reportDate: reports.reportDate,
      createdBy: reports.createdBy,
      createdAt: reports.createdAt,
    }).from(reports)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(reports.reportDate))
      .limit(1000);
  }

  async getById(id: string) {
    const db = getDb();
    const [report] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
    return report;
  }

  async update(id: string, data: { title?: string; reportDate?: string }) {
    const db = getDb();
    const [report] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
    if (!report) throw new AppError('Report not found', 404);

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title.trim().slice(0, 255) || report.title;
    if (data.reportDate !== undefined && data.reportDate !== '') {
      const d = new Date(data.reportDate);
      if (isNaN(d.getTime())) throw new AppError('Invalid date', 400);
      updateData.reportDate = d;
    }

    if (Object.keys(updateData).length > 0) {
      await db.update(reports).set(updateData).where(eq(reports.id, id));
    }
    return this.getById(id);
  }

  async remove(id: string) {
    const db = getDb();
    const [report] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
    if (!report) throw new AppError('Report not found', 404);
    await db.delete(reports).where(eq(reports.id, id));
    return report;
  }
}

export const reportService = new ReportService();
