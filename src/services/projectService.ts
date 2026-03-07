/**
 * Project Service — OnSpace Cloud (Supabase)
 */

import type { Project, ProjectStats } from '@/types';
import { supabase, dbError, type ServiceResponse, type PaginatedResponse, type FilterOptions } from './base';

// ── Shape helpers ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToProject(row: any): Project {
  return {
    id:                row.id,
    name:              row.name,
    description:       row.description ?? undefined,
    status:            row.status,
    project_type_id:   row.project_type_id ?? undefined,
    project_type_name: row.project_type_name ?? undefined,
    engineer_id:       row.engineer_id ?? undefined,
    engineer_name:     row.engineer_name ?? undefined,
    location:          row.location ?? undefined,
    image_url:         row.image_url ?? undefined,
    created_at:        row.created_at,
    updated_at:        row.updated_at,
    // flat fields
    total_workers:      row.total_workers      ?? 0,
    total_expenses:     row.total_expenses     ?? 0,
    total_income:       row.total_income       ?? 0,
    current_balance:    row.current_balance    ?? 0,
    active_workers:     row.active_workers     ?? 0,
    completed_days:     row.completed_days     ?? 0,
    material_purchases: row.material_purchases ?? 0,
    last_activity:      row.last_activity      ?? new Date().toISOString().split('T')[0],
    // legacy nested (for any component still using stats.*)
    stats: {
      totalWorkers:      row.total_workers      ?? 0,
      totalExpenses:     row.total_expenses     ?? 0,
      totalIncome:       row.total_income       ?? 0,
      currentBalance:    row.current_balance    ?? 0,
      activeWorkers:     row.active_workers     ?? 0,
      completedDays:     row.completed_days     ?? 0,
      materialPurchases: row.material_purchases ?? 0,
      lastActivity:      row.last_activity      ?? new Date().toISOString().split('T')[0],
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function projectToRow(p: Partial<Project> & { stats?: Partial<ProjectStats> }): any {
  const row: Record<string, unknown> = {};
  if (p.name              !== undefined) row.name               = p.name;
  if (p.description       !== undefined) row.description        = p.description;
  if (p.status            !== undefined) row.status             = p.status;
  if (p.project_type_id   !== undefined) row.project_type_id    = p.project_type_id;
  if (p.project_type_name !== undefined) row.project_type_name  = p.project_type_name;
  if (p.engineer_id       !== undefined) row.engineer_id        = p.engineer_id;
  if (p.engineer_name     !== undefined) row.engineer_name      = p.engineer_name;
  if (p.location          !== undefined) row.location           = p.location;
  if (p.image_url         !== undefined) row.image_url          = p.image_url;
  if (p.stats) {
    const s = p.stats;
    if (s.totalWorkers      !== undefined) row.total_workers      = s.totalWorkers;
    if (s.totalExpenses     !== undefined) row.total_expenses      = s.totalExpenses;
    if (s.totalIncome       !== undefined) row.total_income        = s.totalIncome;
    if (s.currentBalance    !== undefined) row.current_balance     = s.currentBalance;
    if (s.activeWorkers     !== undefined) row.active_workers      = s.activeWorkers;
    if (s.completedDays     !== undefined) row.completed_days      = s.completedDays;
    if (s.materialPurchases !== undefined) row.material_purchases  = s.materialPurchases;
    if (s.lastActivity      !== undefined) row.last_activity       = s.lastActivity;
  }
  return row;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const projectService = {
  async getAll(filters?: FilterOptions): Promise<PaginatedResponse<Project>> {
    let query = supabase.from('projects').select('*', { count: 'exact' });

    if (filters?.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,location.ilike.%${filters.search}%`
      );
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    query = query.order('created_at', { ascending: false });
    if (filters?.limit)  query = query.limit(filters.limit);
    if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit ?? 50) - 1);

    const { data, count, error } = await query;
    if (error) return { data: [], count: 0, error: dbError(error) };
    return { data: (data ?? []).map(rowToProject), count: count ?? 0, error: null };
  },

  async getById(id: string): Promise<ServiceResponse<Project>> {
    const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
    if (error) return { data: null, error: dbError(error) };
    return { data: rowToProject(data), error: null };
  },

  async create(payload: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'stats'>): Promise<ServiceResponse<Project>> {
    const row = projectToRow(payload);
    const { data, error } = await supabase.from('projects').insert(row).select().single();
    if (error) return { data: null, error: dbError(error) };
    return { data: rowToProject(data), error: null };
  },

  async update(id: string, updates: Partial<Project>): Promise<ServiceResponse<Project>> {
    const row = { ...projectToRow(updates), updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('projects').update(row).eq('id', id).select().single();
    if (error) return { data: null, error: dbError(error) };
    return { data: rowToProject(data), error: null };
  },

  async delete(id: string): Promise<ServiceResponse<boolean>> {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) return { data: null, error: dbError(error) };
    return { data: true, error: null };
  },

  async updateStats(id: string, stats: Partial<ProjectStats>): Promise<ServiceResponse<Project>> {
    return projectService.update(id, { stats } as Partial<Project>);
  },
};
