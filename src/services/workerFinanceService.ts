
/**
 * Worker Finance Services — OnSpace Cloud (Supabase)
 * التحويلات المالية للعمال + النثريات + العهد
 */

import type { WorkerTransfer, WorkerMiscExpense, FundCustody } from '@/types';
import { supabase, dbError, type ServiceResponse, type PaginatedResponse, type FilterOptions } from './base';
import { supabase as sb } from '@/lib/supabase';

// ── Helpers ───────────────────────────────────────────────────────────────────

const rowToTransfer = (row: any): WorkerTransfer => ({
  id:              row.id,
  worker_id:       row.worker_id,
  worker_name:     row.worker_name     ?? '',
  project_id:      row.project_id,
  project_name:    row.project_name    ?? '',
  amount:          row.amount,
  recipientName:   row.recipient_name,
  recipientPhone:  row.recipient_phone ?? undefined,
  transferMethod:  row.transfer_method,
  transferNumber:  row.transfer_number ?? undefined,
  transferDate:    row.transfer_date,
  notes:           row.notes           ?? undefined,
  created_by:      row.created_by      ?? '',
  created_at:      row.created_at,
});

const rowToMisc = (row: any): WorkerMiscExpense => ({
  id:           row.id,
  worker_id:    row.worker_id,
  worker_name:  row.worker_name  ?? '',
  project_id:   row.project_id,
  project_name: row.project_name ?? '',
  amount:       row.amount,
  description:  row.description,
  date:         row.date,
  well_id:      row.well_id  ?? undefined,
  notes:        row.notes    ?? undefined,
  created_at:   row.created_at,
});

const rowToCustody = (row: any): FundCustody => ({
  id:             row.id,
  amount:         row.amount,
  senderName:     row.sender_name,
  transferType:   row.transfer_type,
  transferNumber: row.transfer_number ?? undefined,
  project_id:     row.project_id,
  project_name:   row.project_name    ?? '',
  date:           row.date,
  notes:          row.notes           ?? undefined,
  created_by:     row.created_by      ?? '',
  created_at:     row.created_at,
});

// ── Worker Transfers ──────────────────────────────────────────────────────────

export const workerTransferService = {
  async getAll(
    filters?: FilterOptions & { worker_id?: string }
  ): Promise<PaginatedResponse<WorkerTransfer>> {
    let query = supabase.from('worker_transfers').select('*', { count: 'exact' });
    if (filters?.project_id) query = query.eq('project_id', filters.project_id);
    if (filters?.worker_id)  query = query.eq('worker_id', filters.worker_id);
    if (filters?.date_from)  query = query.gte('transfer_date', filters.date_from);
    if (filters?.date_to)    query = query.lte('transfer_date', filters.date_to);
    query = query.order('transfer_date', { ascending: false });
    const { data, count, error } = await query;
    if (error) return { data: [], count: 0, error: dbError(error) };
    return { data: (data ?? []).map(rowToTransfer), count: count ?? 0, error: null };
  },

  async create(
    payload: Omit<WorkerTransfer, 'id' | 'created_at'>
  ): Promise<ServiceResponse<WorkerTransfer>> {
    // created_by must be UUID (auth.uid()) for RLS INSERT policy
    const { data: { session } } = await sb.auth.getSession();
    const row = {
      worker_id:       payload.worker_id       || null,
      worker_name:     payload.worker_name,
      project_id:      payload.project_id      || null,
      project_name:    payload.project_name,
      amount:          payload.amount,
      recipient_name:  payload.recipientName,
      recipient_phone: payload.recipientPhone  ?? null,
      transfer_method: payload.transferMethod,
      transfer_number: payload.transferNumber  ?? null,
      transfer_date:   payload.transferDate,
      notes:           payload.notes           ?? null,
      created_by:      session?.user?.id       ?? null,
    };
    const { data, error } = await supabase.from('worker_transfers').insert(row).select().single();
    if (error) return { data: null, error: dbError(error) };
    return { data: rowToTransfer(data), error: null };
  },

  async update(
    id: string,
    updates: Partial<WorkerTransfer>
  ): Promise<ServiceResponse<WorkerTransfer>> {
    const row: Record<string, unknown> = {};
    if (updates.amount          !== undefined) row.amount          = updates.amount;
    if (updates.recipientName   !== undefined) row.recipient_name  = updates.recipientName;
    if (updates.recipientPhone  !== undefined) row.recipient_phone = updates.recipientPhone;
    if (updates.transferMethod  !== undefined) row.transfer_method = updates.transferMethod;
    if (updates.transferNumber  !== undefined) row.transfer_number = updates.transferNumber;
    if (updates.transferDate    !== undefined) row.transfer_date   = updates.transferDate;
    if (updates.notes           !== undefined) row.notes           = updates.notes;
    const { data, error } = await supabase.from('worker_transfers').update(row).eq('id', id).select().single();
    if (error) return { data: null, error: dbError(error) };
    return { data: rowToTransfer(data), error: null };
  },

  async delete(id: string): Promise<ServiceResponse<boolean>> {
    const { error } = await supabase.from('worker_transfers').delete().eq('id', id);
    if (error) return { data: null, error: dbError(error) };
    return { data: true, error: null };
  },

  async getTotalByWorker(workerId: string): Promise<ServiceResponse<number>> {
    const { data, error } = await supabase
      .from('worker_transfers').select('amount').eq('worker_id', workerId);
    if (error) return { data: null, error: dbError(error) };
    return { data: (data ?? []).reduce((s, r) => s + Number(r.amount), 0), error: null };
  },
};

// ── Worker Misc Expenses ──────────────────────────────────────────────────────

export const workerMiscExpenseService = {
  async getAll(
    filters?: FilterOptions & { worker_id?: string }
  ): Promise<PaginatedResponse<WorkerMiscExpense>> {
    let query = supabase.from('worker_misc_expenses').select('*', { count: 'exact' });
    if (filters?.project_id) query = query.eq('project_id', filters.project_id);
    if (filters?.worker_id)  query = query.eq('worker_id', filters.worker_id);
    if (filters?.date_from)  query = query.gte('date', filters.date_from);
    if (filters?.date_to)    query = query.lte('date', filters.date_to);
    query = query.order('date', { ascending: false });
    const { data, count, error } = await query;
    if (error) return { data: [], count: 0, error: dbError(error) };
    return { data: (data ?? []).map(rowToMisc), count: count ?? 0, error: null };
  },

  async create(
    payload: Omit<WorkerMiscExpense, 'id' | 'created_at'>
  ): Promise<ServiceResponse<WorkerMiscExpense>> {
    // created_by must be UUID (auth.uid()) for RLS INSERT policy
    const { data: { session } } = await sb.auth.getSession();
    const row = {
      worker_id:    payload.worker_id    || null,
      worker_name:  payload.worker_name,
      project_id:   payload.project_id   || null,
      project_name: payload.project_name,
      amount:       payload.amount,
      description:  payload.description,
      date:         payload.date,
      well_id:      payload.well_id      ?? null,
      notes:        payload.notes        ?? null,
      created_by:   session?.user?.id    ?? null,
    };
    const { data, error } = await supabase.from('worker_misc_expenses').insert(row).select().single();
    if (error) return { data: null, error: dbError(error) };
    return { data: rowToMisc(data), error: null };
  },

  async update(
    id: string,
    updates: Partial<WorkerMiscExpense>
  ): Promise<ServiceResponse<WorkerMiscExpense>> {
    const row: Record<string, unknown> = {};
    if (updates.amount      !== undefined) row.amount      = updates.amount;
    if (updates.description !== undefined) row.description = updates.description;
    if (updates.date        !== undefined) row.date        = updates.date;
    if (updates.well_id     !== undefined) row.well_id     = updates.well_id;
    if (updates.notes       !== undefined) row.notes       = updates.notes;
    const { data, error } = await supabase.from('worker_misc_expenses').update(row).eq('id', id).select().single();
    if (error) return { data: null, error: dbError(error) };
    return { data: rowToMisc(data), error: null };
  },

  async delete(id: string): Promise<ServiceResponse<boolean>> {
    const { error } = await supabase.from('worker_misc_expenses').delete().eq('id', id);
    if (error) return { data: null, error: dbError(error) };
    return { data: true, error: null };
  },
};

// ── Fund Custody ──────────────────────────────────────────────────────────────

export const fundCustodyService = {
  async getAll(filters?: FilterOptions): Promise<PaginatedResponse<FundCustody>> {
    let query = supabase.from('fund_custody').select('*', { count: 'exact' });
    if (filters?.project_id) query = query.eq('project_id', filters.project_id);
    if (filters?.date_from)  query = query.gte('date', filters.date_from);
    if (filters?.date_to)    query = query.lte('date', filters.date_to);
    query = query.order('date', { ascending: false });
    const { data, count, error } = await query;
    if (error) return { data: [], count: 0, error: dbError(error) };
    return { data: (data ?? []).map(rowToCustody), count: count ?? 0, error: null };
  },

  async create(payload: Omit<FundCustody, 'id' | 'created_at'>): Promise<ServiceResponse<FundCustody>> {
    // created_by MUST be UUID (auth.uid()) — RLS INSERT policy checks this
    const { data: { session } } = await sb.auth.getSession();
    const row = {
      amount:          payload.amount,
      sender_name:     payload.senderName,
      transfer_type:   payload.transferType,
      transfer_number: payload.transferNumber ?? null,
      project_id:      payload.project_id     || null,
      project_name:    payload.project_name,
      date:            payload.date,
      notes:           payload.notes          ?? null,
      created_by:      session?.user?.id      ?? null,
    };
    const { data, error } = await supabase.from('fund_custody').insert(row).select().single();
    if (error) return { data: null, error: dbError(error) };
    return { data: rowToCustody(data), error: null };
  },

  async update(id: string, updates: Partial<FundCustody>): Promise<ServiceResponse<FundCustody>> {
    const row: Record<string, unknown> = {};
    if (updates.amount          !== undefined) row.amount          = updates.amount;
    if (updates.senderName      !== undefined) row.sender_name     = updates.senderName;
    if (updates.transferType    !== undefined) row.transfer_type   = updates.transferType;
    if (updates.transferNumber  !== undefined) row.transfer_number = updates.transferNumber;
    if (updates.date            !== undefined) row.date            = updates.date;
    if (updates.notes           !== undefined) row.notes           = updates.notes;
    const { data, error } = await supabase.from('fund_custody').update(row).eq('id', id).select().single();
    if (error) return { data: null, error: dbError(error) };
    return { data: rowToCustody(data), error: null };
  },

  async delete(id: string): Promise<ServiceResponse<boolean>> {
    const { error } = await supabase.from('fund_custody').delete().eq('id', id);
    if (error) return { data: null, error: dbError(error) };
    return { data: true, error: null };
  },

  async getTotalByProject(projectId: string): Promise<ServiceResponse<number>> {
    const { data, error } = await supabase
      .from('fund_custody').select('amount').eq('project_id', projectId);
    if (error) return { data: null, error: dbError(error) };
    return { data: (data ?? []).reduce((s, r) => s + Number(r.amount), 0), error: null };
  },
};
