import {
  Image as ImageIcon, FileText, Users, Radio,
  MapPin, Globe, LogIn, Activity,
} from 'lucide-react';
import api from '../services/api';

export interface ActivityItem {
  id: string;
  userId: string;
  userName: string | null;
  username: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
}

export const entityMeta: Record<string, { label: string; icon: any; color: string }> = {
  Media: { label: 'media', icon: ImageIcon, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' },
  Report: { label: 'PDF report', icon: FileText, color: 'text-red-500 bg-red-100 dark:bg-red-900/30' },
  User: { label: 'user', icon: Users, color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30' },
  RadioHomeGroup: { label: 'radio home group', icon: Radio, color: 'text-green-500 bg-green-100 dark:bg-green-900/30' },
  Region: { label: 'region', icon: MapPin, color: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30' },
  Language: { label: 'language', icon: Globe, color: 'text-teal-500 bg-teal-100 dark:bg-teal-900/30' },
};

const actionVerb: Record<string, string> = {
  CREATE: 'added',
  UPDATE: 'updated',
  DELETE: 'deleted',
  DELETE_ALL: 'deleted all',
};

export function describe(item: ActivityItem) {
  if (item.action === 'LOGIN') return `${item.userName || item.username || 'Someone'} logged in`;
  const meta = entityMeta[item.entity] || { label: item.entity.toLowerCase(), icon: Activity, color: 'text-gray-500 bg-gray-100 dark:bg-gray-900/30' };
  const verb = actionVerb[item.action] || item.action.toLowerCase();
  const user = item.userName || item.username || 'Someone';
  return `${user} ${verb} ${meta.label}`;
}

export function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export async function fetchRecentActivity(limit = 10): Promise<ActivityItem[]> {
  const res = await api.get(`/audit-logs/recent?limit=${limit}`);
  return res.data.items || [];
}
