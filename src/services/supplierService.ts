
/**
 * Supplier / Purchase / SupplierPayment Services — OnSpace Cloud (Supabase)
 */

import type { Supplier, MaterialPurchase, SupplierPayment } from '@/types';
import { supabase, dbError, type ServiceResponse, type PaginatedResponse, type FilterOptions } from './base';
import { supabase as sb } from '@/lib/supabase';

// ── Helpers ───────────────────────────────────────────────────────────────────

const rowToSupplier = (row: any): Supplier => ({
  id:              row.id,
  name:            row.name,
  phone:           row.phone   ?? undefined,
  address:         row.address ?? undefined,
  type:            row.type,
  totalPurchases:  row.total_purchases ?? 0,
  totalPayments:   row.total_payments  ?? 0,
  balance:         row.balance         ?? 0,
  is_active:       row.is_active,
  created_at:      row.created_at,
});

const rowToPurchase = (row: any): MaterialPurchase => ({
  id:            row.id,
  project_id:    row.project_id,
  supplier_id:   row.supplier_id,
  supplier_name: row.supplier_name ?? '',
  material_name: row.material_name,
  quantity:      row.quantity,
  unit:          row.unit,
  unit_price:    row.unit_price,
  total_price:   row.total_price,
  date:          row.date,
  well_id:       row.well_id ?? undefined,
  notes:         row.notes   ?? undefined,
  created_at:    row.created_at,
});

const rowToPayment = (row: any): SupplierPayment => ({
  id:            row.id,
  supplier_id:   row.supplier_id,
  supplier_name: row.supplier_name ?? '',
  amount:        row.amount,
  notes:         row.notes ?? undefined,
  date:          row.date,
  created_by:    row.created_by ?? '',
  created_at:    row.created_at,
});

// ── Supplier Service ──────────────────────────────────────────────────────────

export const supplierService = {
  async getAll(filters?: FilterOptions): Promise<PaginatedResponse<Supplier>> {
    let query = supabase.from('suppliers').select('*', { count: 'exact' });
    if (filters?.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,type.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
      );
    }
    query = query.order('created_at', { ascending: false });
    const { data, count, error } = await query;
    if (error) return { data: [], count: 0, error: dbError(error) };
    return { data: (data ?? []).map(rowToSupplier), count: count ?? 0, error: null };
  },

  async getById(id: string): Promise<ServiceResponse<Supplier>> {
    const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single();
    if (error) return { data: null, error: dbError(error) };
    return { data: rowToSupplier(data), error: null };
  },

  async create(payload: Omit<Supplier, 'id' | 'created_at'>): Promise<ServiceResponse<Supplier>> {
    const { data: { session } } = await sb.auth.getSession();
    const row = {
      name:            payload.name,
      phone:           payload.phone           ?? null,
      address:         payload.address         ?? null,
      type:            payload.type,
      total_purchases: payload.totalPurchases  ?? 0,
      total_payments:  payload.totalPayments   ?? 0,
      balance:         payload.balance         ?? 0,
      is_active:       payload.is_active       ?? true,
      created_by:      session?.user?.id       ?? null,
    };
    const { data, error } = await supabase.from('suppliers').insert(row).select().single();
    if (error) return { data: null, error: dbError(error) };
    return { data: rowToSupplier(data), error: null };
  },

  async update(id: string, updates: Partial<Supplier>): Promise<ServiceResponse<Supplier>> {
    const row: Record<string, unknown> = {};
    if (updates.name           !== undefined) row.name            = updates.name;
    if (updates.phone          !== undefined) row.phone           = updates.phone;
    if (updates.address        !== undefined) row.address         = updates.address;
    if (updates.type           !== undefined) row.type            = updates.type;
    if (updates.totalPurchases !== undefined) row.total_purchases = updates.totalPurchases;
    if (updates.totalPayments  !== undefined) row.total_payments  = updates.totalPayments;
    if (updates.balance        !== undefined) row.balance         = updates.balance;
    if (updates.is_active      !== undefined) row.is_active       = updates.is_active;
    const { data, error } = await supabase.from('suppliers').update(row).eq('id', id).select().single();
    if (error) return { data: null, error: dbError(error) };
    return { data: rowToSupplier(data), error: null };
  },

  async delete(id: string): Promise<ServiceResponse<boolean>> {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) return { data: null, error: dbError(error) };
    return { data: true, error: null };
  },
};

// ── Purchase Service ──────────────────────────────────────────────────────────

export const purchaseService = {
  async getAll(filters?: FilterOptions): Promise<PaginatedResponse<MaterialPurchase>> {
    let query = supabase.from('material_purchases').select('*', { count: 'exact' });
    if (filters?.search) {
      query = query.or(
        `material_name.ilike.%${filters.search}%,supplier_name.ilike.%${filters.search}%`
      );
    }
    if (filters?.project_id) query = query.eq('project_id', filters.project_id);
    if (filters?.date_from)  query = query.gte('date', filters.date_from);
    if (filters?.date_to)    query = query.lte('date', filters.date_to);
    query = query.order('date', { ascending: false });
    const { data, count, error } = await query;
    if (error) return { data: [], count: 0, error: dbError(error) };
    return { data: (data ?? []).map(rowToPurchase), count: count ?? 0, error: null };
  },

  async create(payload: Omit<MaterialPurchase, 'id' | 'created_at'>): Promise<ServiceResponse<MaterialPurchase>> {
    const { data: { session } } = await sb.auth.getSession();
    const row = {
      project_id:    payload.project_id    || null,
      supplier_id:   payload.supplier_id   || null,
      supplier_name: payload.supplier_name,
      material_name: payload.material_name,
      quantity:      payload.quantity,
      unit:          payload.unit,
      unit_price:    payload.unit_price,
      total_price:   payload.total_price,
      date:          payload.date,
      well_id:       payload.well_id ?? null,
      notes:         payload.notes   ?? null,
      created_by:    session?.user?.id ?? null,
    };
    const { data, error } = await supabase.from('material_purchases').insert(row).select().single();
    if (error) return { data: null, error: dbError(error) };
    return { data: rowToPurchase(data), error: null };
  },

  async delete(id: string): Promise<ServiceResponse<boolean>> {
    const { error } = await supabase.from('material_purchases').delete().eq('id', id);
    if (error) return { data: null, error: dbError(error) };
    return { data: true, error: null };
  },
};

// ── Supplier Payment Service ──────────────────────────────────────────────────

export const supplierPaymentService = {
  async getAll(supplierId?: string): Promise<PaginatedResponse<SupplierPayment>> {
    let query = supabase.from('supplier_payments').select('*', { count: 'exact' });
    if (supplierId) query = query.eq('supplier_id', supplierId);
    query = query.order('date', { ascending: false });
    const { data, count, error } = await query;
    if (error) return { data: [], count: 0, error: dbError(error) };
    return { data: (data ?? []).map(rowToPayment), count: count ?? 0, error: null };
  },

  async create(payload: Omit<SupplierPayment, 'id' | 'created_at'>): Promise<ServiceResponse<SupplierPayment>> {
    const row = {
      supplier_id:   payload.supplier_id   || null,
      supplier_name: payload.supplier_name,
      amount:        payload.amount,
      notes:         payload.notes      ?? null,
      date:          payload.date,
      created_by:    payload.created_by ?? null,
    };
    const { data, error } = await supabase.from('supplier_payments').insert(row).select().single();
    if (error) return { data: null, error: dbError(error) };
    return { data: rowToPayment(data), error: null };
  },

  async delete(id: string): Promise<ServiceResponse<boolean>> {
    const { error } = await supabase.from('supplier_payments').delete().eq('id', id);
    if (error) return { data: null, error: dbError(error) };
    return { data: true, error: null };
  },
};
