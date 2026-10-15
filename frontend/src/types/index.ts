export type UserRole = 'admin' | 'data_entry' | 'viewer' | 'radio_assistant';
export type GroupStatus = 'active' | 'inactive' | 'closed';
export type EntityStatus = 'active' | 'inactive';

export interface User {
  id: string;
  fullName: string;
  username: string;
  phone: string;
  email: string | null;
  role: UserRole;
  regionalStateId: string | null;
  regionalStateName?: string | null;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RegionalState {
  id: string;
  name: string;
  code: string;
  defaultLanguage: string;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Region {
  id: string;
  name: string;
  regionalStateId: string;
  regionalStateName?: string;
  regionalStateCode?: string;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Language {
  id: string;
  name: string;
}

export interface Church {
  id: string;
  name: string;
  regionId: string;
  regionName?: string;
  address: string | null;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RadioHomeGroup {
  id: string;
  serialNumber: string;
  dateStarted: string;
  regionId: string;
  regionName: string;
  regionalStateId: string;
  regionalStateName: string;
  regionalStateCode: string;
  languageId: string;
  languageName: string;
  churchId: string;
  churchName: string;
  groupLeaderName: string;
  groupLeaderPhone: string;
  facilitatorName: string;
  facilitatorPhone: string;
  maleMembers: number;
  femaleMembers: number;
  totalMembers: number;
  radioGiven: number;
  agreementMade: number;
  remark: string | null;
  status: GroupStatus;
  createdBy: string;
  createdByName?: string | null;
  createdByRole?: UserRole | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalGroups: number;
  totalRegionalStates: number;
  totalRegions: number;
  totalChurches: number;
  totalLanguages: number;
  totalMaleMembers: number;
  totalFemaleMembers: number;
  totalMembers: number;
  totalRadios: number;
  totalAgreements: number;
  totalViewers: number;
  totalDataEntry: number;
  totalRadioAssistants: number;
  totalAdmins: number;
}

export interface MediaItem {
  id: string;
  groupId: string | null;
  type: 'photo' | 'video' | 'youtube';
  url: string;
  thumbnailUrl: string | null;
  title: string | null;
  description: string | null;
  dateTaken: string | null;
  createdBy: string;
  createdAt: string;
}

export interface ReportPdf {
  id: string;
  title: string;
  fileName: string | null;
  originalName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  sourceType?: 'upload' | 'link';
  externalUrl?: string | null;
  reportDate: string | null;
  createdBy: string;
  createdAt: string;
}

export interface MediaArchiveResult {
  items?: MediaItem[];
  reports?: ReportPdf[];
  page?: number;
  totalPages?: number | null;
  period?: { start: string; end: string };
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string | null;
  username: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  country: string | null;
  countryCode: string | null;
  city: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  items?: T[];
  error?: string;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  user: {
    id: string;
    fullName: string;
    username: string;
    role: UserRole;
    phone: string;
    email: string | null;
    regionalStateId?: string | null;
    regionalStateName?: string | null;
  };
}
