/**
 * AXION Static Data Service — البيانات الثابتة من قاعدة البيانات
 * بدلاً من mockData.ts
 */

import { supabase } from '@/lib/supabase';

// ══════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════

export interface ProjectType {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface WorkerType {
  id: string;
  name: string;
  description?: string;
  usage_count: number;
  is_active: boolean;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  description?: string;
  usage_count: number;
  is_active: boolean;
}

// ══════════════════════════════════════════════════════════════════
// Project Types
// ══════════════════════════════════════════════════════════════════

export async function getProjectTypes(): Promise<ProjectType[]> {
  const { data, error } = await supabase
    .from('project_types')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('[Static Data] Failed to fetch project types:', error);
    return [];
  }

  return data || [];
}

export async function createProjectType(name: string, description?: string): Promise<ProjectType | null> {
  const { data, error } = await supabase
    .from('project_types')
    .insert({ name, description })
    .select()
    .single();

  if (error) {
    console.error('[Static Data] Failed to create project type:', error);
    return null;
  }

  return data;
}

// ══════════════════════════════════════════════════════════════════
// Worker Types
// ══════════════════════════════════════════════════════════════════

export async function getWorkerTypes(): Promise<WorkerType[]> {
  const { data, error } = await supabase
    .from('worker_types')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('[Static Data] Failed to fetch worker types:', error);
    return [];
  }

  return data || [];
}

export async function createWorkerType(id: string, name: string, description?: string): Promise<WorkerType | null> {
  const { data, error } = await supabase
    .from('worker_types')
    .insert({ id, name, description })
    .select()
    .single();

  if (error) {
    console.error('[Static Data] Failed to create worker type:', error);
    return null;
  }

  return data;
}

// ══════════════════════════════════════════════════════════════════
// Expense Categories
// ══════════════════════════════════════════════════════════════════

export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('[Static Data] Failed to fetch expense categories:', error);
    return [];
  }

  return data || [];
}

export async function createExpenseCategory(name: string, description?: string): Promise<ExpenseCategory | null> {
  const { data, error } = await supabase
    .from('expense_categories')
    .insert({ name, description })
    .select()
    .single();

  if (error) {
    console.error('[Static Data] Failed to create expense category:', error);
    return null;
  }

  return data;
}

// ══════════════════════════════════════════════════════════════════
// Usage Count Management
// ══════════════════════════════════════════════════════════════════

export async function incrementWorkerTypeUsage(workerTypeId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_worker_type_usage', { type_id: workerTypeId });
  if (error) console.error('[Static Data] Failed to increment worker type usage:', error);
}

export async function incrementExpenseCategoryUsage(categoryId: number): Promise<void> {
  const { error } = await supabase.rpc('increment_expense_category_usage', { category_id: categoryId });
  if (error) console.error('[Static Data] Failed to increment expense category usage:', error);
}
