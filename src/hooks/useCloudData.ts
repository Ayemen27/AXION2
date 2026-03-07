
/**
 * useCloudData — Custom hooks لجلب البيانات من OnSpace Cloud
 * يستبدل useDataStore (localStorage) بطبقة الخدمة الحقيقية
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  projectService,
  workerService,
  expenseService,
  supplierService,
  purchaseService,
  supplierPaymentService,
  attendanceService,
  workerTransferService,
  workerMiscExpenseService,
  fundCustodyService,
} from '@/services';
import type { FilterOptions } from '@/services';
import { notifyAdmins, adminMsgs } from '@/lib/notify';
import { formatCurrency } from '@/constants/config';
import type {
  Project, Worker, DailyExpense, Supplier, MaterialPurchase,
  SupplierPayment, AttendanceRecord, WorkerTransfer, WorkerMiscExpense, FundCustody,
} from '@/types';
import { useToast } from '@/hooks/use-toast';

// ─── Generic list hook ────────────────────────────────────────────────────────

function useList<T>(
  fetcher: () => Promise<{ data: T[]; count: number; error: string | null }>,
  deps: unknown[] = []
) {
  const [items, setItems] = useState<T[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const result = await fetcher();
    if (!mountedRef.current) return;
    if (result.error) {
      setError(result.error);
    } else {
      setItems(result.data);
      setCount(result.count);
      setError(null);
    }
    setLoading(false);
  }, deps); // Removed the ESLint comment. The actual fix is removing the comment because the rule definition is not found.

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => { mountedRef.current = false; };
  }, [fetch]);

  return { items, count, loading, error, refetch: fetch, setItems };
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export function useProjects(filters?: FilterOptions) {
  const { toast } = useToast();
  const { items: projects, loading, error, refetch, setItems } = useList(
    () => projectService.getAll(filters),
    [filters?.search, filters?.status, filters?.project_id]
  );

  const addProject = useCallback(async (payload: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await projectService.create(payload as any);
    if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); return null; }
    setItems(prev => [data!, ...prev]);
    notifyAdmins(adminMsgs.projectAdded(data!.name));
    return data;
  }, [setItems, toast]);

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    const { data, error } = await projectService.update(id, updates as any);
    if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); return null; }
    setItems(prev => prev.map(p => p.id === id ? data! : p));
    return data;
  }, [setItems, toast]);

  const removeProject = useCallback(async (id: string) => {
    const removed = projects.find(p => p.id === id);
    const { error } = await projectService.delete(id);
    if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); return false; }
    setItems(prev => prev.filter(p => p.id !== id));
    if (removed) notifyAdmins(adminMsgs.projectDeleted(removed.name));
    return true;
  }, [setItems, toast, projects]);

  return { projects, loading, error, refetch, addProject, updateProject, removeProject };
}

// ─── Workers ──────────────────────────────────────────────────────────────────

export function useWorkers(filters?: FilterOptions & { is_active?: boolean; project_id?: string }) {
  const { toast } = useToast();
  const { items: workers, loading, error, refetch, setItems } = useList(
    () => workerService.getAll(filters),
    [filters?.search, filters?.is_active, filters?.project_id]
  );

  const addWorker = useCallback(async (payload: Omit<Worker, 'id' | 'created_at'>) => {
    const { data, error } = await workerService.create(payload);
    if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); return null; }
    setItems(prev => [data!, ...prev]);
    notifyAdmins(adminMsgs.workerAdded(data!.name, data!.type));
    return data;
  }, [setItems, toast]);

  const updateWorker = useCallback(async (id: string, updates: Partial<Worker>) => {
    const { data, error } = await workerService.update(id, updates);
    if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); return null; }
    setItems(prev => prev.map(w => w.id === id ? data! : w));
    return data;
  }, [setItems, toast]);

  const toggleWorkerActive = useCallback(async (id: string) => {
    const { data, error } = await workerService.toggleActive(id);
    if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); return null; }
    setItems(prev => prev.map(w => w.id === id ? data! : w));
    return data;
  }, [setItems, toast]);

  const removeWorker = useCallback(async (id: string) => {
    const removed = workers.find(w => w.id === id);
    const { error } = await workerService.delete(id);
    if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); return false; }
    setItems(prev => prev.filter(w => w.id !== id));
    if (removed) notifyAdmins(adminMsgs.workerDeleted(removed.name));
    return true;
  }, [setItems, toast, workers]);

  return { workers, loading, error, refetch, addWorker, updateWorker, removeWorker, toggleWorkerActive };
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export function useExpenses(filters?: FilterOptions) {
  const { toast } = useToast();
  const { items: expenses, count, loading, error, refetch, setItems } = useList(
    () => expenseService.getAll(filters),
    [filters?.search, filters?.project_id, filters?.date_from, filters?.date_to]
  );

  const addExpense = useCallback(async (payload: Omit<DailyExpense, 'id' | 'created_at'>) => {
    const { data, error } = await expenseService.create(payload);
    if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); return null; }
    setItems(prev => [data!, ...prev]);
    notifyAdmins(adminMsgs.expenseAdded(data!.description, formatCurrency(data!.amount), data!.project_name || '—'));
    return data;
  }, [setItems, toast]);

  const removeExpense = useCallback(async (id: string) => {
    const removed = expenses.find(e => e.id === id);
    const { error } = await expenseService.delete(id);
    if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); return false; }
    setItems(prev => prev.filter(e => e.id !== id));
    if (removed) notifyAdmins(adminMsgs.expenseDeleted(formatCurrency(removed.amount)));
    return true;
  }, [setItems, toast, expenses]);

  return { expenses, count, loading, error, refetch, addExpense, removeExpense };
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

export function useSuppliers(filters?: FilterOptions) {
  const { toast } = useToast();
  const { items: suppliers, loading, error, refetch, setItems } = useList(
    () => supplierService.getAll(filters),
    [filters?.search]
  );

  const addSupplier = useCallback(async (payload: Omit<Supplier, 'id' | 'created_at'>) => {
    const { data, error } = await supplierService.create(payload);
    if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); return null; }
    setItems(prev => [data!, ...prev]);
    return data;
  }, [setItems, toast]);

  const updateSupplier = useCallback(async (id: string, updates: Partial<Supplier>) => {
    const { data, error } = await supplierService.update(id, updates);
    if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); return null; }
    setItems(prev => prev.map(s => s.id === id ? data! : s));
    return data;
  }, [setItems, toast]);

  const removeSupplier = useCallback(async (id: string) => {
    const { error } = await supplierService.delete(id);
    if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); return false; }
    setItems(prev => prev.filter(s => s.id !== id));
    return true;
  }, [setItems, toast]);

  return { suppliers, loading, error, refetch, addSupplier, updateSupplier, removeSupplier };
}

// ─── Purchases ────────────────────────────────────────────────────────────────

export function usePurchases(filters?: FilterOptions) {
  const { toast } = useToast();
  const { items: purchases, loading, error, refetch, setItems } = useList(
    () => purchaseService.getAll(filters),
    [filters?.search, filters?.project_id, filters?.date_from, filters?.date_to]
  );

  const addPurchase = useCallback(async (payload: Omit<MaterialPurchase, 'id' | 'created_at'>) => {
    const { data, error } = await purchaseService.create(payload);
    if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); return null; }
    setItems(prev => [data!, ...prev]);
    notifyAdmins(adminMsgs.purchaseAdded(data!.material_name, formatCurrency(data!.total_price), data!.supplier_name || '—', (payload as any).project_name || '—'));
    return data;
  }, [setItems, toast]);

  const removePurchase = useCallback(async (id: string) => {
    const removed = purchases.find(p => p.id === id);
    const { error } = await purchaseService.delete(id);
    if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); return false; }
    setItems(prev => prev.filter(p => p.id !== id));
    if (removed) notifyAdmins(adminMsgs.purchaseDeleted(removed.material_name));
    return true;
  }, [setItems, toast, purchases]);

  return { purchases, loading, error, refetch, addPurchase, removePurchase };
}

// ─── Supplier Payments ────────────────────────────────────────────────────────

export function useSupplierPayments(supplierId?: string) {
  const { toast } = useToast();
  const { items: payments, loading, error, refetch, setItems } = useList(
    () => supplierPaymentService.getAll(supplierId),
    [supplierId]
  );

  const addPayment = useCallback(async (payload: Omit<SupplierPayment, 'id' | 'created_at'>) => {
    const { data, error } = await supplierPaymentService.create(payload);
    if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); return null; }
    setItems(prev => [data!, ...prev]);
    return data;
  }, [setItems, toast]);

  const removePayment = useCallback(async (id: string) => {
    const { error } = await supplierPaymentService.delete(id);
    if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); return false; }
    setItems(prev => prev.filter(p => p.id !== id));
    return true;
  }, [setItems, toast]);

  return { payments, loading, error, refetch, addPayment, removePayment };
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export function useAttendance(filters?: FilterOptions & { worker_id?: string }) {
  const { toast } = useToast();
  const { items: attendance, loading, error, refetch, setItems } = useList(
    () => attendanceService.getAll(filters),
    [filters?.project_id, filters?.worker_id, filters?.date_from, filters?.date_to]
  );

  const upsertRecord = useCallback(async (
    worker_id: string,
    date: string,
    hours: number,
    worker_name: string,
    worker_type: string,
    daily_wage: number,
    project_id?: string,
    project_name?: string,
    notes?: string
  ) => {
    const status = hours === 0 ? 'absent' : hours < 8 ? 'half' : hours === 8 ? 'present' : 'overtime';
    const earned = hours === 0 ? 0 : (hours / 8) * daily_wage;
    const { data, error } = await attendanceService.upsert({
      worker_id, worker_name, worker_type, project_id, project_name,
      date, status: status as AttendanceRecord['status'], hours, daily_wage, earned, notes,
    });
    if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); return null; }
    setItems(prev => {
      const idx = prev.findIndex(r => r.worker_id === worker_id && r.date === date);
      return idx >= 0 ? prev.map((r, i) => i === idx ? data! : r) : [data!, ...prev];
    });
    notifyAdmins(adminMsgs.attendanceAdded(worker_name, String(hours / 8), formatCurrency(earned), project_name || '—'));
    return data;
  }, [setItems, toast]);

  const updateAttendance = useCallback(async (id: string, updates: Partial<AttendanceRecord>) => {
    const { data, error } = await attendanceService.update(id, updates);
    if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); return null; }
    setItems(prev => prev.map(r => r.id === id ? data! : r));
    return data;
  }, [setItems, toast]);

  const removeAttendance = useCallback(async (id: string) => {
    const removed = attendance.find(r => r.id === id);
    const { error } = await attendanceService.delete(id);
    if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); return false; }
    setItems(prev => prev.filter(r => r.id !== id));
    if (removed) notifyAdmins(adminMsgs.attendanceDeleted(removed.worker_name));
    return true;
  }, [setItems, toast, attendance]);

  return { attendance, loading, error, refetch, upsertRecord, updateAttendance, removeAttendance };
}

// ─── Worker Transfers ─────────────────────────────────────────────────────────

export function useWorkerTransfers(filters?: FilterOptions & { worker_id?: string }) {
  const { toast } = useToast();
  const { items: transfers, loading, error, refetch, setItems } = useList(
    () => workerTransferService.getAll(filters),
    [filters?.project_id, filters?.worker_id, filters?.date_from, filters?.date_to]
  );

  const addTransfer = useCallback(async (payload: Omit<WorkerTransfer, 'id' | 'created_at'>) => {
    const { data, error } = await workerTransferService.create(payload);
    if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); return null; }
    setItems(prev => [data!, ...prev]);
    notifyAdmins(adminMsgs.transferAdded(data!.worker_name, data!.recipientName, formatCurrency(data!.amount), data!.project_name || '—'));
    return data;
  }, [setItems, toast]);

  const updateTransfer = useCallback(async (id: string, updates: Partial<WorkerTransfer>) => {
    const { data, error } = await workerTransferService.update(id, updates);
    if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); return null; }
    setItems(prev => prev.map(t => t.id === id ? data! : t));
    return data;
  }, [setItems, toast]);

  const removeTransfer = useCallback(async (id: string) => {
    const removed = transfers.find(t => t.id === id);
    const { error } = await workerTransferService.delete(id);
    if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); return false; }
    setItems(prev => prev.filter(t => t.id !== id));
    if (removed) notifyAdmins(adminMsgs.transferDeleted(formatCurrency(removed.amount)));
    return true;
  }, [setItems, toast, transfers]);

  return { transfers, loading, error, refetch, addTransfer, updateTransfer, removeTransfer };
}

// ─── Worker Misc Expenses ─────────────────────────────────────────────────────

export function useWorkerMiscExpenses(filters?: FilterOptions & { worker_id?: string }) {
  const { toast } = useToast();
  const { items: miscExpenses, loading, error, refetch, setItems } = useList(
    () => workerMiscExpenseService.getAll(filters),
    [filters?.project_id, filters?.worker_id, filters?.date_from, filters?.date_to]
  );

  const addMiscExpense = useCallback(async (payload: Omit<WorkerMiscExpense, 'id' | 'created_at'>) => {
    const { data, error } = await workerMiscExpenseService.create(payload);
    if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); return null; }
    setItems(prev => [data!, ...prev]);
    notifyAdmins(adminMsgs.miscAdded(data!.description, formatCurrency(data!.amount), data!.project_name || '—'));
    return data;
  }, [setItems, toast]);

  const updateMiscExpense = useCallback(async (id: string, updates: Partial<WorkerMiscExpense>) => {
    const { data, error } = await workerMiscExpenseService.update(id, updates);
    if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); return null; }
    setItems(prev => prev.map(m => m.id === id ? data! : m));
    return data;
  }, [setItems, toast]);

  const removeMiscExpense = useCallback(async (id: string) => {
    const removed = miscExpenses.find(m => m.id === id);
    const { error } = await workerMiscExpenseService.delete(id);
    if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); return false; }
    setItems(prev => prev.filter(m => m.id !== id));
    if (removed) notifyAdmins(adminMsgs.miscDeleted(removed.description));
    return true;
  }, [setItems, toast, miscExpenses]);

  return { miscExpenses, loading, error, refetch, addMiscExpense, updateMiscExpense, removeMiscExpense };
}

// ─── Fund Custody ─────────────────────────────────────────────────────────────

export function useFundCustody(filters?: FilterOptions) {
  const { toast } = useToast();
  const { items: custodies, loading, error, refetch, setItems } = useList(
    () => fundCustodyService.getAll(filters),
    [filters?.project_id, filters?.date_from, filters?.date_to]
  );

  const addCustody = useCallback(async (payload: Omit<FundCustody, 'id' | 'created_at'>) => {
    const { data, error } = await fundCustodyService.create(payload);
    if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); return null; }
    setItems(prev => [data!, ...prev]);
    notifyAdmins(adminMsgs.custodyAdded(formatCurrency(data!.amount), data!.senderName, data!.project_name || '—'));
    return data;
  }, [setItems, toast]);

  const updateCustody = useCallback(async (id: string, updates: Partial<FundCustody>) => {
    const { data, error } = await fundCustodyService.update(id, updates);
    if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); return null; }
    setItems(prev => prev.map(c => c.id === id ? data! : c));
    return data;
  }, [setItems, toast]);

  const removeCustody = useCallback(async (id: string) => {
    const removed = custodies.find(c => c.id === id);
    const { error } = await fundCustodyService.delete(id);
    if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); return false; }
    setItems(prev => prev.filter(c => c.id !== id));
    if (removed) notifyAdmins(adminMsgs.custodyDeleted(formatCurrency(removed.amount), removed.project_name || '—'));
    return true;
  }, [setItems, toast, custodies]);

  return { custodies, loading, error, refetch, addCustody, updateCustody, removeCustody };
}
