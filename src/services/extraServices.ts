/**
 * Extra Services: customers, equipment, wells, notifications
 * OnSpace Cloud (Supabase) implementation
 */

import { supabase, dbError, type ServiceResponse, type PaginatedResponse } from './base';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  type: 'individual' | 'company';
  status: 'active' | 'inactive';
  project_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface Equipment {
  id: string;
  name: string;
  code?: string;
  type: string;
  unit: string;
  quantity: number;
  status: 'available' | 'assigned' | 'maintenance' | 'out_of_service';
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  project_id?: string;
  purchase_price?: number;
  purchase_date?: string;
  description?: string;
  created_by?: string;
  created_at: string;
}

export interface Well {
  id: string;
  project_id: string;
  well_number: number;
  owner_name: string;
  region: string;
  number_of_bases: number;
  number_of_panels: number;
  well_depth: number;
  water_level?: number;
  number_of_pipes: number;
  fan_type?: string;
  pump_power?: string;
  status: 'pending' | 'in_progress' | 'completed';
  completion_percentage: number;
  start_date?: string;
  completion_date?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'financial' | 'project' | 'alert' | 'system' | 'approval';
  is_read: boolean;
  link?: string;
  created_at: string;
}

// ── Customer Service ──────────────────────────────────────────────────────────

export const customerService = {
  async getAll(): Promise<PaginatedResponse<Customer>> {
    const { data, count, error } = await supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });
    if (error) return { data: [], count: 0, error: dbError(error) };
    return { data: data ?? [], count: count ?? 0, error: null };
  },

  async create(payload: Omit<Customer, 'id' | 'created_at'>): Promise<ServiceResponse<Customer>> {
    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: payload.name,
        phone: payload.phone ?? null,
        email: payload.email ?? null,
        address: payload.address ?? null,
        type: payload.type,
        status: payload.status,
        project_id: payload.project_id ?? null,
        notes: payload.notes ?? null,
      })
      .select()
      .single();
    if (error) return { data: null, error: dbError(error) };
    return { data, error: null };
  },

  async update(id: string, updates: Partial<Customer>): Promise<ServiceResponse<Customer>> {
    const row: Record<string, unknown> = {};
    if (updates.name      !== undefined) row.name       = updates.name;
    if (updates.phone     !== undefined) row.phone      = updates.phone;
    if (updates.email     !== undefined) row.email      = updates.email;
    if (updates.address   !== undefined) row.address    = updates.address;
    if (updates.type      !== undefined) row.type       = updates.type;
    if (updates.status    !== undefined) row.status     = updates.status;
    if (updates.project_id!== undefined) row.project_id = updates.project_id;
    if (updates.notes     !== undefined) row.notes      = updates.notes;
    const { data, error } = await supabase
      .from('customers')
      .update(row)
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error: dbError(error) };
    return { data, error: null };
  },

  async delete(id: string): Promise<ServiceResponse<boolean>> {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) return { data: null, error: dbError(error) };
    return { data: true, error: null };
  },
};

// ── Equipment Service ─────────────────────────────────────────────────────────

export const equipmentService = {
  async getAll(): Promise<PaginatedResponse<Equipment>> {
    const { data, count, error } = await supabase
      .from('equipment')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });
    if (error) return { data: [], count: 0, error: dbError(error) };
    return { data: data ?? [], count: count ?? 0, error: null };
  },

  async create(payload: Omit<Equipment, 'id' | 'created_at'>): Promise<ServiceResponse<Equipment>> {
    const { data, error } = await supabase
      .from('equipment')
      .insert({
        name:           payload.name,
        code:           payload.code           ?? null,
        type:           payload.type,
        unit:           payload.unit,
        quantity:       payload.quantity,
        status:         payload.status,
        condition:      payload.condition,
        project_id:     payload.project_id     ?? null,
        purchase_price: payload.purchase_price ?? null,
        purchase_date:  payload.purchase_date  ?? null,
        description:    payload.description    ?? null,
      })
      .select()
      .single();
    if (error) return { data: null, error: dbError(error) };
    return { data, error: null };
  },

  async update(id: string, updates: Partial<Equipment>): Promise<ServiceResponse<Equipment>> {
    const row: Record<string, unknown> = {};
    if (updates.name           !== undefined) row.name           = updates.name;
    if (updates.code           !== undefined) row.code           = updates.code;
    if (updates.type           !== undefined) row.type           = updates.type;
    if (updates.unit           !== undefined) row.unit           = updates.unit;
    if (updates.quantity       !== undefined) row.quantity       = updates.quantity;
    if (updates.status         !== undefined) row.status         = updates.status;
    if (updates.condition      !== undefined) row.condition      = updates.condition;
    if (updates.project_id     !== undefined) row.project_id     = updates.project_id;
    if (updates.purchase_price !== undefined) row.purchase_price = updates.purchase_price;
    if (updates.purchase_date  !== undefined) row.purchase_date  = updates.purchase_date;
    if (updates.description    !== undefined) row.description    = updates.description;
    const { data, error } = await supabase
      .from('equipment')
      .update(row)
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error: dbError(error) };
    return { data, error: null };
  },

  async delete(id: string): Promise<ServiceResponse<boolean>> {
    const { error } = await supabase.from('equipment').delete().eq('id', id);
    if (error) return { data: null, error: dbError(error) };
    return { data: true, error: null };
  },
};

// ── Well Service ──────────────────────────────────────────────────────────────

export const wellService = {
  async getAll(projectId?: string): Promise<PaginatedResponse<Well>> {
    let query = supabase
      .from('wells')
      .select('*', { count: 'exact' })
      .order('well_number', { ascending: true });
    if (projectId) query = query.eq('project_id', projectId);
    const { data, count, error } = await query;
    if (error) return { data: [], count: 0, error: dbError(error) };
    return { data: data ?? [], count: count ?? 0, error: null };
  },

  async create(payload: Omit<Well, 'id' | 'created_at'>): Promise<ServiceResponse<Well>> {
    const { data, error } = await supabase
      .from('wells')
      .insert({
        project_id:           payload.project_id,
        well_number:          payload.well_number,
        owner_name:           payload.owner_name,
        region:               payload.region,
        number_of_bases:      payload.number_of_bases,
        number_of_panels:     payload.number_of_panels,
        well_depth:           payload.well_depth,
        water_level:          payload.water_level          ?? null,
        number_of_pipes:      payload.number_of_pipes,
        fan_type:             payload.fan_type             ?? null,
        pump_power:           payload.pump_power           ?? null,
        status:               payload.status,
        completion_percentage:payload.completion_percentage,
        start_date:           payload.start_date           ?? null,
        completion_date:      payload.completion_date      ?? null,
        notes:                payload.notes                ?? null,
      })
      .select()
      .single();
    if (error) return { data: null, error: dbError(error) };
    return { data, error: null };
  },

  async update(id: string, updates: Partial<Well>): Promise<ServiceResponse<Well>> {
    const row: Record<string, unknown> = {};
    if (updates.owner_name           !== undefined) row.owner_name            = updates.owner_name;
    if (updates.region               !== undefined) row.region                = updates.region;
    if (updates.number_of_bases      !== undefined) row.number_of_bases       = updates.number_of_bases;
    if (updates.number_of_panels     !== undefined) row.number_of_panels      = updates.number_of_panels;
    if (updates.well_depth           !== undefined) row.well_depth            = updates.well_depth;
    if (updates.water_level          !== undefined) row.water_level           = updates.water_level;
    if (updates.number_of_pipes      !== undefined) row.number_of_pipes       = updates.number_of_pipes;
    if (updates.fan_type             !== undefined) row.fan_type              = updates.fan_type;
    if (updates.pump_power           !== undefined) row.pump_power            = updates.pump_power;
    if (updates.status               !== undefined) row.status                = updates.status;
    if (updates.completion_percentage!== undefined) row.completion_percentage = updates.completion_percentage;
    if (updates.start_date           !== undefined) row.start_date            = updates.start_date;
    if (updates.completion_date      !== undefined) row.completion_date       = updates.completion_date;
    if (updates.notes                !== undefined) row.notes                 = updates.notes;
    const { data, error } = await supabase
      .from('wells')
      .update(row)
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error: dbError(error) };
    return { data, error: null };
  },

  async delete(id: string): Promise<ServiceResponse<boolean>> {
    const { error } = await supabase.from('wells').delete().eq('id', id);
    if (error) return { data: null, error: dbError(error) };
    return { data: true, error: null };
  },

  async getMaxWellNumber(projectId: string): Promise<number> {
    const { data } = await supabase
      .from('wells')
      .select('well_number')
      .eq('project_id', projectId)
      .order('well_number', { ascending: false })
      .limit(1)
      .single();
    return (data?.well_number ?? 0) + 1;
  },
};

// ── Notification Service ──────────────────────────────────────────────────────

export const notificationService = {
  async getAll(userId: string): Promise<PaginatedResponse<AppNotification>> {
    const { data, count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return { data: [], count: 0, error: dbError(error) };
    return { data: data ?? [], count: count ?? 0, error: null };
  },

  async markAsRead(id: string): Promise<ServiceResponse<boolean>> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    if (error) return { data: null, error: dbError(error) };
    return { data: true, error: null };
  },

  async markAllAsRead(userId: string): Promise<ServiceResponse<boolean>> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) return { data: null, error: dbError(error) };
    return { data: true, error: null };
  },

  async create(payload: Omit<AppNotification, 'id' | 'created_at'>): Promise<ServiceResponse<AppNotification>> {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: payload.user_id,
        title:   payload.title,
        body:    payload.body,
        type:    payload.type,
        is_read: false,
        link:    payload.link ?? null,
      })
      .select()
      .single();
    if (error) return { data: null, error: dbError(error) };
    return { data, error: null };
  },

  async delete(id: string): Promise<ServiceResponse<boolean>> {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) return { data: null, error: dbError(error) };
    return { data: true, error: null };
  },
};

// ── User Profile Service (read users from user_profiles) ──────────────────────

export interface UserProfile {
  id: string;
  username?: string;
  email: string;
}

export const userProfileService = {
  async getAll(): Promise<PaginatedResponse<UserProfile>> {
    const { data, count, error } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact' })
      .order('email', { ascending: true });
    if (error) return { data: [], count: 0, error: dbError(error) };
    return { data: data ?? [], count: count ?? 0, error: null };
  },
};
