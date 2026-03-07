
/**
 * Worker Service — OnSpace Cloud (Supabase)
 */

import type { Worker } from '@/types';
import { supabase, dbError, type ServiceResponse, type PaginatedResponse, type FilterOptions } from './base';
import { supabase as sb } from '@/lib/supabase';

function rowToWorker(row: any): Worker {
  return {
    id:         row.id,
    name:       row.name,
    type:       row.type,
    dailyWage:  row.daily_wage,
    phone:      row.phone     ?? undefined,
    hireDate:   row.hire_date ?? undefined,
    is_active:  row.is_active,
    project_id: row.project_id ?? undefined,
    created_at: row.created_at,
  };
}

export const workerService = {
  async getAll(
    filters?: FilterOptions & { is_active?: boolean; project_id?: string }
  ): Promise<PaginatedResponse<Worker>> {
    let query = supabase.from('workers').select('*', { count: 'exact' });

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,type.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
    }
    if (typeof filters?.is_active === 'boolean') {
      query = query.eq('is_active', filters.is_active);
    }
    if (filters?.project_id) {
      query = query.eq('project_id', filters.project_id);
    }
    query = query.order('created_at', { ascending: false });

    const { data, count, error } = await query;
    if (error) return { data: [], count: 0, error: dbError(error) };
    return { data: (data ?? []).map(rowToWorker), count: count ?? 0, error: null };
  },

  async getById(id: string): Promise<ServiceResponse<Worker>> {
    const { data, error } = await supabase.from('workers').select('*').eq('id', id).single();
    if (error) return { data: null, error: dbError(error) };
    return { data: rowToWorker(data), error: null };
  },

  async create(payload: Omit<Worker, 'id' | 'created_at'>): Promise<ServiceResponse<Worker>> {
    // created_by is required by RLS policy for regular users
    const { data: { session } } = await sb.auth.getSession();
    const row = {
      name:       payload.name,
      type:       payload.type,
      daily_wage: payload.dailyWage,
      phone:      payload.phone      ?? null,
      hire_date:  payload.hireDate   ?? null,
      is_active:  payload.is_active  ?? true,
      project_id: payload.project_id ?? null,
      created_by: session?.user?.id  ?? null,
    };
    const { data, error } = await supabase.from('workers').insert(row).select().single();
    if (error) return { data: null, error: dbError(error) };
    return { data: rowToWorker(data), error: null };
  },

  async update(id: string, updates: Partial<Worker>): Promise<ServiceResponse<Worker>> {
    const row: Record<string, unknown> = {};
    if (updates.name       !== undefined) row.name       = updates.name;
    if (updates.type       !== undefined) row.type       = updates.type;
    if (updates.dailyWage  !== undefined) row.daily_wage = updates.dailyWage;
    if (updates.phone      !== undefined) row.phone      = updates.phone;
    if (updates.hireDate   !== undefined) row.hire_date  = updates.hireDate;
    if (updates.is_active  !== undefined) row.is_active  = updates.is_active;
    if (updates.project_id !== undefined) row.project_id = updates.project_id;

    const { data, error } = await supabase.from('workers').update(row).eq('id', id).select().single();
    if (error) return { data: null, error: dbError(error) };
    return { data: rowToWorker(data), error: null };
  },

  async toggleActive(id: string): Promise<ServiceResponse<Worker>> {
    const { data: existing, error: fetchErr } = await supabase
      .from('workers').select('is_active').eq('id', id).single();
    if (fetchErr) return { data: null, error: dbError(fetchErr) };

    const { data, error } = await supabase
      .from('workers').update({ is_active: !existing.is_active }).eq('id', id).select().single();
    if (error) return { data: null, error: dbError(error) };
    return { data: rowToWorker(data), error: null };
  },

  async delete(id: string): Promise<ServiceResponse<boolean>> {
    const { error } = await supabase.from('workers').delete().eq('id', id);
    if (error) return { data: null, error: dbError(error) };
    return { data: true, error: null };
  },
};
