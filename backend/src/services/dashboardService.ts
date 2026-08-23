import { getDb } from '../db/connection';
import { radioHomeGroups, regionalStates, regions, churches, languages, users } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { DashboardStats } from '../types';
import { cache } from '../utils/cache';

const CACHE_PREFIX = 'dashboard:';
const CACHE_TTL = 60;

export class DashboardService {
  async invalidate() {
    await cache.delByPrefix(CACHE_PREFIX);
  }

  private async cacheWrap<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const cached = await cache.get<T>(key);
    if (cached) return cached;
    const value = await loader();
    await cache.set(key, value, CACHE_TTL);
    return value;
  }

  async getStats(): Promise<DashboardStats> {
    return this.cacheWrap(`${CACHE_PREFIX}stats`, async () => {
      const db = getDb();
      const [groupStats] = await db.select({
        totalMale: sql<number>`COALESCE(SUM(${radioHomeGroups.maleMembers}), 0)`,
        totalFemale: sql<number>`COALESCE(SUM(${radioHomeGroups.femaleMembers}), 0)`,
        totalMembers: sql<number>`COALESCE(SUM(${radioHomeGroups.totalMembers}), 0)`,
        totalRadios: sql<number>`COALESCE(SUM(${radioHomeGroups.radioGiven}), 0)`,
        totalAgreements: sql<number>`COALESCE(SUM(${radioHomeGroups.agreementMade}), 0)`,
      }).from(radioHomeGroups);

      const [rsCount] = await db.select({ count: sql<number>`count(*)` }).from(regionalStates);
      const [regionCount] = await db.select({ count: sql<number>`count(*)` }).from(regions);
      const [churchCount] = await db.select({ count: sql<number>`count(*)` }).from(churches);
      const [languageCount] = await db.select({ count: sql<number>`count(*)` }).from(languages);
      const [groupCount] = await db.select({ count: sql<number>`count(*)` }).from(radioHomeGroups);

      const [adminCount] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, 'admin'));
      const [dataEntryCount] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, 'data_entry'));
      const [viewerCount] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, 'viewer'));
      const [radioAssistantCount] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, 'radio_assistant'));

      return {
        totalGroups: Number(groupCount?.count || 0),
        totalRegionalStates: Number(rsCount?.count || 0),
        totalRegions: Number(regionCount?.count || 0),
        totalChurches: Number(churchCount?.count || 0),
        totalLanguages: Number(languageCount?.count || 0),
        totalMaleMembers: Number(groupStats?.totalMale || 0),
        totalFemaleMembers: Number(groupStats?.totalFemale || 0),
        totalMembers: Number(groupStats?.totalMembers || 0),
        totalRadios: Number(groupStats?.totalRadios || 0),
        totalAgreements: Number(groupStats?.totalAgreements || 0),
        totalViewers: Number(viewerCount?.count || 0),
        totalDataEntry: Number(dataEntryCount?.count || 0),
        totalRadioAssistants: Number(radioAssistantCount?.count || 0),
        totalAdmins: Number(adminCount?.count || 0),
      };
    });
  }

  async getGroupsByRegionalState() {
    return this.cacheWrap(`${CACHE_PREFIX}groups-by-regional-state`, async () => {
      const db = getDb();
      const [rows] = await db.execute(sql`
        SELECT 
          rs.name AS regionalStateName,
          COUNT(rhg.id) AS count
        FROM regional_states rs
        LEFT JOIN radio_home_groups rhg ON rhg.regional_state_id = rs.id
        GROUP BY rs.id, rs.name
        ORDER BY COUNT(rhg.id) DESC
      `);
      return (rows as unknown as any[]).map((r) => ({ regionalStateName: r.regionalStateName, count: Number(r.count) }));
    });
  }

  async getGroupsByLanguage() {
    return this.cacheWrap(`${CACHE_PREFIX}groups-by-language`, async () => {
      const db = getDb();
      const rows = await db.select({
        languageName: languages.name,
        count: sql<number>`count(*)`,
      }).from(radioHomeGroups)
        .leftJoin(languages, eq(radioHomeGroups.languageId, languages.id))
        .groupBy(radioHomeGroups.languageId, languages.name)
        .orderBy(sql`count(*) DESC`);
      return rows.map((r) => ({ ...r, count: Number(r.count) }));
    });
  }

  async getMonthlyGroups(year: number) {
    return this.cacheWrap(`${CACHE_PREFIX}monthly-groups:${year}`, async () => {
      const db = getDb();
      const rows = await db.select({
        month: sql<number>`MONTH(${radioHomeGroups.dateStarted})`,
        count: sql<number>`count(*)`,
      }).from(radioHomeGroups)
        .where(sql`YEAR(${radioHomeGroups.dateStarted}) = ${year}`)
        .groupBy(sql`MONTH(${radioHomeGroups.dateStarted})`)
        .orderBy(sql`MONTH(${radioHomeGroups.dateStarted})`);
      return rows.map((r) => ({ ...r, count: Number(r.count) }));
    });
  }

  async getRadiosByMonth(year: number) {
    return this.cacheWrap(`${CACHE_PREFIX}radios-by-month:${year}`, async () => {
      const db = getDb();
      const rows = await db.select({
        month: sql<number>`MONTH(${radioHomeGroups.dateStarted})`,
        total: sql<number>`COALESCE(SUM(${radioHomeGroups.radioGiven}), 0)`,
      }).from(radioHomeGroups)
        .where(sql`YEAR(${radioHomeGroups.dateStarted}) = ${year}`)
        .groupBy(sql`MONTH(${radioHomeGroups.dateStarted})`)
        .orderBy(sql`MONTH(${radioHomeGroups.dateStarted})`);
      return rows.map((r) => ({ ...r, total: Number(r.total) }));
    });
  }

  async getAgreementsByMonth(year: number) {
    return this.cacheWrap(`${CACHE_PREFIX}agreements-by-month:${year}`, async () => {
      const db = getDb();
      const rows = await db.select({
        month: sql<number>`MONTH(${radioHomeGroups.dateStarted})`,
        total: sql<number>`COALESCE(SUM(${radioHomeGroups.agreementMade}), 0)`,
      }).from(radioHomeGroups)
        .where(sql`YEAR(${radioHomeGroups.dateStarted}) = ${year}`)
        .groupBy(sql`MONTH(${radioHomeGroups.dateStarted})`)
        .orderBy(sql`MONTH(${radioHomeGroups.dateStarted})`);
      return rows.map((r) => ({ ...r, total: Number(r.total) }));
    });
  }

  async getMemberByGender() {
    return this.cacheWrap(`${CACHE_PREFIX}member-by-gender`, async () => {
      const db = getDb();
      const [result] = await db.select({
        male: sql<number>`COALESCE(SUM(${radioHomeGroups.maleMembers}), 0)`,
        female: sql<number>`COALESCE(SUM(${radioHomeGroups.femaleMembers}), 0)`,
      }).from(radioHomeGroups);
      return {
        male: Number(result?.male || 0),
        female: Number(result?.female || 0),
      };
    });
  }

  async getRadiosByRegionalState() {
    return this.cacheWrap(`${CACHE_PREFIX}radios-by-regional-state`, async () => {
      const db = getDb();
      const [rows] = await db.execute(sql`
        SELECT 
          rs.name AS regionalStateName,
          COALESCE(SUM(rhg.radio_given), 0) AS total
        FROM radio_home_groups rhg
        INNER JOIN regional_states rs ON rhg.regional_state_id = rs.id
        GROUP BY rs.id, rs.name
        ORDER BY COALESCE(SUM(rhg.radio_given), 0) DESC
      `);
      return (rows as unknown as any[]).map((r) => ({ regionalStateName: r.regionalStateName, total: Number(r.total) }));
    });
  }

  async getRadiosByFacilitator() {
    return this.cacheWrap(`${CACHE_PREFIX}radios-by-facilitator`, async () => {
      const db = getDb();
      const rows = await db.select({
        facilitatorName: radioHomeGroups.facilitatorName,
        total: sql<number>`COALESCE(SUM(${radioHomeGroups.radioGiven}), 0)`,
      }).from(radioHomeGroups)
        .where(sql`${radioHomeGroups.facilitatorName} IS NOT NULL AND ${radioHomeGroups.facilitatorName} <> ''`)
        .groupBy(radioHomeGroups.facilitatorName)
        .orderBy(sql`COALESCE(SUM(${radioHomeGroups.radioGiven}), 0) DESC`);
      return rows.map((r) => ({ ...r, total: Number(r.total) })).filter((r) => r.total > 0);
    });
  }

  async getStatsByRegionalState() {
    return this.cacheWrap(`${CACHE_PREFIX}stats-by-regional-state`, async () => {
      const db = getDb();
      const [rows] = await db.execute(sql`
        SELECT 
          rs.id AS regionalStateId,
          rs.name,
          rs.code,
          COUNT(rhg.id) AS groupCount,
          COALESCE(SUM(rhg.male_members), 0) AS totalMale,
          COALESCE(SUM(rhg.female_members), 0) AS totalFemale,
          COALESCE(SUM(rhg.total_members), 0) AS totalMembers,
          COALESCE(SUM(rhg.radio_given), 0) AS totalRadios,
          COALESCE(SUM(rhg.agreement_made), 0) AS totalAgreements,
          COUNT(DISTINCT rhg.church_id) AS churchCount
        FROM regional_states rs
        LEFT JOIN radio_home_groups rhg ON rhg.regional_state_id = rs.id
        GROUP BY rs.id, rs.name, rs.code
        ORDER BY COUNT(rhg.id) DESC
      `);
      return (rows as unknown as any[]).map((r) => ({
        regionalStateId: r.regionalStateId,
        name: r.name,
        code: r.code,
        groupCount: Number(r.groupCount),
        totalMale: Number(r.totalMale),
        totalFemale: Number(r.totalFemale),
        totalMembers: Number(r.totalMembers),
        totalRadios: Number(r.totalRadios),
        totalAgreements: Number(r.totalAgreements),
        churchCount: Number(r.churchCount),
      }));
    });
  }
}

export const dashboardService = new DashboardService();
