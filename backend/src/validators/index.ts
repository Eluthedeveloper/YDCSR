import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const userBaseSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(255),
  username: z.string().min(3, 'Username must be at least 3 characters').max(100),
  phone: z.string().min(1, 'Phone is required').max(20).regex(/^\+?[\d\s-]+$/, 'Invalid phone number'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  role: z.enum(['admin', 'data_entry', 'viewer', 'radio_assistant']),
  regionalStateId: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const createUserSchema = userBaseSchema.superRefine((val, ctx) => {
  if (val.role === 'data_entry' && !val.regionalStateId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['regionalStateId'], message: 'Regional state is required for data entry clerks' });
  }
});

export const updateUserSchema = userBaseSchema.partial().omit({ password: true }).extend({
  password: z.string().min(6).max(100).optional(),
});

export const createRegionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  code: z.string().min(1, 'Code is required').max(10),
  defaultLanguage: z.string().min(1, 'Default language is required').max(255),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const updateRegionSchema = createRegionSchema.partial();

export const createSubRegionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  regionalStateId: z.string().min(1, 'Regional state is required'),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const updateSubRegionSchema = createSubRegionSchema.partial();

export const createLanguageSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
});

export const createChurchSchema = z.object({
  name: z.string().min(1, 'Church name is required').max(255),
  regionId: z.string().min(1, 'Region is required'),
  address: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const updateChurchSchema = createChurchSchema.partial();

export const createGroupSchema = z.object({
  dateStarted: z.string().min(1, 'Date started is required'),
  regionId: z.string().optional(),
  regionalStateId: z.string().optional(),
  regionName: z.string().optional().or(z.literal('')),
  languageId: z.string().min(1, 'Language is required'),
  churchName: z.string().min(1, 'Church is required'),
  groupLeaderName: z.string().min(1, 'Group leader name is required').max(255),
  groupLeaderPhone: z.string().min(1, 'Group leader phone is required').max(20),
  facilitatorName: z.string().min(1, 'Facilitator name is required').max(255),
  facilitatorPhone: z.string().min(1, 'Facilitator phone is required').max(20),
  maleMembers: z.number().int().min(0).default(0),
  femaleMembers: z.number().int().min(0).default(0),
  radioGiven: z.number().int().min(0).default(0),
  agreementMade: z.number().int().min(0).default(0),
  remark: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'closed']).default('active'),
});

export const updateGroupSchema = createGroupSchema.partial()
  .extend({
    dateStarted: z.string().nullish(),
    regionId: z.string().nullish(),
    regionalStateId: z.string().nullish(),
    regionName: z.string().nullish(),
    languageId: z.string().nullish(),
    churchName: z.string().max(255).nullish(),
    groupLeaderName: z.string().max(255).nullish(),
    groupLeaderPhone: z.string().max(20).nullish(),
    facilitatorName: z.string().max(255).nullish(),
    facilitatorPhone: z.string().max(20).nullish(),
    maleMembers: z.number().int().min(0).nullish(),
    femaleMembers: z.number().int().min(0).nullish(),
    radioGiven: z.number().int().min(0).nullish(),
    agreementMade: z.number().int().min(0).nullish(),
    remark: z.string().nullish(),
    status: z.enum(['active', 'inactive', 'closed']).nullish(),
  })
  .transform((data) => {
    // Treat blank/null values as "skip this field" on update
    const cleaned: Record<string, unknown> = {};
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) cleaned[key] = value;
    });
    return cleaned;
  });

export const searchGroupsSchema = z.object({
  search: z.string().optional(),
  regionalStateId: z.string().optional(),
  churchId: z.string().optional(),
  languageId: z.string().optional(),
  year: z.string().regex(/^\d{4}$/, 'Invalid year').optional(),
  month: z.string().regex(/^(1[0-2]|0?[1-9])$/, 'Invalid month').optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  entryFrom: z.string().optional(),
  entryTo: z.string().optional(),
  createdBy: z.string().optional(),
  creatorRole: z.enum(['admin', 'data_entry', 'viewer', 'radio_assistant']).optional(),
  status: z.enum(['active', 'inactive', 'closed']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export const createMediaSchema = z.object({
  groupId: z.string().optional(),
  type: z.enum(['photo', 'video', 'youtube']),
  url: z.string().min(1, 'URL is required').max(500),
  thumbnailUrl: z.string().optional().or(z.literal('')),
  title: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  dateTaken: z.string().optional(),
});

export const updateMediaSchema = createMediaSchema.partial();

export const createReportLinkSchema = z.object({
  title: z.string().optional(),
  url: z.string().min(1, 'Link is required').max(500),
  year: z.number().int().min(2000).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
});

export const updateReportSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255).optional(),
  reportDate: z.string().optional(),
});
