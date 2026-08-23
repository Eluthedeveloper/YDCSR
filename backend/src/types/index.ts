import { Request } from 'express';

export interface JwtPayload {
  userId: string;
  username: string;
  role: UserRole;
  regionalStateId?: string | null;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export type UserRole = 'admin' | 'data_entry' | 'viewer' | 'radio_assistant';

export type GroupStatus = 'active' | 'inactive' | 'closed';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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
