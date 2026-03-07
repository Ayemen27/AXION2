/**
 * صفحة المصروفات اليومية - متصلة بـ OnSpace Cloud
 */

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  useExpenses, useProjects, useWorkers, useAttendance,
  usePurchases, useSuppliers, useWorkerTransfers, useWorkerMiscExpenses, useFundCustody,
} from '@/hooks/useCloudData';
import { useAuth } from '@/hooks/useAuth';
import { useSelectedProject } from '@/hooks/useSelectedProject';
import { formatCurrency } from '@/constants/config';
import {
  ChevronDown, ChevronUp, Plus, Trash2, Pencil, Check, X as XIcon,
  Wallet, TrendingUp, TrendingDown, Users, Truck,
  Package, DollarSign, Receipt, Send, CreditCard, Building2,
  ArrowLeftRight, ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react';
import type { AttendanceRecord } from '@/types';

const TRANSPORT_CATEGORIES = [
  { value: 'نقل عمال', label: 'نقل عمال' },
  { value: 'نقل مواد', label: 'نقل مواد' },
  { value: 'صيانة وإصلاح', label: 'صيانة وإصلاح' },
  { value: 'أخرى', label: 'أخرى' },
];

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function formatDateAr(iso: string) {
  return new Date(iso).toLocaleDateString('ar-YE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function ExpensesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { selectedProjectId } = useSelectedProject();
  const { projects } = useProjects();
  const { workers } = useWorkers();
  const { attendance, upsertRecord, updateAttendance, removeAttendance } = useAttendance();
  const { expenses, addExpense, removeExpense } = useExpenses();
  const { purchases, addPurchase, removePurchase } = usePurchases();
  const { suppliers } = useSuppliers();
  const { transfers, addTransfer, removeTransfer, updateTransfer } = useWorkerTransfers();
  const { miscExpenses, addMiscExpense, removeMiscExpense, updateMiscExpense } = useWorkerMiscExpenses();
  const { custodies, addCustody, removeCustody, updateCustody } = useFundCustody();

  const currentProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : null;
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [saving, setSaving] = useState(false);

  // Collapsible states
  const [showCustody, setShowCustody] = useState(true);
  const [showMisc, setShowMisc] = useState(false);
  const [showWages, setShowWages] = useState(false);
  const [showPurchases, setShowPurchases] = useState(false);
  const [showTransfers, setShowTransfers] = useState(false);
  const [showTransport, setShowTransport] = useState(false);

  const [deleteMiscId, setDeleteMiscId] = useState<string | null>(null);
  const [editingCustodyId, setEditingCustodyId] = useState<string | null>(null);
  const [editingAttendanceId, setEditingAttendanceId] = useState<string | null>(null);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [editingTransferId, setEditingTransferId] = useState<string | null>(null);
  const [editingTransportId, setEditingTransportId] = useState<string | null>(null);
  const [editingMiscId, setEditingMiscId] = useState<string | null>(null);

  const [miscForm, setMiscForm] = useState({ description: '', amount: '', notes: '', well_id: '' });
  const [workerForm, setWorkerForm] = useState({ worker_id: '', days: '', amount: '', notes: '', well_id: '' });
  const [purchaseForm, setPurchaseForm] = useState({ material_name: '', quantity: '', unit_price: '', unit: 'قطعة', supplier_id: '', notes: '', well_id: '' });
  const [transferForm, setTransferForm] = useState({ worker_id: '', recipient_name: '', amount: '', transfer_method: 'hawaleh' as const, transfer_number: '', notes: '' });
  const [transportForm, setTransportForm] = useState({ description: '', category: '', amount: '', notes: '', well_id: '' });
  const [custodyForm, setCustodyForm] = useState({ amount: '', senderName: '', transferType: 'hawaleh' as const, transferNumber: '', notes: '' });

  const resetMiscForm = () => { setMiscForm({ description: '', amount: '', notes: '', well_id: '' }); setEditingMiscId(null); };
  const resetWorkerForm = () => { setWorkerForm({ worker_id: '', days: '', amount: '', notes: '', well_id: '' }); setEditingAttendanceId(null); };
  const resetPurchaseForm = () => { setPurchaseForm({ material_name: '', quantity: '', unit_price: '', unit: 'قطعة', supplier_id: '', notes: '', well_id: '' }); setEditingPurchaseId(null); };
  const resetTransferForm = () => { setTransferForm({ worker_id: '', recipient_name: '', amount: '', transfer_method: 'hawaleh', transfer_number: '', notes: '' }); setEditingTransferId(null); };
  const resetTransportForm = () => { setTransportForm({ description: '', category: '', amount: '', notes: '', well_id: '' }); setEditingTransportId(null); };
  const resetCustodyForm = () => { setCustodyForm({ amount: '', senderName: '', transferType: 'hawaleh', transferNumber: '', notes: '' }); setEditingCustodyId(null); };

  const startEditCustody = (c: typeof custodies[0]) => {
    setCustodyForm({ amount: String(c.amount), senderName: c.senderName, transferType: c.transferType as any, transferNumber: c.transferNumber || '', notes: c.notes || '' });
    setEditingCustodyId(c.id);
    setShowCustody(true);
  };

  const startEditAttendance = (a: typeof attendance[0]) => {
    setWorkerForm({ worker_id: a.worker_id, days: String(a.hours / 8), amount: String(a.earned), notes: a.notes || '', well_id: '' });
    setEditingAttendanceId(a.id);
    setShowWages(true);
  };

  const startEditTransfer = (t: typeof transfers[0]) => {
    setTransferForm({ worker_id: t.worker_id, recipient_name: t.recipientName, amount: String(t.amount), transfer_method: t.transferMethod as any, transfer_number: t.transferNumber || '', notes: t.notes || '' });
    setEditingTransferId(t.id);
    setShowTransfers(true);
  };

  const startEditMisc = (m: typeof miscExpenses[0]) => {
    setMiscForm({ description: m.description, amount: String(m.amount), notes: m.notes || '', well_id: m.well_id || '' });
    setEditingMiscId(m.id);
    setShowMisc(true);
  };

  // Financial logic
  const computeDayBalance = useMemo(() => {
    const filterByProject = <T extends { project_id?: string }>(items: T[]) =>
      selectedProjectId ? items.filter(i => i.project_id === selectedProjectId) : items;

    const filteredCustodies = filterByProject(custodies);
    const filteredAttendance = filterByProject(attendance);
    const filteredPurchases = filterByProject(purchases);
    const filteredTransfers = filterByProject(transfers as any[]);
    const filteredMiscExpenses = filterByProject(miscExpenses);
    const filteredExpenses = filterByProject(expenses);

    const allDates = new Set<string>();
    filteredCustodies.forEach(c => allDates.add(c.date));
    filteredAttendance.forEach(a => allDates.add(a.date));
    filteredPurchases.forEach(p => allDates.add(p.date));
    filteredTransfers.forEach(t => allDates.add(t.transferDate));
    filteredMiscExpenses.forEach(m => allDates.add(m.date));
    filteredExpenses.forEach(e => allDates.add(e.date));
    allDates.add(selectedDate);

    const sortedDates = Array.from(allDates).sort();
    const balanceByDate: Record<string, { custodyTotal: number; expensesTotal: number; carryover: number; netBalance: number; wages: number; materials: number; transfersAmt: number; misc: number; transport: number }> = {};

    let runningBalance = 0;
    for (const date of sortedDates) {
      const custodyTotal = filteredCustodies.filter(c => c.date === date).reduce((s, c) => s + c.amount, 0);
      const wages = filteredAttendance.filter(a => a.date === date).reduce((s, a) => s + a.earned, 0);
      const materials = filteredPurchases.filter(p => p.date === date).reduce((s, p) => s + p.total_price, 0);
      const transfersAmt = filteredTransfers.filter(t => t.transferDate === date).reduce((s, t) => s + t.amount, 0);
      const misc = filteredMiscExpenses.filter(m => m.date === date).reduce((s, m) => s + m.amount, 0);
      const transport = filteredExpenses.filter(e => e.date === date && e.category === 'نقل').reduce((s, e) => s + e.amount, 0);
      const otherExpenses = filteredExpenses.filter(e => e.date === date && e.category !== 'نقل').reduce((s, e) => s + e.amount, 0);
      const expensesTotal = wages + materials + transfersAmt + misc + transport + otherExpenses;
      const carryover = runningBalance;
      const netBalance = carryover + custodyTotal - expensesTotal;
      balanceByDate[date] = { custodyTotal, expensesTotal, carryover, netBalance, wages, materials, transfersAmt, misc, transport };
      runningBalance = netBalance;
    }
    return balanceByDate;
  }, [custodies, attendance, purchases, transfers, miscExpenses, expenses, selectedDate]);

  const todayData = computeDayBalance[selectedDate] || { custodyTotal: 0, expensesTotal: 0, carryover: 0, netBalance: 0, wages: 0, materials: 0, transfersAmt: 0, misc: 0, transport: 0 };
  const totalIncome = todayData.custodyTotal + Math.max(0, todayData.carryover);
  const balance = todayData.netBalance;

  const dailyCustodies = custodies.filter(c => c.date === selectedDate && (!selectedProjectId || c.project_id === selectedProjectId));
  const dailyAttendance = attendance.filter(a => a.date === selectedDate && (!selectedProjectId || a.project_id === selectedProjectId));
  const dailyPurchases = purchases.filter(p => p.date === selectedDate && (!selectedProjectId || p.project_id === selectedProjectId));
  const dailyTransfers = transfers.filter(t => t.transferDate === selectedDate && (!selectedProjectId || t.project_id === selectedProjectId));
  const dailyTransportExpenses = expenses.filter(e => e.date === selectedDate && e.category === 'نقل' && (!selectedProjectId || e.project_id === selectedProjectId));
  const dailyMiscExpenses = miscExpenses.filter(m => m.date === selectedDate && (!selectedProjectId || m.project_id === selectedProjectId));

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleAddCustody = async () => {
    if (!custodyForm.amount || !custodyForm.senderName) {
      toast({ title: 'خطأ', description: 'يرجى ملء جميع الحقول المطلوبة', variant: 'destructive' });
      return;
    }
    setSaving(true);
    if (editingCustodyId) {
      const result = await updateCustody(editingCustodyId, { amount: Number(custodyForm.amount) as any, senderName: custodyForm.senderName, transferType: custodyForm.transferType, transferNumber: custodyForm.transferNumber || undefined, notes: custodyForm.notes || undefined });
      if (result) {
        toast({ title: 'تم التعديل', description: `تم تعديل العهدة — ${formatCurrency(Number(custodyForm.amount))}` });
        resetCustodyForm();
      }
    } else {
      if (!selectedProjectId || !currentProject) {
        toast({ title: 'خطأ', description: 'يرجى اختيار مشروع من الشريط العلوي', variant: 'destructive' });
        setSaving(false); return;
      }
      const result = await addCustody({ amount: Number(custodyForm.amount), senderName: custodyForm.senderName, transferType: custodyForm.transferType, transferNumber: custodyForm.transferNumber || undefined, project_id: currentProject.id, project_name: currentProject.name, date: selectedDate, notes: custodyForm.notes || undefined, created_by: user?.id || '' });
      if (result) {
        toast({ title: 'تم استلام العهدة', description: `${formatCurrency(Number(custodyForm.amount))} من ${custodyForm.senderName}` });
        resetCustodyForm();
      }
    }
    setSaving(false);
  };

  const handleAddMisc = async () => {
    if (!miscForm.description || !miscForm.amount) {
      toast({ title: 'خطأ', description: 'يرجى ملء جميع الحقول المطلوبة', variant: 'destructive' });
      return;
    }
    setSaving(true);
    if (editingMiscId) {
      const result = await updateMiscExpense(editingMiscId, { description: miscForm.description, amount: Number(miscForm.amount), notes: miscForm.notes || undefined });
      if (result) { toast({ title: 'تم التعديل' }); resetMiscForm(); }
    } else {
      if (!selectedProjectId) { toast({ title: 'خطأ', description: 'يرجى اختيار مشروع', variant: 'destructive' }); setSaving(false); return; }
      const result = await addMiscExpense({ worker_id: '', worker_name: '', project_id: selectedProjectId, project_name: currentProject?.name || '', amount: Number(miscForm.amount), description: miscForm.description, date: selectedDate, well_id: miscForm.well_id || undefined, notes: miscForm.notes || undefined });
      if (result) { toast({ title: 'تم الإضافة', description: `تم إضافة ${miscForm.description}` }); resetMiscForm(); }
    }
    setSaving(false);
  };

  const handleAddWorker = async () => {
    if (!workerForm.worker_id || !workerForm.days) {
      toast({ title: 'خطأ', description: 'يرجى ملء جميع الحقول المطلوبة', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const worker = workers.find(w => w.id === workerForm.worker_id);
    if (!worker) { setSaving(false); return; }
    if (editingAttendanceId) {
      const days = Number(workerForm.days);
      const hours = days * 8;
      const earned = days * worker.dailyWage;
      const status: AttendanceRecord['status'] = days === 0 ? 'absent' : days < 1 ? 'half' : days === 1 ? 'present' : 'overtime';
      await updateAttendance(editingAttendanceId, { hours, earned, status, notes: workerForm.notes });
      toast({ title: 'تم التعديل', description: `${worker.name} — ${days} يوم` });
      resetWorkerForm();
    } else {
      if (!selectedProjectId || !currentProject) { toast({ title: 'خطأ', description: 'يرجى اختيار مشروع', variant: 'destructive' }); setSaving(false); return; }
      const days = Number(workerForm.days);
      await upsertRecord(worker.id, selectedDate, days * 8, worker.name, worker.type, worker.dailyWage, currentProject.id, currentProject.name, workerForm.notes);
      toast({ title: 'تم الإضافة', description: `تم تسجيل ${worker.name} — ${days} يوم (${formatCurrency(worker.dailyWage * days)})` });
      resetWorkerForm();
    }
    setSaving(false);
  };

  const handleAddPurchase = async () => {
    if (!purchaseForm.material_name || !purchaseForm.quantity || !purchaseForm.unit_price || !purchaseForm.supplier_id) {
      toast({ title: 'خطأ', description: 'يرجى ملء جميع الحقول المطلوبة', variant: 'destructive' });
      return;
    }
    const supplier = suppliers.find(s => s.id === purchaseForm.supplier_id);
    if (!supplier || (!selectedProjectId && !editingPurchaseId) || !currentProject) {
      toast({ title: 'خطأ', description: 'يرجى اختيار مشروع من الشريط العلوي', variant: 'destructive' });
      return;
    }
    setSaving(true);
    if (editingPurchaseId) await removePurchase(editingPurchaseId);
    const projectId = selectedProjectId || purchases.find(p => p.id === editingPurchaseId)?.project_id || '';
    await addPurchase({ project_id: projectId, supplier_id: supplier.id, supplier_name: supplier.name, material_name: purchaseForm.material_name, quantity: Number(purchaseForm.quantity), unit: purchaseForm.unit, unit_price: Number(purchaseForm.unit_price), total_price: Number(purchaseForm.quantity) * Number(purchaseForm.unit_price), date: selectedDate, well_id: purchaseForm.well_id || undefined, notes: purchaseForm.notes || undefined });
    toast({ title: editingPurchaseId ? 'تم التعديل' : 'تم الإضافة', description: `مشتريات ${purchaseForm.material_name}` });
    resetPurchaseForm();
    setSaving(false);
  };

  const handleAddTransfer = async () => {
    if (!transferForm.worker_id || !transferForm.recipient_name || !transferForm.amount) {
      toast({ title: 'خطأ', description: 'يرجى ملء جميع الحقول المطلوبة', variant: 'destructive' });
      return;
    }
    setSaving(true);
    if (editingTransferId) {
      const result = await updateTransfer(editingTransferId, { amount: Number(transferForm.amount), recipientName: transferForm.recipient_name, transferNumber: transferForm.transfer_number || undefined, notes: transferForm.notes || undefined });
      if (result) { toast({ title: 'تم التعديل', description: `حوالة لـ ${transferForm.recipient_name}` }); resetTransferForm(); }
    } else {
      if (!selectedProjectId || !currentProject) { toast({ title: 'خطأ', description: 'يرجى اختيار مشروع', variant: 'destructive' }); setSaving(false); return; }
      const worker = workers.find(w => w.id === transferForm.worker_id);
      if (!worker) { setSaving(false); return; }
      const result = await addTransfer({ worker_id: worker.id, worker_name: worker.name, project_id: currentProject.id, project_name: currentProject.name, amount: Number(transferForm.amount), recipientName: transferForm.recipient_name, recipientPhone: undefined, transferMethod: transferForm.transfer_method, transferNumber: transferForm.transfer_number || undefined, transferDate: selectedDate, notes: transferForm.notes || undefined, created_by: user?.id || '' });
      if (result) { toast({ title: 'تم الإرسال', description: `حوالة لـ ${transferForm.recipient_name} — ${formatCurrency(Number(transferForm.amount))}` }); resetTransferForm(); }
    }
    setSaving(false);
  };

  const handleAddTransport = async () => {
    if (!transportForm.description || !transportForm.category || !transportForm.amount) {
      toast({ title: 'خطأ', description: 'يرجى ملء جميع الحقول المطلوبة', variant: 'destructive' });
      return;
    }
    setSaving(true);
    if (editingTransportId) await removeExpense(editingTransportId);
    if (!selectedProjectId || !currentProject) { toast({ title: 'خطأ', description: 'يرجى اختيار مشروع', variant: 'destructive' }); setSaving(false); return; }
    await addExpense({ project_id: currentProject.id, project_name: currentProject.name, category: 'نقل', description: `${transportForm.category}: ${transportForm.description}`, amount: Number(transportForm.amount), date: selectedDate, well_id: transportForm.well_id || undefined, created_by: user?.full_name || 'النظام' });
    toast({ title: 'تم الإضافة', description: `مصروف نقل: ${transportForm.description}` });
    resetTransportForm();
    setSaving(false);
  };

  const handleDeleteMisc = async () => {
    if (!deleteMiscId) return;
    await removeMiscExpense(deleteMiscId);
    toast({ title: 'تم الحذف' });
    setDeleteMiscId(null);
  };

  return (
    <div className="space-y-3 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/30">
        <p className="text-xs text-muted-foreground">{formatDateAr(selectedDate)}</p>
        <div className="flex items-center gap-1">
          <button onClick={() => setSelectedDate(d => addDays(d, -1))} className="size-9 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-border flex items-center justify-center hover:bg-accent transition-colors">
            <ChevronRight className="size-4" />
          </button>
          <input type="date" value={selectedDate} max={today} onChange={e => setSelectedDate(e.target.value)} className="h-9 px-2 rounded-xl border border-border bg-white/70 dark:bg-slate-800/70 text-xs font-bold text-center cursor-pointer outline-none" />
          <button onClick={() => setSelectedDate(d => addDays(d, 1))} disabled={selectedDate >= today} className="size-9 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-border flex items-center justify-center hover:bg-accent transition-colors disabled:opacity-40">
            <ChevronLeft className="size-4" />
          </button>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`text-[10px] font-bold border-0 ${balance >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {balance >= 0 ? 'فائض' : 'عجز'}
                </Badge>
                <p className="text-sm font-bold truncate">{currentProject ? currentProject.name : 'اختر مشروعاً'}</p>
              </div>
            </div>
            <div className="size-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
              <Receipt className="size-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          {todayData.carryover !== 0 && (
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${todayData.carryover > 0 ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              <ArrowLeftRight className="size-3.5 shrink-0" />
              <span className="font-medium">{todayData.carryover > 0 ? `المبلغ المتبقي السابق: +${formatCurrency(todayData.carryover)}` : `المبلغ المتبقي السابق: ${formatCurrency(todayData.carryover)}`}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1"><TrendingUp className="size-3.5 text-emerald-600" /><span className="text-[11px] text-muted-foreground">إجمالي الدخل:</span></div>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalIncome)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1"><TrendingDown className="size-3.5 text-red-600" /><span className="text-[11px] text-muted-foreground">إجمالي المصروفات:</span></div>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(todayData.expensesTotal)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-border pt-3">
            <div className="space-y-1.5">
              {[{ Icon: Users, color: 'text-blue-500', label: 'أجور العمال:', value: todayData.wages, valColor: 'text-blue-600 dark:text-blue-400' },
                { Icon: Package, color: 'text-emerald-500', label: 'المواد:', value: todayData.materials, valColor: 'text-emerald-600 dark:text-emerald-400' },
                { Icon: Send, color: 'text-amber-500', label: 'حوالات العمال:', value: todayData.transfersAmt, valColor: 'text-amber-600 dark:text-amber-400' }].map(({ Icon, color, label, value, valColor }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5"><Icon className={`size-3 ${color}`} /><span className="text-[11px] text-muted-foreground">{label}</span></div>
                  <span className={`text-[11px] font-semibold ${valColor}`}>{formatCurrency(value)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5"><Truck className="size-3 text-orange-500" /><span className="text-[11px] text-muted-foreground">المواصلات:</span></div>
                <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400">{formatCurrency(todayData.transport)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5"><Receipt className="size-3 text-purple-500" /><span className="text-[11px] text-muted-foreground">النثريات:</span></div>
                <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">{formatCurrency(todayData.misc)}</span>
              </div>
              <div className={`flex items-center justify-between rounded-lg px-2 py-1 ${balance >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                <div className="flex items-center gap-1.5"><Wallet className="size-3 text-muted-foreground" /><span className="text-[11px] font-bold text-muted-foreground">المتبقي:</span></div>
                <span className={`text-[12px] font-bold ${balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {balance < 0 ? '-' : ''}{formatCurrency(Math.abs(balance))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1. العهد */}
      <Collapsible open={showCustody} onOpenChange={setShowCustody}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 bg-card rounded-xl border shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center"><CreditCard className="size-4 text-indigo-600 dark:text-indigo-400" /></div>
              <div className="text-right">
                <span className="text-sm font-bold block">العهد (دخل اليوم)</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">{formatCurrency(todayData.custodyTotal)}</span>
              </div>
              {dailyCustodies.length > 0 && <Badge className="text-[9px] h-5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-0">{dailyCustodies.length}</Badge>}
            </div>
            {showCustody ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-3">
          <div className={`rounded-xl p-3 space-y-2.5 ${editingCustodyId ? 'bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200' : 'bg-indigo-50/50 dark:bg-indigo-900/10'}`}>
            <p className="text-xs font-bold text-indigo-900 dark:text-indigo-100">{editingCustodyId ? 'تعديل العهدة' : 'استلام عهدة جديدة'}</p>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-[10px] text-muted-foreground">المبلغ (ر.ي) *</Label><Input type="number" placeholder="مثال: 500000" value={custodyForm.amount} onChange={e => setCustodyForm(f => ({ ...f, amount: e.target.value }))} className="rounded-xl h-9 text-xs mt-0.5" /></div>
              <div><Label className="text-[10px] text-muted-foreground">اسم المُرسِل *</Label><Input placeholder="مثال: المدير محمد" value={custodyForm.senderName} onChange={e => setCustodyForm(f => ({ ...f, senderName: e.target.value }))} className="rounded-xl h-9 text-xs mt-0.5" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">طريقة التحويل</Label>
                <Select value={custodyForm.transferType} onValueChange={(v: any) => setCustodyForm(f => ({ ...f, transferType: v }))}>
                  <SelectTrigger className="rounded-xl h-9 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hawaleh">حوالة</SelectItem>
                    <SelectItem value="bank">بنك</SelectItem>
                    <SelectItem value="cash">نقد</SelectItem>
                    <SelectItem value="other">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-[10px] text-muted-foreground">رقم الحوالة</Label><Input placeholder="اختياري" value={custodyForm.transferNumber} onChange={e => setCustodyForm(f => ({ ...f, transferNumber: e.target.value }))} className="rounded-xl h-9 text-xs mt-0.5" /></div>
            </div>
            <div className="flex gap-2">
              {editingCustodyId && <Button variant="outline" onClick={resetCustodyForm} className="rounded-xl h-10 text-xs border-border"><XIcon className="size-3.5 ml-1" /> إلغاء</Button>}
              <Button onClick={handleAddCustody} disabled={saving} className={`flex-1 rounded-xl h-10 text-sm font-bold ${editingCustodyId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                {saving ? <Loader2 className="size-4 animate-spin ml-1" /> : editingCustodyId ? <Check className="size-4 ml-1" /> : <Plus className="size-4 ml-1" />}
                {editingCustodyId ? 'تحديث العهدة' : 'استلام العهدة'}
              </Button>
            </div>
          </div>
          {dailyCustodies.length > 0 && (
            <div className="space-y-2">
              {dailyCustodies.map(c => (
                <div key={c.id} className={`flex items-center gap-3 p-2.5 rounded-xl ${editingCustodyId === c.id ? 'bg-amber-100 dark:bg-amber-900/20 border border-amber-300' : 'bg-indigo-50 dark:bg-indigo-900/10'}`}>
                  <div className="size-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0"><CreditCard className="size-4 text-indigo-600 dark:text-indigo-400" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{c.senderName}</p>
                    <p className="text-[10px] text-muted-foreground">{{ bank: 'بنك', cash: 'نقد', hawaleh: 'حوالة', other: 'أخرى' }[c.transferType as string] || c.transferType}</p>
                  </div>
                  <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 shrink-0">{formatCurrency(c.amount)}</p>
                  <Button variant="ghost" size="sm" className="size-7 p-0 text-amber-600 shrink-0" onClick={() => startEditCustody(c)}><Pencil className="size-3" /></Button>
                  <Button variant="ghost" size="sm" className="size-7 p-0 text-destructive shrink-0" onClick={() => removeCustody(c.id)}><Trash2 className="size-3" /></Button>
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* 2. أجور العمال */}
      <Collapsible open={showWages} onOpenChange={setShowWages}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 bg-card rounded-xl border shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"><Users className="size-4 text-blue-600 dark:text-blue-400" /></div>
              <div className="text-right">
                <span className="text-sm font-bold block">أجور العمال</span>
                <span className="text-[10px] text-red-600 dark:text-red-400">-{formatCurrency(todayData.wages)}</span>
              </div>
              {dailyAttendance.length > 0 && <Badge className="text-[9px] h-5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">{dailyAttendance.length}</Badge>}
            </div>
            {showWages ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-3">
          <div className={`rounded-xl p-3 space-y-2.5 ${editingAttendanceId ? 'bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200' : 'bg-blue-50/50 dark:bg-blue-900/10'}`}>
            <p className="text-xs font-bold text-blue-900 dark:text-blue-100">{editingAttendanceId ? 'تعديل أجر العامل' : 'إضافة أجور عامل'}</p>
            <Select value={workerForm.worker_id} onValueChange={v => {
              const w = workers.find(x => x.id === v);
              setWorkerForm(f => ({ ...f, worker_id: v, amount: w ? String(w.dailyWage * Number(f.days || 0)) : '' }));
            }}>
              <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue placeholder="اختر العامل *" /></SelectTrigger>
              <SelectContent>{workers.filter(w => w.is_active).map(w => <SelectItem key={w.id} value={w.id}>{w.name} — {formatCurrency(w.dailyWage)}/يوم</SelectItem>)}</SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">عدد الأيام *</Label>
                <Input type="number" placeholder="1" value={workerForm.days} onChange={e => {
                  const w = workers.find(x => x.id === workerForm.worker_id);
                  setWorkerForm(f => ({ ...f, days: e.target.value, amount: w ? String(w.dailyWage * Number(e.target.value || 0)) : '' }));
                }} className="rounded-xl text-xs h-9 mt-0.5" />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">الإجمالي</Label>
                <Input placeholder="محتسب تلقائياً" value={workerForm.amount ? formatCurrency(Number(workerForm.amount)) : ''} readOnly className="rounded-xl text-xs h-9 bg-accent/50 mt-0.5 font-bold text-blue-600" />
              </div>
            </div>
            <div className="flex gap-2">
              {editingAttendanceId && <Button variant="outline" onClick={resetWorkerForm} className="rounded-xl h-9 text-xs border-border"><XIcon className="size-3 ml-1" /> إلغاء</Button>}
              <Button onClick={handleAddWorker} disabled={saving} className={`flex-1 rounded-xl text-xs h-9 ${editingAttendanceId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {saving ? <Loader2 className="size-3 animate-spin ml-1" /> : editingAttendanceId ? <Check className="size-3 ml-1" /> : <Plus className="size-3 ml-1" />}
                {editingAttendanceId ? 'تحديث' : 'تسجيل الأجر'}
              </Button>
            </div>
          </div>
          {dailyAttendance.length > 0 && (
            <div className="space-y-2">
              {dailyAttendance.map(a => (
                <div key={a.id} className={`flex items-center gap-3 p-2.5 rounded-xl ${editingAttendanceId === a.id ? 'bg-amber-100 dark:bg-amber-900/20 border border-amber-300' : 'bg-blue-50 dark:bg-blue-900/10'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{a.worker_name}</p>
                    <p className="text-[10px] text-muted-foreground">{a.hours / 8} يوم</p>
                  </div>
                  <p className="text-sm font-bold text-blue-600 shrink-0">{formatCurrency(a.earned)}</p>
                  <Button variant="ghost" size="sm" className="size-7 p-0 text-amber-600 shrink-0" onClick={() => startEditAttendance(a)}><Pencil className="size-3" /></Button>
                  <Button variant="ghost" size="sm" className="size-7 p-0 text-destructive shrink-0" onClick={async () => { await removeAttendance(a.id); toast({ title: 'تم الحذف', description: `تم حذف سجل ${a.worker_name}` }); }}><Trash2 className="size-3" /></Button>
                </div>
              ))}
              <div className="bg-blue-100 dark:bg-blue-900/20 rounded-xl p-2.5 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">إجمالي الأجور</span>
                <span className="text-sm font-bold text-blue-600">{formatCurrency(todayData.wages)}</span>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* 3. المشتريات */}
      <Collapsible open={showPurchases} onOpenChange={setShowPurchases}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 bg-card rounded-xl border shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><Package className="size-4 text-emerald-600 dark:text-emerald-400" /></div>
              <div className="text-right">
                <span className="text-sm font-bold block">مشتريات المواد</span>
                <span className="text-[10px] text-red-600 dark:text-red-400">-{formatCurrency(todayData.materials)}</span>
              </div>
              {dailyPurchases.length > 0 && <Badge className="text-[9px] h-5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">{dailyPurchases.length}</Badge>}
            </div>
            {showPurchases ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-3">
          <div className="rounded-xl p-3 space-y-2.5 bg-emerald-50/50 dark:bg-emerald-900/10">
            <p className="text-xs font-bold text-emerald-900 dark:text-emerald-100">إضافة شراء مواد</p>
            <Input placeholder="اسم المادة *" value={purchaseForm.material_name} onChange={e => setPurchaseForm(f => ({ ...f, material_name: e.target.value }))} className="rounded-xl h-9 text-xs" />
            <div className="grid grid-cols-3 gap-2">
              <Input type="number" placeholder="الكمية *" value={purchaseForm.quantity} onChange={e => setPurchaseForm(f => ({ ...f, quantity: e.target.value }))} className="rounded-xl h-9 text-xs" />
              <Input type="number" placeholder="السعر *" value={purchaseForm.unit_price} onChange={e => setPurchaseForm(f => ({ ...f, unit_price: e.target.value }))} className="rounded-xl h-9 text-xs" />
              <Input placeholder="الوحدة" value={purchaseForm.unit} onChange={e => setPurchaseForm(f => ({ ...f, unit: e.target.value }))} className="rounded-xl h-9 text-xs" />
            </div>
            {purchaseForm.quantity && purchaseForm.unit_price && (
              <div className="bg-emerald-100 dark:bg-emerald-900/20 rounded-xl p-2 flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground">الإجمالي</span>
                <span className="text-sm font-bold text-emerald-600">{formatCurrency(Number(purchaseForm.quantity) * Number(purchaseForm.unit_price))}</span>
              </div>
            )}
            <Select value={purchaseForm.supplier_id} onValueChange={v => setPurchaseForm(f => ({ ...f, supplier_id: v }))}>
              <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue placeholder="اختر المورد *" /></SelectTrigger>
              <SelectContent>{suppliers.filter(s => s.is_active).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={handleAddPurchase} disabled={saving} className="w-full rounded-xl text-xs h-9 bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="size-3 animate-spin ml-1" /> : <Plus className="size-3 ml-1" />}إضافة المشتريات
            </Button>
          </div>
          {dailyPurchases.length > 0 && (
            <div className="space-y-2">
              {dailyPurchases.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/10">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{p.material_name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.supplier_name} • {p.quantity} {p.unit}</p>
                  </div>
                  <p className="text-sm font-bold text-emerald-600 shrink-0">{formatCurrency(p.total_price)}</p>
                  <Button variant="ghost" size="sm" className="size-7 p-0 text-destructive shrink-0" onClick={() => removePurchase(p.id)}><Trash2 className="size-3" /></Button>
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* 4. المواصلات */}
      <Collapsible open={showTransport} onOpenChange={setShowTransport}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 bg-card rounded-xl border shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center"><Truck className="size-4 text-orange-600 dark:text-orange-400" /></div>
              <div className="text-right">
                <span className="text-sm font-bold block">المواصلات والنقل</span>
                <span className="text-[10px] text-red-600 dark:text-red-400">-{formatCurrency(todayData.transport)}</span>
              </div>
              {dailyTransportExpenses.length > 0 && <Badge className="text-[9px] h-5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0">{dailyTransportExpenses.length}</Badge>}
            </div>
            {showTransport ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-3">
          <div className="rounded-xl p-3 space-y-2.5 bg-orange-50/50 dark:bg-orange-900/10">
            <p className="text-xs font-bold text-orange-900 dark:text-orange-100">إضافة مصروف نقل</p>
            <Input placeholder="الوصف *" value={transportForm.description} onChange={e => setTransportForm(f => ({ ...f, description: e.target.value }))} className="rounded-xl h-9 text-xs" />
            <div className="grid grid-cols-2 gap-2">
              <Select value={transportForm.category} onValueChange={v => setTransportForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue placeholder="الفئة *" /></SelectTrigger>
                <SelectContent>{TRANSPORT_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" placeholder="المبلغ *" value={transportForm.amount} onChange={e => setTransportForm(f => ({ ...f, amount: e.target.value }))} className="rounded-xl h-9 text-xs" />
            </div>
            <Button onClick={handleAddTransport} disabled={saving} className="w-full rounded-xl h-9 text-xs bg-orange-600 hover:bg-orange-700">
              {saving ? <Loader2 className="size-3 animate-spin ml-1" /> : <Plus className="size-3 ml-1" />}إضافة النقل
            </Button>
          </div>
          {dailyTransportExpenses.length > 0 && (
            <div className="space-y-2">
              {dailyTransportExpenses.map(e => (
                <div key={e.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-orange-50 dark:bg-orange-900/10">
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium">{e.description}</p></div>
                  <p className="text-sm font-bold text-orange-600 shrink-0">{formatCurrency(e.amount)}</p>
                  <Button variant="ghost" size="sm" className="size-7 p-0 text-destructive shrink-0" onClick={() => removeExpense(e.id)}><Trash2 className="size-3" /></Button>
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* 5. حوالات العمال */}
      <Collapsible open={showTransfers} onOpenChange={setShowTransfers}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 bg-card rounded-xl border shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"><DollarSign className="size-4 text-amber-600 dark:text-amber-400" /></div>
              <div className="text-right">
                <span className="text-sm font-bold block">حوالات العمال</span>
                <span className="text-[10px] text-red-600 dark:text-red-400">-{formatCurrency(todayData.transfersAmt)}</span>
              </div>
              {dailyTransfers.length > 0 && <Badge className="text-[9px] h-5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">{dailyTransfers.length}</Badge>}
            </div>
            {showTransfers ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-3">
          <div className={`rounded-xl p-3 space-y-2.5 ${editingTransferId ? 'bg-blue-50/60 dark:bg-blue-900/10 border border-blue-200' : 'bg-amber-50/50 dark:bg-amber-900/10'}`}>
            <p className="text-xs font-bold">{editingTransferId ? 'تعديل الحوالة' : 'إرسال حوالة عامل'}</p>
            <Select value={transferForm.worker_id} onValueChange={v => setTransferForm(f => ({ ...f, worker_id: v }))}>
              <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue placeholder="اختر العامل *" /></SelectTrigger>
              <SelectContent>{workers.filter(w => w.is_active).map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="اسم المستلم *" value={transferForm.recipient_name} onChange={e => setTransferForm(f => ({ ...f, recipient_name: e.target.value }))} className="rounded-xl h-9 text-xs" />
              <Input type="number" placeholder="المبلغ *" value={transferForm.amount} onChange={e => setTransferForm(f => ({ ...f, amount: e.target.value }))} className="rounded-xl h-9 text-xs" />
            </div>
            <div className="flex gap-2">
              {editingTransferId && <Button variant="outline" onClick={resetTransferForm} className="rounded-xl h-9 text-xs border-border"><XIcon className="size-3 ml-1" /> إلغاء</Button>}
              <Button onClick={handleAddTransfer} disabled={saving} className={`flex-1 rounded-xl text-xs h-9 ${editingTransferId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
                {saving ? <Loader2 className="size-3 animate-spin ml-1" /> : editingTransferId ? <Check className="size-3 ml-1" /> : <Plus className="size-3 ml-1" />}
                {editingTransferId ? 'تحديث' : 'إرسال الحوالة'}
              </Button>
            </div>
          </div>
          {dailyTransfers.length > 0 && (
            <div className="space-y-2">
              {dailyTransfers.map(t => (
                <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/10">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{t.worker_name}</p>
                    <p className="text-[10px] text-muted-foreground">إلى: {t.recipientName}</p>
                  </div>
                  <p className="text-sm font-bold text-amber-600 shrink-0">{formatCurrency(t.amount)}</p>
                  <Button variant="ghost" size="sm" className="size-7 p-0 text-amber-600 shrink-0" onClick={() => startEditTransfer(t)}><Pencil className="size-3" /></Button>
                  <Button variant="ghost" size="sm" className="size-7 p-0 text-destructive shrink-0" onClick={() => removeTransfer(t.id)}><Trash2 className="size-3" /></Button>
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* 6. النثريات */}
      <Collapsible open={showMisc} onOpenChange={setShowMisc}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 bg-card rounded-xl border shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center"><Receipt className="size-4 text-purple-600 dark:text-purple-400" /></div>
              <div className="text-right">
                <span className="text-sm font-bold block">النثريات المتنوعة</span>
                <span className="text-[10px] text-red-600 dark:text-red-400">-{formatCurrency(todayData.misc)}</span>
              </div>
              {dailyMiscExpenses.length > 0 && <Badge className="text-[9px] h-5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0">{dailyMiscExpenses.length}</Badge>}
            </div>
            {showMisc ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-3">
          <div className={`rounded-xl p-3 space-y-2.5 ${editingMiscId ? 'bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200' : 'bg-purple-50/50 dark:bg-purple-900/10'}`}>
            <p className="text-xs font-bold">{editingMiscId ? 'تعديل النثرية' : 'إضافة نثريات'}</p>
            <Input placeholder="الوصف *" value={miscForm.description} onChange={e => setMiscForm(f => ({ ...f, description: e.target.value }))} className="rounded-xl h-9 text-xs" />
            <Input type="number" placeholder="المبلغ *" value={miscForm.amount} onChange={e => setMiscForm(f => ({ ...f, amount: e.target.value }))} className="rounded-xl h-9 text-xs" />
            <div className="flex gap-2">
              {editingMiscId && <Button variant="outline" onClick={resetMiscForm} className="rounded-xl h-9 text-xs border-border"><XIcon className="size-3 ml-1" /> إلغاء</Button>}
              <Button onClick={handleAddMisc} disabled={saving} className={`flex-1 rounded-xl text-xs h-9 ${editingMiscId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
                {saving ? <Loader2 className="size-3 animate-spin ml-1" /> : editingMiscId ? <Check className="size-3 ml-1" /> : <Plus className="size-3 ml-1" />}
                {editingMiscId ? 'تحديث' : 'إضافة النثريات'}
              </Button>
            </div>
          </div>
          {dailyMiscExpenses.length > 0 && (
            <div className="space-y-2">
              {dailyMiscExpenses.map(m => (
                <div key={m.id} className={`flex items-center gap-3 p-2.5 rounded-xl ${editingMiscId === m.id ? 'bg-amber-100 dark:bg-amber-900/20 border border-amber-300' : 'bg-purple-50 dark:bg-purple-900/10'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{m.description}</p>
                    <p className="text-[10px] text-muted-foreground">{m.project_name}</p>
                  </div>
                  <p className="text-sm font-bold text-purple-600 shrink-0">{formatCurrency(m.amount)}</p>
                  <Button variant="ghost" size="sm" className="size-7 p-0 text-amber-600 shrink-0" onClick={() => startEditMisc(m)}><Pencil className="size-3" /></Button>
                  <Button variant="ghost" size="sm" className="size-7 p-0 text-destructive shrink-0" onClick={() => setDeleteMiscId(m.id)}><Trash2 className="size-3" /></Button>
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Rollover Summary */}
      <Card className={`border-2 ${balance >= 0 ? 'border-blue-200 dark:border-blue-800' : 'border-red-200 dark:border-red-800'}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Send className={`size-4 ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
            <span className="text-sm font-bold">{balance >= 0 ? 'الرصيد المرحَّل للغد' : 'الدين المرحَّل للغد'}</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">عهد اليوم</span><span className="font-semibold text-indigo-600">{formatCurrency(todayData.custodyTotal)}</span></div>
            {todayData.carryover !== 0 && (
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">ترحيل الأمس</span><span className={`font-semibold ${todayData.carryover > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{todayData.carryover > 0 ? '+' : ''}{formatCurrency(todayData.carryover)}</span></div>
            )}
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">إجمالي الدخل</span><span className="font-semibold text-emerald-600">{formatCurrency(totalIncome)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">إجمالي المصروفات</span><span className="font-semibold text-red-600">-{formatCurrency(todayData.expensesTotal)}</span></div>
            <div className="h-px bg-border my-1" />
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold">{balance >= 0 ? 'يُرحَّل للغد' : 'دين على الغد'}</span>
              <span className={`text-lg font-bold ${balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteMiscId} onOpenChange={open => { if (!open) setDeleteMiscId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>تأكيد حذف النثرية</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMisc} className="bg-destructive">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
