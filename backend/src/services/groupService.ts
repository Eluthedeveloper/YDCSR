import { getDb } from '../db/connection';
import { radioHomeGroups, regions, regionalStates, languages, churches, media, serialSequences, users } from '../db/schema';
import { AppError } from '../middleware/errorHandler';
import { generateUUID, generateSerialNumber, calculatePagination, parseDate } from '../utils/helpers';
import { eq, like, or, and, sql, gte, lte, isNull, ne } from 'drizzle-orm';
import { GroupStatus, UserRole } from '../types';
import { dashboardService } from './dashboardService';

export interface RequesterScope {
  userId: string;
  role: UserRole;
  regionalStateId?: string | null;
}

export class GroupService {
  private isSelfScoped(requester?: RequesterScope | null): boolean {
    return requester?.role === 'data_entry';
  }

  private scopeCondition(requester?: RequesterScope | null) {
    if (requester?.userId) {
      return eq(radioHomeGroups.createdBy, requester.userId);
    }
    return sql`1 = 0`;
  }

  private async invalidateDashboard() {
    await dashboardService.invalidate();
  }
  private async findOrCreateChurch(name: string, regionId?: string | null) {
    const db = getDb();
    const trimmed = name.trim();
    const whereRegion = regionId ? eq(churches.regionId, regionId) : isNull(churches.regionId);
    const [existing] = await db.select()
      .from(churches)
      .where(and(eq(churches.name, trimmed), whereRegion))
      .limit(1);
    if (existing) return existing;
    const id = generateUUID();
    try {
      await db.insert(churches).values({ id, name: trimmed, regionId: regionId || null, status: 'active' });
    } catch (error) {
      const [dup] = await db.select()
        .from(churches)
        .where(and(eq(churches.name, trimmed), whereRegion))
        .limit(1);
      if (dup) return dup;
      throw error;
    }
    return { id, name: trimmed, regionId: regionId || null, status: 'active' };
  }

  private async findOrCreateRegion(name: string, regionalStateId?: string | null) {
    const db = getDb();
    const trimmed = name.trim();
    const whereState = regionalStateId ? eq(regions.regionalStateId, regionalStateId) : isNull(regions.regionalStateId);
    const [existing] = await db.select()
      .from(regions)
      .where(and(eq(regions.name, trimmed), whereState))
      .limit(1);
    if (existing) return existing;
    const id = generateUUID();
    try {
      await db.insert(regions).values({ id, name: trimmed, regionalStateId: regionalStateId || null, status: 'active' });
    } catch (error) {
      const [dup] = await db.select()
        .from(regions)
        .where(and(eq(regions.name, trimmed), whereState))
        .limit(1);
      if (dup) return dup;
      throw error;
    }
    return { id, name: trimmed, regionalStateId: regionalStateId || null, status: 'active' };
  }

  async create(data: {
    dateStarted: string;
    regionId?: string;
    regionalStateId?: string;
    regionName?: string;
    languageId: string;
    churchName: string;
    groupLeaderName: string;
    groupLeaderPhone: string;
    facilitatorName: string;
    facilitatorPhone: string;
    maleMembers?: number;
    femaleMembers?: number;
    radioGiven?: number;
    agreementMade?: number;
    remark?: string;
    status?: GroupStatus;
    createdBy: string;
  }, requester?: RequesterScope | null) {
    const db = getDb();

    if (this.isSelfScoped(requester)) {
      const scopedStateId = requester!.regionalStateId || '';
      if (!scopedStateId) throw new AppError('Your account has no regional state assigned', 403);
      if (data.regionId) {
        const [r] = await db.select({ id: regions.id, regionalStateId: regions.regionalStateId })
          .from(regions).where(eq(regions.id, data.regionId)).limit(1);
        if (!r || !r.regionalStateId || r.regionalStateId !== scopedStateId) {
          data.regionId = undefined;
        }
      }
      data.regionName = undefined;
      data.regionalStateId = scopedStateId;
    }

    let regionId = data.regionId || '';
    let regionalStateId = data.regionalStateId || '';
    let regionalStateCode = '';
    if (regionId) {
      const [region] = await db.select({
        id: regions.id,
        regionalStateCode: regionalStates.code,
        regionalStateId: regions.regionalStateId,
      }).from(regions)
        .leftJoin(regionalStates, eq(regions.regionalStateId, regionalStates.id))
        .where(eq(regions.id, regionId)).limit(1);
      if (!region) throw new AppError('Region not found', 404);
      regionalStateCode = region.regionalStateCode || '';
      regionalStateId = region.regionalStateId || regionalStateId;
    } else if (data.regionalStateId) {
      const [rs] = await db.select({ id: regionalStates.id, code: regionalStates.code })
        .from(regionalStates).where(eq(regionalStates.id, data.regionalStateId)).limit(1);
      if (!rs) throw new AppError('Regional state not found', 404);
      regionalStateCode = rs.code || '';
      if (data.regionName) {
        const region = await this.findOrCreateRegion(data.regionName, data.regionalStateId);
        regionId = region.id;
      } else {
        const [firstRegion] = await db.select({ id: regions.id })
          .from(regions)
          .where(and(eq(regions.regionalStateId, data.regionalStateId), eq(regions.status, 'active')))
          .limit(1);
        regionId = firstRegion?.id || '';
      }
    } else {
      throw new AppError('Region or regional state is required', 400);
    }
    if (!regionId) throw new AppError('No region found for the selected regional state', 400);

    const [lang] = await db.select().from(languages).where(eq(languages.id, data.languageId)).limit(1);
    if (!lang) throw new AppError('Language not found', 404);

    const church = await this.findOrCreateChurch(data.churchName, regionId);

    const serialNumber = await generateSerialNumber(regionalStateCode || '');
    const male = data.maleMembers || 0;
    const female = data.femaleMembers || 0;

    const phone = (data.groupLeaderPhone || '').trim();
    const normalizedPhone = this.normalizePhone(phone);
    if (normalizedPhone) {
      const [dup] = await db.select({ id: radioHomeGroups.id }).from(radioHomeGroups)
        .where(this.phoneNormalizedCondition(radioHomeGroups.groupLeaderPhone, normalizedPhone)).limit(1);
      if (dup) throw new AppError('Group leader phone number is already in use', 400);
    }

    const id = generateUUID();
    await db.insert(radioHomeGroups).values({
      id,
      serialNumber,
      dateStarted: parseDate(data.dateStarted),
      regionId,
      regionalStateId: regionalStateId || null,
      languageId: data.languageId,
      churchId: church.id,
      groupLeaderName: data.groupLeaderName,
      groupLeaderPhone: phone || null,
      facilitatorName: data.facilitatorName,
      facilitatorPhone: data.facilitatorPhone,
      maleMembers: male,
      femaleMembers: female,
      totalMembers: male + female,
      radioGiven: data.radioGiven || 0,
      agreementMade: data.agreementMade || 0,
      remark: data.remark || null,
      status: data.status || 'active',
      createdBy: data.createdBy,
    });

    await this.invalidateDashboard();
    return this.getById(id);
  }

  async update(id: string, data: Partial<{
    dateStarted: string;
    regionId?: string;
    regionalStateId?: string;
    regionName?: string;
    languageId: string;
    churchName: string;
    groupLeaderName: string;
    groupLeaderPhone: string;
    facilitatorName: string;
    facilitatorPhone: string;
    maleMembers: number;
    femaleMembers: number;
    radioGiven: number;
    agreementMade: number;
    remark: string;
    status: GroupStatus;
  }>, requester?: RequesterScope) {
    const db = getDb();
    const [group] = await db.select().from(radioHomeGroups).where(eq(radioHomeGroups.id, id)).limit(1);
    if (!group) throw new AppError('Group not found', 404);

    const selfScoped = this.isSelfScoped(requester);
    if (selfScoped) {
      if (!requester!.regionalStateId) throw new AppError('Your account has no regional state assigned', 403);
      if (group.createdBy !== requester!.userId) {
        throw new AppError('You can only edit records you entered', 403);
      }
    }

    const updateData: Record<string, unknown> = {};

    const nullableStr = (v: unknown): string | null => (v === undefined || v === null ? null : String(v).trim() || null);

    if (data.dateStarted !== undefined) updateData.dateStarted = data.dateStarted ? parseDate(data.dateStarted) : null;
    if (data.regionId || data.regionalStateId) {
      let targetStateId = data.regionalStateId || '';
      if (selfScoped) {
        targetStateId = requester!.regionalStateId!;
        data.regionName = undefined;
        if (data.regionId) {
          const [r] = await db.select({ id: regions.id, regionalStateId: regions.regionalStateId })
            .from(regions).where(eq(regions.id, data.regionId)).limit(1);
          if (!r || !r.regionalStateId || r.regionalStateId !== targetStateId) {
            throw new AppError('You can only use regions within your assigned regional state', 403);
          }
        }
      }
      let regionId = data.regionId || '';
      if (!regionId) {
        if (data.regionName) {
          const region = await this.findOrCreateRegion(data.regionName, targetStateId);
          regionId = region.id;
        } else {
          const [firstRegion] = await db.select({ id: regions.id }).from(regions)
            .where(and(eq(regions.regionalStateId, targetStateId), eq(regions.status, 'active')))
            .limit(1);
          regionId = firstRegion?.id || '';
        }
      }
      if (!regionId) throw new AppError('No region found for the selected regional state', 400);
      const [region] = await db.select({ id: regions.id, regionalStateId: regions.regionalStateId }).from(regions).where(eq(regions.id, regionId)).limit(1);
      if (!region) throw new AppError('Region not found', 404);
      updateData.regionId = regionId;
      if (region.regionalStateId) updateData.regionalStateId = region.regionalStateId;
    }
    if (data.languageId !== undefined) {
      if (data.languageId) {
        const [lang] = await db.select().from(languages).where(eq(languages.id, data.languageId)).limit(1);
        if (!lang) throw new AppError('Language not found', 404);
      }
      updateData.languageId = data.languageId || null;
    }
    if (data.churchName !== undefined) {
      if (data.churchName) {
        const church = await this.findOrCreateChurch(data.churchName, updateData.regionId as string || group.regionId);
        updateData.churchId = church.id;
      } else {
        updateData.churchId = null;
      }
    }
    if (data.groupLeaderName !== undefined) updateData.groupLeaderName = nullableStr(data.groupLeaderName);
    if (data.groupLeaderPhone !== undefined) updateData.groupLeaderPhone = nullableStr(data.groupLeaderPhone);
    if (data.groupLeaderPhone !== undefined && data.groupLeaderPhone.trim()) {
      const normalizedPhone = this.normalizePhone(data.groupLeaderPhone);
      if (normalizedPhone) {
        const [dup] = await db.select({ id: radioHomeGroups.id }).from(radioHomeGroups)
          .where(and(this.phoneNormalizedCondition(radioHomeGroups.groupLeaderPhone, normalizedPhone), ne(radioHomeGroups.id, id))).limit(1);
        if (dup) throw new AppError('Group leader phone number is already in use', 400);
      }
    }
    if (data.facilitatorName !== undefined) updateData.facilitatorName = nullableStr(data.facilitatorName);
    if (data.facilitatorPhone !== undefined) updateData.facilitatorPhone = nullableStr(data.facilitatorPhone);
    if (data.maleMembers !== undefined) updateData.maleMembers = data.maleMembers;
    if (data.femaleMembers !== undefined) updateData.femaleMembers = data.femaleMembers;
    if (data.radioGiven !== undefined) updateData.radioGiven = data.radioGiven;
    if (data.agreementMade !== undefined) updateData.agreementMade = data.agreementMade;
    if (data.remark !== undefined) updateData.remark = data.remark || null;
    if (data.status) updateData.status = data.status;

    const male = (updateData.maleMembers as number) ?? group.maleMembers;
    const female = (updateData.femaleMembers as number) ?? group.femaleMembers;
    if (data.maleMembers !== undefined || data.femaleMembers !== undefined) {
      updateData.totalMembers = male + female;
    }

    await db.update(radioHomeGroups).set(updateData).where(eq(radioHomeGroups.id, id));
    await this.invalidateDashboard();
    return this.getById(id);
  }

  private baseQuery() {
    const db = getDb();
    return db.select({
      id: radioHomeGroups.id,
      serialNumber: radioHomeGroups.serialNumber,
      dateStarted: radioHomeGroups.dateStarted,
      regionId: radioHomeGroups.regionId,
      regionName: regions.name,
      regionalStateId: radioHomeGroups.regionalStateId,
      regionalStateName: regionalStates.name,
      regionalStateCode: regionalStates.code,
      languageId: radioHomeGroups.languageId,
      languageName: languages.name,
      churchId: radioHomeGroups.churchId,
      churchName: churches.name,
      groupLeaderName: radioHomeGroups.groupLeaderName,
      groupLeaderPhone: radioHomeGroups.groupLeaderPhone,
      facilitatorName: radioHomeGroups.facilitatorName,
      facilitatorPhone: radioHomeGroups.facilitatorPhone,
      maleMembers: radioHomeGroups.maleMembers,
      femaleMembers: radioHomeGroups.femaleMembers,
      totalMembers: radioHomeGroups.totalMembers,
      radioGiven: radioHomeGroups.radioGiven,
      agreementMade: radioHomeGroups.agreementMade,
      remark: radioHomeGroups.remark,
      status: radioHomeGroups.status,
      createdBy: radioHomeGroups.createdBy,
      createdByName: users.fullName,
      createdByRole: users.role,
      createdAt: radioHomeGroups.createdAt,
      updatedAt: radioHomeGroups.updatedAt,
    }).from(radioHomeGroups)
      .leftJoin(regions, eq(radioHomeGroups.regionId, regions.id))
      .leftJoin(regionalStates, sql`coalesce(${radioHomeGroups.regionalStateId}, ${regions.regionalStateId}) = ${regionalStates.id}`)
      .leftJoin(languages, eq(radioHomeGroups.languageId, languages.id))
      .leftJoin(churches, eq(radioHomeGroups.churchId, churches.id))
      .leftJoin(users, eq(radioHomeGroups.createdBy, users.id));
  }

  async getById(id: string, requester?: RequesterScope | null) {
    const conditions: any[] = [eq(radioHomeGroups.id, id)];
    if (this.isSelfScoped(requester)) {
      conditions.push(this.scopeCondition(requester));
    }
    const [group] = await this.baseQuery()
      .where(and(...conditions)).limit(1);

    if (!group) throw new AppError('Group not found', 404);
    return group;
  }

  async list(params: {
    page?: number;
    limit?: number;
    search?: string;
    regionalStateId?: string;
    churchId?: string;
    languageId?: string;
    year?: string;
    month?: string;
    from?: string;
    to?: string;
    entryFrom?: string;
    entryTo?: string;
    createdBy?: string;
    creatorRole?: UserRole;
    status?: string;
  }, requester?: RequesterScope | null) {
    const db = getDb();
    const { page, limit, offset } = calculatePagination(params.page || 1, params.limit || 20);

    const conditions: any[] = [];
    if (this.isSelfScoped(requester)) {
      conditions.push(this.scopeCondition(requester));
    }
    if (params.search) {
      const s = `%${params.search}%`;
      conditions.push(or(
        like(radioHomeGroups.serialNumber, s),
        like(radioHomeGroups.groupLeaderName, s),
        like(radioHomeGroups.facilitatorName, s),
        like(radioHomeGroups.groupLeaderPhone, s),
        like(radioHomeGroups.facilitatorPhone, s),
        like(churches.name, s),
        like(regions.name, s),
        like(regionalStates.name, s),
      ));
    }
    if (params.regionalStateId) conditions.push(eq(radioHomeGroups.regionalStateId, params.regionalStateId));
    if (params.churchId) conditions.push(eq(radioHomeGroups.churchId, params.churchId));
    if (params.languageId) conditions.push(eq(radioHomeGroups.languageId, params.languageId));
    if (params.status) conditions.push(eq(radioHomeGroups.status, params.status as 'active' | 'inactive' | 'closed'));
    if (params.year) {
      const year = parseInt(params.year);
      conditions.push(gte(radioHomeGroups.dateStarted, new Date(year, 0, 1)));
      conditions.push(lte(radioHomeGroups.dateStarted, new Date(year, 11, 31, 23, 59, 59, 999)));
    }
    if (params.month && params.year) {
      const m = parseInt(params.month);
      const year = parseInt(params.year);
      conditions.push(gte(radioHomeGroups.dateStarted, new Date(year, m - 1, 1)));
      conditions.push(lte(radioHomeGroups.dateStarted, new Date(year, m, 0, 23, 59, 59, 999)));
    }
    if (params.from) {
      conditions.push(gte(radioHomeGroups.dateStarted, parseDate(params.from)));
    }
    if (params.to) {
      conditions.push(lte(radioHomeGroups.dateStarted, new Date(parseDate(params.to).getTime() + 86399999)));
    }
    if (params.entryFrom) {
      conditions.push(gte(radioHomeGroups.createdAt, parseDate(params.entryFrom)));
    }
    if (params.entryTo) {
      conditions.push(lte(radioHomeGroups.createdAt, new Date(parseDate(params.entryTo).getTime() + 86399999)));
    }
    if (params.createdBy) {
      conditions.push(eq(radioHomeGroups.createdBy, params.createdBy));
    }
    if (params.creatorRole) {
      conditions.push(eq(users.role, params.creatorRole));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(radioHomeGroups)
      .leftJoin(regions, eq(radioHomeGroups.regionId, regions.id))
      .leftJoin(regionalStates, sql`coalesce(${radioHomeGroups.regionalStateId}, ${regions.regionalStateId}) = ${regionalStates.id}`)
      .leftJoin(churches, eq(radioHomeGroups.churchId, churches.id))
      .leftJoin(users, eq(radioHomeGroups.createdBy, users.id))
      .where(where);
    const total = Number(totalResult?.count || 0);

    const items = await this.baseQuery()
      .where(where)
      .limit(limit).offset(offset)
      .orderBy(sql`${radioHomeGroups.createdAt} DESC`);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getAll(requester?: RequesterScope | null) {
    const query = this.baseQuery();
    if (this.isSelfScoped(requester)) {
      return query.where(this.scopeCondition(requester)).orderBy(sql`${radioHomeGroups.createdAt} DESC`);
    }
    return query.orderBy(sql`${radioHomeGroups.createdAt} DESC`);
  }

  private normalizeKey(key: string): string {
    return String(key || '').toLowerCase().replace(/[\s_]+/g, ' ').trim();
  }

  private getField(row: Record<string, unknown>, aliases: string[]): unknown {
    const normalized = aliases.map(a => this.normalizeKey(a));
    for (const [key, value] of Object.entries(row)) {
      if (normalized.includes(this.normalizeKey(key))) return value;
    }
    return undefined;
  }

  private toInt(value: unknown): number {
    if (value === undefined || value === null || value === '') return 0;
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }

  private toYesNo(value: unknown): number {
    if (value === undefined || value === null || value === '') return 0;
    const str = String(value).trim().toLowerCase();
    if (['yes', 'true', 'y', '1'].includes(str)) return 1;
    if (['no', 'false', 'n', '0'].includes(str)) return 0;
    return 0;
  }

  private normalizePhone(value: string): string {
    return String(value || '').replace(/\D/g, '').replace(/^0+/, '');
  }

  private phoneNormalizedCondition(column: any, normalized: string) {
    return sql`REGEXP_REPLACE(REGEXP_REPLACE(${column}, '[^0-9]', ''), '^0+', '') = ${normalized}`;
  }

  private normalizeStateName(name: string): string {
    return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private generateStateCode(name: string, usedCodes: Set<string>): string {
    const letters = String(name || '').toUpperCase().replace(/[^A-Z]/g, '');
    const base = (letters || 'ST').slice(0, 3);
    let code = base;
    let i = 1;
    while (usedCodes.has(code)) {
      code = `${base}${i}`;
      i++;
    }
    return code;
  }

  private parseImportDate(value: unknown): Date | null {
    if (value === undefined || value === null || value === '') return null;
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === 'number') {
      const d = new Date(Math.round((value - 25569) * 86400 * 1000));
      return isNaN(d.getTime()) ? null : d;
    }
    const str = String(value).trim();
    if (!str) return null;
    // Excel renders dates in too-narrow cells as #####... ; treat as missing
    if (/^#+$/.test(str)) return null;
    // dd/mm/yyyy (also d/m/yyyy)
    const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      let d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
      if (isNaN(d.getTime()) && Number(m[2]) > 12) {
        d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
      }
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  async importRows(rows: Record<string, unknown>[], createdBy: string) {
    const db = getDb();
    const result = { imported: 0, failed: 0, errors: [] as { row: number; message: string }[] };
    const stateCache = new Map<string, { id: string; code: string }>();
    const langCache = new Map<string, string>();
    const regionCache = new Map<string, string>();
    const churchCache = new Map<string, string>();

    const allStates = await db.select({ id: regionalStates.id, name: regionalStates.name, code: regionalStates.code })
      .from(regionalStates);
    const stateByNormalized = new Map<string, { id: string; code: string }>();
    const usedStateCodes = new Set<string>();
    for (const s of allStates) {
      stateByNormalized.set(this.normalizeStateName(s.name), { id: s.id, code: s.code || '' });
      if (s.code) usedStateCodes.add(s.code);
    }

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      try {
        const dateStarted = this.getField(row, ['date started', 'start date', 'date']);
        const stateName = String(this.getField(row, ['regional state', 'state']) || '').trim();
        const regionName = String(this.getField(row, ['region']) || '').trim();
        const langName = String(this.getField(row, ['language']) || '').trim();
        const churchName = String(this.getField(row, ['church', 'church name']) || '').trim();

        const leaderName = String(this.getField(row, ['group leader', 'group leader name', 'leader']) || '').trim();
        const leaderPhone = String(this.getField(row, ['group leader phone', 'leader phone']) || '').trim();
        const facilitatorName = String(this.getField(row, ['facilitator', 'facilitator name']) || '').trim();
        const facilitatorPhone = String(this.getField(row, ['facilitator phone']) || '').trim();
        const male = this.toInt(this.getField(row, ['male', 'male members']));
        const female = this.toInt(this.getField(row, ['female', 'female members']));
        const radioGiven = this.toYesNo(this.getField(row, ['radios given', 'radio given', 'radio']));
        const agreementMade = this.toYesNo(this.getField(row, ['agreements made', 'agreement made', 'agreement']));
        const remark = String(this.getField(row, ['remark']) || '').trim() || null;
        const rawStatus = String(this.getField(row, ['status']) || '').trim().toLowerCase();
        const status = (['inactive', 'closed'].includes(rawStatus) ? rawStatus : 'active') as GroupStatus;

        let state: { id: string; code: string } | null = null;
        if (stateName) {
          const stateKey = this.normalizeStateName(stateName);
          state = stateCache.get(stateKey) ?? null;
          if (!state) {
            const found = stateByNormalized.get(stateKey);
            if (found) {
              state = { id: found.id, code: found.code };
            } else {
              const id = generateUUID();
              const code = this.generateStateCode(stateName, usedStateCodes);
              await db.insert(regionalStates).values({
                id,
                name: stateName,
                code,
                defaultLanguage: langName || '',
                status: 'active',
              });
              usedStateCodes.add(code);
              stateByNormalized.set(stateKey, { id, code });
              state = { id, code };
            }
            stateCache.set(stateKey, state);
          }
        }

        let langId: string | null = null;
        if (langName) {
          langId = langCache.get(langName) ?? null;
          if (!langId) {
            const [langRow] = await db.select({ id: languages.id }).from(languages).where(eq(languages.name, langName)).limit(1);
            langId = langRow?.id;
            if (!langId) {
              langId = generateUUID();
              await db.insert(languages).values({ id: langId, name: langName });
            }
            langCache.set(langName, langId);
          }
        }

        const regionKey = `${state?.id || ''}::${regionName}`;
        let regionId: string | null = null;
        if (regionName) {
          regionId = regionCache.get(regionKey) ?? null;
          if (!regionId) {
            const region = await this.findOrCreateRegion(regionName, state?.id);
            regionId = region.id;
            regionCache.set(regionKey, regionId);
          }
        }

        const churchKey = `${regionId || ''}::${churchName}`;
        let churchId: string | null = null;
        if (churchName) {
          churchId = churchCache.get(churchKey) ?? null;
          if (!churchId) {
            const church = await this.findOrCreateChurch(churchName, regionId);
            churchId = church.id;
            churchCache.set(churchKey, churchId);
          }
        }

        const serialNumber = await generateSerialNumber(state?.code || '');
        const parsedDate = dateStarted ? this.parseImportDate(dateStarted) : null;

        await db.insert(radioHomeGroups).values({
          id: generateUUID(),
          serialNumber,
          dateStarted: parsedDate,
          regionId,
          regionalStateId: state?.id || null,
          languageId: langId,
          churchId,
          groupLeaderName: leaderName || null,
          groupLeaderPhone: leaderPhone || null,
          facilitatorName: facilitatorName || null,
          facilitatorPhone: facilitatorPhone || null,
          maleMembers: male,
          femaleMembers: female,
          totalMembers: male + female,
          radioGiven,
          agreementMade,
          remark,
          status,
          createdBy,
        });

        result.imported++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({ row: idx + 2, message: error?.message || 'Import failed' });
      }
    }

    await this.invalidateDashboard();
    return result;
  }

  async deleteAll() {
    const db = getDb();
    return db.transaction(async (tx) => {
      const [mediaCount] = await tx.select({ count: sql<number>`count(*)` })
        .from(media)
        .where(sql`${media.groupId} IS NOT NULL`);
      const [groupCount] = await tx.select({ count: sql<number>`count(*)` })
        .from(radioHomeGroups);

      await tx.delete(media).where(sql`${media.groupId} IS NOT NULL`);
      await tx.delete(radioHomeGroups);
      await tx.delete(serialSequences);

      await this.invalidateDashboard();

      return {
        groupsDeleted: Number(groupCount?.count || 0),
        mediaDeleted: Number(mediaCount?.count || 0),
      };
    });
  }

  async delete(id: string) {
    const db = getDb();
    const [group] = await db.select().from(radioHomeGroups).where(eq(radioHomeGroups.id, id)).limit(1);
    if (!group) throw new AppError('Group not found', 404);
    const [mediaCount] = await db.select({ count: sql<number>`count(*)` })
      .from(media)
      .where(eq(media.groupId, id));
    if (Number(mediaCount?.count || 0) > 0) {
      throw new AppError('Cannot delete group: media items are attached to it. Remove the media first.', 400);
    }
    await db.delete(radioHomeGroups).where(eq(radioHomeGroups.id, id));
    await this.invalidateDashboard();
  }
}

export const groupService = new GroupService();
