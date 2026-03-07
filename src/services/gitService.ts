/**
 * Git Operations Service — OnSpace Cloud (Supabase)
 * نظام احترافي لإدارة عمليات Git مع تسجيل كامل
 */

import { supabase, dbError, type ServiceResponse, type PaginatedResponse } from './base';

export interface GitOperation {
  id: string;
  operation: 'push' | 'pull' | 'fetch' | 'clone' | 'status';
  repository: string;
  branch: string;
  status: 'pending' | 'success' | 'failed';
  message?: string;
  error_details?: string;
  commit_hash?: string;
  files_changed?: number;
  user_id?: string;
  user_name?: string;
  duration_ms?: number;
  created_at: string;
}

export interface RepositoryStatus {
  id: string;
  repository_url: string;
  repository_name: string;
  is_connected: boolean;
  last_check: string;
  last_push?: string;
  last_pull?: string;
  total_operations: number;
  failed_operations: number;
  created_at: string;
  updated_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowToGitOp(row: any): GitOperation {
  return {
    id: row.id,
    operation: row.operation,
    repository: row.repository,
    branch: row.branch,
    status: row.status,
    message: row.message ?? undefined,
    error_details: row.error_details ?? undefined,
    commit_hash: row.commit_hash ?? undefined,
    files_changed: row.files_changed ?? 0,
    user_id: row.user_id ?? undefined,
    user_name: row.user_name ?? undefined,
    duration_ms: row.duration_ms ?? undefined,
    created_at: row.created_at,
  };
}

function rowToRepoStatus(row: any): RepositoryStatus {
  return {
    id: row.id,
    repository_url: row.repository_url,
    repository_name: row.repository_name,
    is_connected: row.is_connected,
    last_check: row.last_check,
    last_push: row.last_push ?? undefined,
    last_pull: row.last_pull ?? undefined,
    total_operations: row.total_operations ?? 0,
    failed_operations: row.failed_operations ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ── Git Operations Service ────────────────────────────────────────────────────

export const gitService = {
  // إنشاء سجل عملية جديدة
  async createOperation(payload: Omit<GitOperation, 'id' | 'created_at'>): Promise<ServiceResponse<GitOperation>> {
    const row = {
      operation: payload.operation,
      repository: payload.repository,
      branch: payload.branch,
      status: payload.status,
      message: payload.message ?? null,
      error_details: payload.error_details ?? null,
      commit_hash: payload.commit_hash ?? null,
      files_changed: payload.files_changed ?? 0,
      user_id: payload.user_id ?? null,
      user_name: payload.user_name ?? null,
      duration_ms: payload.duration_ms ?? null,
    };
    const { data, error } = await supabase.from('git_operations').insert(row).select().single();
    if (error) return { data: null, error: dbError(error) };
    return { data: rowToGitOp(data), error: null };
  },

  // تحديث حالة العملية
  async updateOperation(id: string, updates: Partial<GitOperation>): Promise<ServiceResponse<GitOperation>> {
    const row: Record<string, unknown> = {};
    if (updates.status !== undefined) row.status = updates.status;
    if (updates.message !== undefined) row.message = updates.message;
    if (updates.error_details !== undefined) row.error_details = updates.error_details;
    if (updates.commit_hash !== undefined) row.commit_hash = updates.commit_hash;
    if (updates.files_changed !== undefined) row.files_changed = updates.files_changed;
    if (updates.duration_ms !== undefined) row.duration_ms = updates.duration_ms;
    
    const { data, error } = await supabase.from('git_operations').update(row).eq('id', id).select().single();
    if (error) return { data: null, error: dbError(error) };
    return { data: rowToGitOp(data), error: null };
  },

  // جلب آخر العمليات
  async getRecentOperations(limit = 50): Promise<PaginatedResponse<GitOperation>> {
    const { data, count, error } = await supabase
      .from('git_operations')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) return { data: [], count: 0, error: dbError(error) };
    return { data: (data ?? []).map(rowToGitOp), count: count ?? 0, error: null };
  },

  // جلب عمليات حسب الحالة
  async getOperationsByStatus(status: 'pending' | 'success' | 'failed'): Promise<PaginatedResponse<GitOperation>> {
    const { data, count, error } = await supabase
      .from('git_operations')
      .select('*', { count: 'exact' })
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) return { data: [], count: 0, error: dbError(error) };
    return { data: (data ?? []).map(rowToGitOp), count: count ?? 0, error: null };
  },

  // إحصائيات العمليات
  async getStatistics(): Promise<ServiceResponse<{
    total: number;
    success: number;
    failed: number;
    pending: number;
    todayOps: number;
    avgDuration: number;
  }>> {
    const { data, error } = await supabase.from('git_operations').select('*');
    if (error) return { data: null, error: dbError(error) };
    
    const ops = data ?? [];
    const today = new Date().toISOString().split('T')[0];
    const todayOps = ops.filter(o => o.created_at.startsWith(today));
    const durations = ops.filter(o => o.duration_ms).map(o => o.duration_ms);
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    
    return {
      data: {
        total: ops.length,
        success: ops.filter(o => o.status === 'success').length,
        failed: ops.filter(o => o.status === 'failed').length,
        pending: ops.filter(o => o.status === 'pending').length,
        todayOps: todayOps.length,
        avgDuration,
      },
      error: null,
    };
  },

  // حذف عملية
  async deleteOperation(id: string): Promise<ServiceResponse<boolean>> {
    const { error } = await supabase.from('git_operations').delete().eq('id', id);
    if (error) return { data: null, error: dbError(error) };
    return { data: true, error: null };
  },
};

// ── Repository Status Service ─────────────────────────────────────────────────

export const repoStatusService = {
  // جلب حالة جميع المستودعات
  async getAll(): Promise<PaginatedResponse<RepositoryStatus>> {
    const { data, count, error } = await supabase
      .from('repository_status')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false });
    
    if (error) return { data: [], count: 0, error: dbError(error) };
    return { data: (data ?? []).map(rowToRepoStatus), count: count ?? 0, error: null };
  },

  // تحديث حالة مستودع
  async updateStatus(
    repoUrl: string,
    updates: Partial<Omit<RepositoryStatus, 'id' | 'created_at'>>
  ): Promise<ServiceResponse<RepositoryStatus>> {
    const row: Record<string, unknown> = { 
      repository_url: repoUrl,
      updated_at: new Date().toISOString() 
    };
    if (updates.repository_name !== undefined) row.repository_name = updates.repository_name;
    if (updates.is_connected !== undefined) row.is_connected = updates.is_connected;
    if (updates.last_check !== undefined) row.last_check = updates.last_check;
    if (updates.last_push !== undefined) row.last_push = updates.last_push;
    if (updates.last_pull !== undefined) row.last_pull = updates.last_pull;
    if (updates.total_operations !== undefined) row.total_operations = updates.total_operations;
    if (updates.failed_operations !== undefined) row.failed_operations = updates.failed_operations;

    const { data, error } = await supabase
      .from('repository_status')
      .upsert(row, { onConflict: 'repository_url' })
      .select()
      .single();
    
    if (error) return { data: null, error: dbError(error) };
    return { data: rowToRepoStatus(data), error: null };
  },

  // إنشاء مستودع جديد
  async create(payload: Omit<RepositoryStatus, 'id' | 'created_at' | 'updated_at'>): Promise<ServiceResponse<RepositoryStatus>> {
    const row = {
      repository_url: payload.repository_url,
      repository_name: payload.repository_name,
      is_connected: payload.is_connected ?? true,
      last_check: payload.last_check,
      last_push: payload.last_push ?? null,
      last_pull: payload.last_pull ?? null,
      total_operations: payload.total_operations ?? 0,
      failed_operations: payload.failed_operations ?? 0,
    };
    const { data, error } = await supabase.from('repository_status').insert(row).select().single();
    if (error) return { data: null, error: dbError(error) };
    return { data: rowToRepoStatus(data), error: null };
  },

  // حذف مستودع
  async delete(id: string): Promise<ServiceResponse<boolean>> {
    const { error } = await supabase.from('repository_status').delete().eq('id', id);
    if (error) return { data: null, error: dbError(error) };
    return { data: true, error: null };
  },
};
