/**
 * Base Service Layer — OnSpace Cloud (Supabase) implementation
 * يُصدّر supabase client والأنواع المشتركة المستخدمة في جميع الخدمات
 */

export { supabase } from '@/lib/supabase';
import { translateError } from '@/lib/errors';

export interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  error: string | null;
}

export interface FilterOptions {
  search?: string;
  status?: string;
  project_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

/** تحويل خطأ Supabase إلى نص عربي مقروء */
export function dbError(error: unknown): string {
  return translateError(error);
}
