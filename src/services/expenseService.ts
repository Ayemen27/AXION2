/**
 * Expense Service — OnSpace Cloud (Supabase)
 */

import type { DailyExpense } from '@/types';
import { supabase, dbError, type ServiceResponse, type PaginatedResponse, type FilterOptions } from './base';
import { supabase as sb } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToExpense(row: any): DailyExpense {
  return {
    id:           row.id,
    project_id:   row.project_id,
    project_name: row.project_name ?? '',
    category:     row.category,
    description:  row.description,
    amount:       row.amount,
    date:         row.date,
    well_id:      row.well_id      ?? undefined,
    created_by:   row.created_by   ?? '',
    receipt_url:  row.receipt_url  ?? undefined,
    created_at:   row.created_at,
  };
}

export const expenseService = {
  async getAll(filters?: FilterOptions): Promise<PaginatedResponse<DailyExpense>> {
    let query = supabase.from('daily_expenses').select('*', { count: 'exact' });

    if (filters?.search) {
      query = query.or(
        `description.ilike.%${filters.search}%,category.ilike.%${filters.search}%,project_name.ilike.%${filters.search}%`
      );
    }
    if (filters?.project_id) query = query.eq('project_id', filters.project_id);
    if (filters?.date_from)  query = query.gte('date', filters.date_from);
    if (filters?.date_to)    query = query.lte('date', filters.date_to);
    query = query.order('date', { ascending: false });

    const { data, count, error } = await query;
    if (error) return { data: [], count: 0, error: dbError(error) };
    return { data: (data ?? []).map(rowToExpense), count: count ?? 0, error: null };
  },

  async getById(id: string): Promise<ServiceResponse<DailyExpense>> {
    const { data, error } = await supabase.from('daily_expenses').select('*').eq('id', id).single();
    if (error) return { data: null, error: dbError(error) };
    return { data: rowToExpense(data), error: null };
  },

  async create(payload: Omit<DailyExpense, 'id' | 'created_at'>): Promise<ServiceResponse<DailyExpense>> {
    const { data: { session } } = await sb.auth.getSession();
    const row = {
      project_id:   payload.project_id   || null,
      project_name: payload.project_name,
      category:     payload.category,
      description:  payload.description,
      amount:       payload.amount,
      date:         payload.date,
      well_id:      payload.well_id      ?? null,
      created_by:   payload.created_by   || session?.user?.id || null,
      receipt_url:  payload.receipt_url  ?? null,
    };
    const { data, error } = await supabase.from('daily_expenses').insert(row).select().single();
    if (error) return { data: null, error: dbError(error) };
    return { data: rowToExpense(data), error: null };
  },

  async delete(id: string): Promise<ServiceResponse<boolean>> {
    const { error } = await supabase.from('daily_expenses').delete().eq('id', id);
    if (error) return { data: null, error: dbError(error) };
    return { data: true, error: null };
  },

  async getTotalByProject(projectId: string): Promise<ServiceResponse<number>> {
    const { data, error } = await supabase
      .from('daily_expenses')
      .select('amount')
      .eq('project_id', projectId);
    if (error) return { data: null, error: dbError(error) };
    const total = (data ?? []).reduce((s, r) => s + Number(r.amount), 0);
    return { data: total, error: null };
  },

  async getSummaryByCategory(projectId?: string): Promise<ServiceResponse<Record<string, number>>> {
    let query = supabase.from('daily_expenses').select('category,amount');
    if (projectId) query = query.eq('project_id', projectId);
    const { data, error } = await query;
    if (error) return { data: null, error: dbError(error) };
    const summary: Record<string, number> = {};
    (data ?? []).forEach(r => {
      summary[r.category] = (summary[r.category] ?? 0) + Number(r.amount);
    });
    return { data: summary, error: null };
  },
};
