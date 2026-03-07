
/**
 * Attendance Service — OnSpace Cloud (Supabase)
 */

import type { AttendanceRecord } from '@/types';
import { supabase, dbError, type ServiceResponse, type PaginatedResponse, type FilterOptions } from './base';

function rowToRecord(row: any): AttendanceRecord {
  return {
    id:           row.id,
    worker_id:    row.worker_id,
    worker_name:  row.worker_name  ?? '',
    worker_type:  row.worker_type  ?? '',
    project_id:   row.project_id   ?? undefined,
    project_name: row.project_name ?? undefined,
    well_id:      row.well_id      ?? undefined,
    date:         row.date,
    status:       row.status,
    hours:        row.hours,
    daily_wage:   row.daily_wage,
    earned:       row.earned,
    notes:        row.notes        ?? undefined,
    created_at:   row.created_at,
  };
}

export const attendanceService = {
  async getAll(
    filters?: FilterOptions & { worker_id?: string }
  ): Promise<PaginatedResponse<AttendanceRecord>> {
    let query = supabase.from('attendance_records').select('*', { count: 'exact' });

    if (filters?.project_id) query = query.eq('project_id', filters.project_id);
    if (filters?.worker_id)  query = query.eq('worker_id', filters.worker_id);
    if (filters?.date_from)  query = query.gte('date', filters.date_from);
    if (filters?.date_to)    query = query.lte('date', filters.date_to);
    query = query.order('date', { ascending: false });

    const { data, count, error } = await query;
    if (error) return { data: [], count: 0, error: dbError(error) };
    return { data: (data ?? []).map(rowToRecord), count: count ?? 0, error: null };
  },

  /** upsert: تحديث إذا وُجد سجل للعامل في نفس التاريخ، وإلا إنشاء */
  async upsert(
    payload: Omit<AttendanceRecord, 'id' | 'created_at'>
  ): Promise<ServiceResponse<AttendanceRecord>> {
    const row = {
      worker_id:    payload.worker_id,
      worker_name:  payload.worker_name,
      worker_type:  payload.worker_type,
      project_id:   payload.project_id   ?? null,
      project_name: payload.project_name ?? null,
      well_id:      payload.well_id      ?? null,
      date:         payload.date,
      status:       payload.status,
      hours:        payload.hours,
      daily_wage:   payload.daily_wage,
      earned:       payload.earned,
      notes:        payload.notes        ?? null,
    };
    const { data, error } = await supabase
      .from('attendance_records')
      .upsert(row, { onConflict: 'worker_id,date' })
      .select()
      .single();
    if (error) return { data: null, error: dbError(error) };
    return { data: rowToRecord(data), error: null };
  },

  async update(
    id: string,
    updates: Partial<AttendanceRecord>
  ): Promise<ServiceResponse<AttendanceRecord>> {
    const row: Record<string, unknown> = {};
    if (updates.status      !== undefined) row.status      = updates.status;
    if (updates.hours       !== undefined) row.hours       = updates.hours;
    if (updates.earned      !== undefined) row.earned      = updates.earned;
    if (updates.daily_wage  !== undefined) row.daily_wage  = updates.daily_wage;
    if (updates.notes       !== undefined) row.notes       = updates.notes;
    if (updates.project_id  !== undefined) row.project_id  = updates.project_id;
    if (updates.well_id     !== undefined) row.well_id     = updates.well_id;

    const { data, error } = await supabase
      .from('attendance_records').update(row).eq('id', id).select().single();
    if (error) return { data: null, error: dbError(error) };
    return { data: rowToRecord(data), error: null };
  },

  async delete(id: string): Promise<ServiceResponse<boolean>> {
    const { error } = await supabase.from('attendance_records').delete().eq('id', id);
    if (error) return { data: null, error: dbError(error) };
    return { data: true, error: null };
  },

  async getWorkerSummary(workerId: string): Promise<ServiceResponse<{
    totalDays: number;
    presentDays: number;
    absentDays: number;
    totalEarned: number;
    overtimeDays: number;
  }>> {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('status,earned')
      .eq('worker_id', workerId);
    if (error) return { data: null, error: dbError(error) };
    const rows = data ?? [];
    return {
      data: {
        totalDays:    rows.length,
        presentDays:  rows.filter(r => r.status === 'present').length,
        absentDays:   rows.filter(r => r.status === 'absent').length,
        overtimeDays: rows.filter(r => r.status === 'overtime').length,
        totalEarned:  rows.reduce((s, r) => s + Number(r.earned), 0),
      },
      error: null,
    };
  },
};
