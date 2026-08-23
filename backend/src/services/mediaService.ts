import { getDb } from '../db/connection';
import { media, radioHomeGroups, regions, reports } from '../db/schema';
import { AppError } from '../middleware/errorHandler';
import { generateUUID } from '../utils/helpers';
import { UserRole } from '../types';
import { eq, and, sql, between, desc } from 'drizzle-orm';
import { config } from '../config';
import path from 'path';
import fs from 'fs';

const MONTHS_PER_PERIOD = 3;

/** YYYY-MM-DD using the server's local calendar (no UTC shifting). */
function toLocalDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Calendar-based window for an archive page.
 * Page 1 covers the latest 3 months (2 months ago -> end of current month),
 * page 2 the 3 months before that, and so on.
 */
function buildPeriodWindow(page: number) {
  const now = new Date();
  const currentAbs = now.getFullYear() * 12 + now.getMonth();
  const endAbs = currentAbs - (page - 1) * MONTHS_PER_PERIOD;
  const startAbs = endAbs - (MONTHS_PER_PERIOD - 1);
  const start = new Date(Math.floor(startAbs / 12), ((startAbs % 12) + 12) % 12, 1, 0, 0, 0);
  const end = new Date(Math.floor(endAbs / 12), (((endAbs % 12) + 12) % 12) + 1, 0, 23, 59, 59);
  return { start, end };
}

export class MediaService {
  private deleteFileFromDisk(url: string | null) {
    if (!url) return;
    let urlPath: string;
    try {
      urlPath = url.startsWith('http') ? new URL(url).pathname : url;
    } catch {
      urlPath = url;
    }
    if (!urlPath.startsWith('/uploads/')) return;

    const uploadDir = path.resolve(process.cwd(), config.upload.dir);
    const filePath = path.resolve(uploadDir, urlPath.replace('/uploads/', ''));
    if (filePath.startsWith(uploadDir + path.sep) && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // ignore errors cleaning up orphaned files
      }
    }
  }

  async create(data: {
    groupId?: string;
    type: 'photo' | 'video' | 'youtube';
    url: string;
    thumbnailUrl?: string;
    title?: string;
    description?: string;
    dateTaken?: string;
    createdBy: string;
  }) {
    const db = getDb();
    if (data.groupId) {
      const [group] = await db.select().from(radioHomeGroups).where(eq(radioHomeGroups.id, data.groupId)).limit(1);
      if (!group) throw new AppError('Group not found', 404);
    }

    const id = generateUUID();
    await db.insert(media).values({
      id,
      groupId: data.groupId || null,
      type: data.type,
      url: data.url,
      thumbnailUrl: data.thumbnailUrl || null,
      title: data.title || null,
      description: data.description || null,
      dateTaken: data.dateTaken ? new Date(data.dateTaken) : null,
      createdBy: data.createdBy,
    });
    return this.getById(id);
  }

  async getById(id: string) {
    const db = getDb();
    const [item] = await db.select().from(media).where(eq(media.id, id)).limit(1);
    if (!item) throw new AppError('Media not found', 404);
    return item;
  }

  async getByGroup(groupId: string) {
    const db = getDb();
    return db.select().from(media)
      .where(eq(media.groupId, groupId))
      .orderBy(media.createdAt);
  }

  async getByDateRange(startDate: string, endDate: string, type?: string) {
    const db = getDb();
    const conditions: any[] = [];
    
    if (type && type !== 'all') {
      conditions.push(eq(media.type, type as 'photo' | 'video' | 'youtube'));
    }

    return db.select({
      id: media.id,
      groupId: media.groupId,
      type: media.type,
      url: media.url,
      thumbnailUrl: media.thumbnailUrl,
      title: media.title,
      description: media.description,
      dateTaken: media.dateTaken,
      createdAt: media.createdAt,
      createdBy: media.createdBy,
      groupSerialNumber: radioHomeGroups.serialNumber,
      regionName: regions.name,
    }).from(media)
      .leftJoin(radioHomeGroups, eq(media.groupId, radioHomeGroups.id))
      .leftJoin(regions, eq(radioHomeGroups.regionId, regions.id))
      .where(
        and(
          sql`${media.dateTaken} >= ${new Date(startDate)}`,
          sql`${media.dateTaken} <= ${new Date(endDate)}`,
          ...conditions
        )
      )
      .orderBy(media.dateTaken);
  }

  async getByMonth(year: number, month: number, type?: string) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const conditions: any[] = [
      sql`${media.dateTaken} >= ${startDate}`,
      sql`${media.dateTaken} <= ${endDate}`,
    ];
    if (type && type !== 'all') {
      conditions.push(eq(media.type, type as 'photo' | 'video' | 'youtube'));
    }

    const db = getDb();
    const items = await db.select({
      id: media.id,
      groupId: media.groupId,
      type: media.type,
      url: media.url,
      thumbnailUrl: media.thumbnailUrl,
      title: media.title,
      description: media.description,
      dateTaken: media.dateTaken,
      createdAt: media.createdAt,
      createdBy: media.createdBy,
      serialNumber: radioHomeGroups.serialNumber,
      regionName: regions.name,
    }).from(media)
      .leftJoin(radioHomeGroups, eq(media.groupId, radioHomeGroups.id))
      .leftJoin(regions, eq(radioHomeGroups.regionId, regions.id))
      .where(and(...conditions))
      .orderBy(media.dateTaken);

    return items;
  }

  private async countArchivePeriods(): Promise<number> {
    const db = getDb();
    const [m] = await db
      .select({ oldest: sql<string | null>`MIN(COALESCE(${media.dateTaken}, ${media.createdAt}))` })
      .from(media);
    const [r] = await db
      .select({ oldest: sql<string | null>`MIN(COALESCE(${reports.reportDate}, ${reports.createdAt}))` })
      .from(reports);

    const times = [m?.oldest, r?.oldest]
      .filter(Boolean)
      .map(v => new Date(v as string).getTime())
      .filter(t => !isNaN(t));
    if (!times.length) return 1;

    const oldest = new Date(Math.min(...times));
    const oldestAbs = oldest.getFullYear() * 12 + oldest.getMonth();
    const nowAbs = new Date().getFullYear() * 12 + new Date().getMonth();
    return Math.max(1, Math.ceil((nowAbs - oldestAbs + 1) / MONTHS_PER_PERIOD));
  }

  /**
   * Media + PDF report archive.
   * Default (no range): paged by 3-month periods — page 1 = latest 3 months,
   * page 2 = previous 3 months, etc. totalPages is derived from the oldest record.
   * With startDate & endDate: returns everything in that custom range as a single window.
   */
  async getArchive(params: { page?: number; startDate?: string; endDate?: string }) {
    const db = getDb();
    let start: Date;
    let end: Date;
    let page: number;
    let totalPages: number | null;

    if (params.startDate && params.endDate) {
      start = new Date(params.startDate);
      end = new Date(params.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new AppError('Invalid date range', 400);
      if (start > end) throw new AppError('startDate must be before endDate', 400);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      page = 1;
      totalPages = null;
    } else {
      page = params.page && Number.isInteger(params.page) && params.page >= 1 ? params.page : 1;
      ({ start, end } = buildPeriodWindow(page));
      totalPages = await this.countArchivePeriods();
    }

    const mediaDateExpr = sql`COALESCE(${media.dateTaken}, ${media.createdAt})`;
    const items = await db.select({
      id: media.id,
      groupId: media.groupId,
      type: media.type,
      url: media.url,
      thumbnailUrl: media.thumbnailUrl,
      title: media.title,
      description: media.description,
      dateTaken: media.dateTaken,
      createdAt: media.createdAt,
      createdBy: media.createdBy,
      groupSerialNumber: radioHomeGroups.serialNumber,
      regionName: regions.name,
    }).from(media)
      .leftJoin(radioHomeGroups, eq(media.groupId, radioHomeGroups.id))
      .leftJoin(regions, eq(radioHomeGroups.regionId, regions.id))
      .where(and(
        sql`${mediaDateExpr} >= ${start}`,
        sql`${mediaDateExpr} <= ${end}`,
      ))
      .orderBy(desc(mediaDateExpr));

    const reportDateExpr = sql`COALESCE(${reports.reportDate}, ${reports.createdAt})`;
    const reportRows = await db.select({
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
      .where(and(
        sql`${reportDateExpr} >= ${start}`,
        sql`${reportDateExpr} <= ${end}`,
      ))
      .orderBy(desc(reportDateExpr));

    return {
      items,
      reports: reportRows,
      page,
      totalPages,
      period: { start: toLocalDateString(start), end: toLocalDateString(end) },
    };
  }

  async delete(id: string) {
    const db = getDb();
    const [item] = await db.select().from(media).where(eq(media.id, id)).limit(1);
    if (!item) throw new AppError('Media not found', 404);
    await db.delete(media).where(eq(media.id, id));
    this.deleteFileFromDisk(item.url);
  }

  async update(id: string, data: Partial<{
    title: string;
    description: string;
    url: string;
    thumbnailUrl: string;
    dateTaken: string;
  }>, requester?: { userId: string; role: UserRole }) {
    const db = getDb();
    const [item] = await db.select().from(media).where(eq(media.id, id)).limit(1);
    if (!item) throw new AppError('Media not found', 404);
    if (requester?.role === 'data_entry' && item.createdBy !== requester.userId) {
      throw new AppError('You can only edit records you entered', 403);
    }

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.url !== undefined) updateData.url = data.url;
    if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl;
    if (data.dateTaken !== undefined) updateData.dateTaken = new Date(data.dateTaken);

    const oldUrl = item.url;
    await db.update(media).set(updateData).where(eq(media.id, id));
    if (data.url !== undefined && data.url !== oldUrl) {
      this.deleteFileFromDisk(oldUrl);
    }
    return this.getById(id);
  }
}

export const mediaService = new MediaService();
