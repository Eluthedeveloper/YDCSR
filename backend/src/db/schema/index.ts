import { mysqlTable, varchar, text, int, datetime, mysqlEnum, index, uniqueIndex } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

// Users table
export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 255 }),
  password: varchar('password', { length: 255 }).notNull(),
  role: mysqlEnum('role', ['admin', 'data_entry', 'viewer', 'radio_assistant']).notNull().default('viewer'),
  regionalStateId: varchar('regional_state_id', { length: 36 }),
  status: mysqlEnum('status', ['active', 'inactive']).notNull().default('active'),
  createdAt: datetime('created_at').notNull().default(sql`(now())`),
  updatedAt: datetime('updated_at').notNull().default(sql`(now())`).$onUpdate(() => new Date()),
}, (table) => ({
  usernameIdx: uniqueIndex('username_idx').on(table.username),
  roleIdx: index('role_idx').on(table.role),
  regionalStateIdx: index('users_rs_idx').on(table.regionalStateId),
}));

// Refresh tokens table
export const refreshTokens = mysqlTable('refresh_tokens', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id),
  token: varchar('token', { length: 500 }).notNull(),
  expiresAt: datetime('expires_at').notNull(),
  createdAt: datetime('created_at').notNull().default(sql`(now())`),
}, (table) => ({
  userIdIdx: index('rt_user_id_idx').on(table.userId),
  tokenIdx: uniqueIndex('rt_token_idx').on(table.token),
}));

// Regional States (top-level: Oromia, Amhara, etc.)
export const regionalStates = mysqlTable('regional_states', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  code: varchar('code', { length: 10 }).notNull().unique(),
  defaultLanguage: varchar('default_language', { length: 255 }).notNull(),
  status: mysqlEnum('status', ['active', 'inactive']).notNull().default('active'),
  createdAt: datetime('created_at').notNull().default(sql`(now())`),
  updatedAt: datetime('updated_at').notNull().default(sql`(now())`).$onUpdate(() => new Date()),
}, (table) => ({
  codeIdx: uniqueIndex('rs_code_idx').on(table.code),
  nameIdx: uniqueIndex('rs_name_idx').on(table.name),
}));

// Regions (sub-divisions under Regional States: East Wollega, West Shewa, etc.)
export const regions = mysqlTable('regions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  regionalStateId: varchar('regional_state_id', { length: 36 }).references(() => regionalStates.id),
  status: mysqlEnum('status', ['active', 'inactive']).notNull().default('active'),
  createdAt: datetime('created_at').notNull().default(sql`(now())`),
  updatedAt: datetime('updated_at').notNull().default(sql`(now())`).$onUpdate(() => new Date()),
}, (table) => ({
  regionalStateIdx: index('region_rs_idx').on(table.regionalStateId),
  nameIdx: index('region_name_idx').on(table.name),
}));

// Languages table
export const languages = mysqlTable('languages', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  createdAt: datetime('created_at').notNull().default(sql`(now())`),
}, (table) => ({
  nameIdx: uniqueIndex('lang_name_idx').on(table.name),
}));

// Churches table
export const churches = mysqlTable('churches', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  regionId: varchar('region_id', { length: 36 }).references(() => regions.id),
  address: text('address'),
  status: mysqlEnum('status', ['active', 'inactive']).notNull().default('active'),
  createdAt: datetime('created_at').notNull().default(sql`(now())`),
  updatedAt: datetime('updated_at').notNull().default(sql`(now())`).$onUpdate(() => new Date()),
}, (table) => ({
  regionIdx: index('church_region_idx').on(table.regionId),
  nameRegionIdx: uniqueIndex('church_name_region_idx').on(table.name, table.regionId),
}));

// Serial number sequences per region
export const serialSequences = mysqlTable('serial_sequences', {
  id: varchar('id', { length: 36 }).primaryKey(),
  regionCode: varchar('region_code', { length: 10 }).notNull().unique(),
  lastNumber: int('last_number').notNull().default(0),
}, (table) => ({
  regionCodeIdx: uniqueIndex('seq_region_code_idx').on(table.regionCode),
}));

// Radio Home Groups
export const radioHomeGroups = mysqlTable('radio_home_groups', {
  id: varchar('id', { length: 36 }).primaryKey(),
  serialNumber: varchar('serial_number', { length: 20 }).notNull().unique(),
  dateStarted: datetime('date_started'),
  regionId: varchar('region_id', { length: 36 }).references(() => regions.id),
  regionalStateId: varchar('regional_state_id', { length: 36 }).references(() => regionalStates.id),
  languageId: varchar('language_id', { length: 36 }).references(() => languages.id),
  churchId: varchar('church_id', { length: 36 }).references(() => churches.id),
  groupLeaderName: varchar('group_leader_name', { length: 255 }),
  groupLeaderPhone: varchar('group_leader_phone', { length: 20 }),
  facilitatorName: varchar('facilitator_name', { length: 255 }),
  facilitatorPhone: varchar('facilitator_phone', { length: 20 }),
  maleMembers: int('male_members').notNull().default(0),
  femaleMembers: int('female_members').notNull().default(0),
  totalMembers: int('total_members').notNull().default(0),
  radioGiven: int('radio_given').notNull().default(0),
  agreementMade: int('agreement_made').notNull().default(0),
  remark: text('remark'),
  status: mysqlEnum('status', ['active', 'inactive', 'closed']).notNull().default('active'),
  createdBy: varchar('created_by', { length: 36 }).notNull().references(() => users.id),
  createdAt: datetime('created_at').notNull().default(sql`(now())`),
  updatedAt: datetime('updated_at').notNull().default(sql`(now())`).$onUpdate(() => new Date()),
}, (table) => ({
  serialIdx: uniqueIndex('rhg_serial_idx').on(table.serialNumber),
  regionIdx: index('rhg_region_idx').on(table.regionId),
  regionalStateIdx: index('rhg_regional_state_idx').on(table.regionalStateId),
  languageIdx: index('rhg_language_idx').on(table.languageId),
  churchIdx: index('rhg_church_idx').on(table.churchId),
  dateIdx: index('rhg_date_idx').on(table.dateStarted),
  statusIdx: index('rhg_status_idx').on(table.status),
  leaderIdx: index('rhg_leader_idx').on(table.groupLeaderName),
  facilitatorIdx: index('rhg_facilitator_idx').on(table.facilitatorName),
}));

// Media table (photos, videos, YouTube links)
export const media = mysqlTable('media', {
  id: varchar('id', { length: 36 }).primaryKey(),
  groupId: varchar('group_id', { length: 36 }).references(() => radioHomeGroups.id),
  type: mysqlEnum('type', ['photo', 'video', 'youtube']).notNull(),
  url: varchar('url', { length: 500 }).notNull(),
  thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
  title: varchar('title', { length: 255 }),
  description: text('description'),
  dateTaken: datetime('date_taken'),
  createdBy: varchar('created_by', { length: 36 }).notNull().references(() => users.id),
  createdAt: datetime('created_at').notNull().default(sql`(now())`),
}, (table) => ({
  groupIdx: index('media_group_idx').on(table.groupId),
  typeIdx: index('media_type_idx').on(table.type),
}));

// Posted PDF reports table
export const reports = mysqlTable('reports', {
  id: varchar('id', { length: 36 }).primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  fileName: varchar('file_name', { length: 255 }),
  originalName: varchar('original_name', { length: 255 }),
  fileSize: int('file_size'),
  mimeType: varchar('mime_type', { length: 100 }),
  sourceType: varchar('source_type', { length: 10 }).notNull().default('upload'),
  externalUrl: varchar('external_url', { length: 500 }),
  reportDate: datetime('report_date').notNull().default(sql`(now())`),
  createdBy: varchar('created_by', { length: 36 }).notNull().references(() => users.id),
  createdAt: datetime('created_at').notNull().default(sql`(now())`),
}, (table) => ({
  reportsCreatedIdx: index('reports_created_idx').on(table.createdAt),
  reportsReportDateIdx: index('reports_report_date_idx').on(table.reportDate),
}));

// Audit logs table
export const auditLogs = mysqlTable('audit_logs', {  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  entity: varchar('entity', { length: 100 }).notNull(),
  entityId: varchar('entity_id', { length: 36 }),
  details: text('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  country: varchar('country', { length: 100 }),
  countryCode: varchar('country_code', { length: 2 }),
  city: varchar('city', { length: 100 }),
  userAgent: text('user_agent'),
  createdAt: datetime('created_at').notNull().default(sql`(now())`),
}, (table) => ({
  userIdIdx: index('al_user_idx').on(table.userId),
  actionIdx: index('al_action_idx').on(table.action),
  entityIdx: index('al_entity_idx').on(table.entity),
  createdAtIdx: index('al_created_idx').on(table.createdAt),
}));

// App settings (key-value store)
export const appSettings = mysqlTable('app_settings', {
  id: varchar('id', { length: 36 }).primaryKey(),
  key: varchar('setting_key', { length: 100 }).notNull().unique(),
  value: varchar('setting_value', { length: 255 }),
  updatedAt: datetime('updated_at').notNull().default(sql`(now())`),
});
