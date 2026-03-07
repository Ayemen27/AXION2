import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useWorkers, useAttendance, useWorkerTransfers, useProjects } from '@/hooks/useCloudData';
import { useSelectedProject } from '@/hooks/useSelectedProject';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate } from '@/constants/config';
import {
  Users, DollarSign, Plus, Search, Trash2,
  Wallet, Send, CreditCard, Banknote, Phone,
  ChevronLeft, X, Clock, Building2, Hash,
  ArrowUpCircle, Pencil, Loader2,
} from 'lucide-react';

const METHOD_CONFIG = {
  cash:    { label: 'نقد',   icon: Banknote,  color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', iconColor: 'text-emerald-500' },
  bank:    { label: 'بنك',   icon: CreditCard, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',           iconColor: 'text-blue-500' },
  hawaleh: { label: 'حوالة', icon: Send,        color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',   iconColor: 'text-purple-500' },
};

export default function WorkerAccountsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { workers, loading: loadingWorkers } = useWorkers();
  const { projects } = useProjects();
  const { attendance, loading: loadingAttendance } = useAttendance();
  const { transfers, loading: loadingTransfers, addTransfer, updateTransfer, removeTransfer } = useWorkerTransfers();
  const { selectedProjectId } = useSelectedProject();
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingTransferId, setEditingTransferId] = useState<string | null>(null);
  const [methodFilter, setMethodFilter] = useState<'all' | 'cash' | 'bank' | 'hawaleh'>('all');

  const openEditTransfer = (id: string) => {
    const t = transfers.find(x => x.id === id);
    if (!t) return;
    setForm({ amount: String(t.amount), recipientName: t.recipientName, recipientPhone: t.recipientPhone || '', transferMethod: t.transferMethod as any, transferNumber: t.transferNumber || '', transferDate: t.transferDate, notes: t.notes || '' });
    setEditingTransferId(id);
    setShowCreate(true);
  };

  const [form, setForm] = useState({ amount: '', recipientName: '', recipientPhone: '', transferMethod: 'hawaleh' as 'cash' | 'bank' | 'hawaleh', transferNumber: '', transferDate: new Date().toISOString().split('T')[0], notes: '' });

  const resetForm = () => { setEditingTransferId(null); setForm({ amount: '', recipientName: '', recipientPhone: '', transferMethod: 'hawaleh', transferNumber: '', transferDate: new Date().toISOString().split('T')[0], notes: '' }); };

  const activeWorkers = useMemo(() =>
    workers.filter(w => w.is_active && (w.name.includes(search) || w.type.includes(search)) && (!selectedProjectId || w.project_id === selectedProjectId)),
    [workers, search, selectedProjectId]
  );

  const workerSummaries = useMemo(() => {
    return activeWorkers.map(w => {
      const workerAttendance = attendance.filter(r => r.worker_id === w.id);
      const totalEarned = workerAttendance.reduce((s, r) => s + r.earned, 0);
      const totalHours = workerAttendance.reduce((s, r) => s + r.hours, 0);
      const workerTransfers = transfers.filter(t => t.worker_id === w.id);
      const totalTransferred = workerTransfers.reduce((s, t) => s + t.amount, 0);
      const remainingBalance = totalEarned - totalTransferred;
      return { ...w, totalEarned, totalHours, totalTransferred, remainingBalance, workerTransfers };
    });
  }, [activeWorkers, attendance, transfers]);

  const globalStats = useMemo(() => ({
    totalEarned: workerSummaries.reduce((s, w) => s + w.totalEarned, 0),
    totalTransferred: workerSummaries.reduce((s, w) => s + w.totalTransferred, 0),
    totalRemaining: workerSummaries.reduce((s, w) => s + w.remainingBalance, 0),
    workersCount: workerSummaries.length,
  }), [workerSummaries]);

  const selectedWorker = selectedWorkerId ? workerSummaries.find(w => w.id === selectedWorkerId) : null;

  const filteredTransfers = useMemo(() => {
    if (!selectedWorker) return [];
    return selectedWorker.workerTransfers.filter(t => methodFilter === 'all' || t.transferMethod === methodFilter).sort((a, b) => b.transferDate.localeCompare(a.transferDate));
  }, [selectedWorker, methodFilter]);

  const handleCreate = async () => {
    if (!form.amount || !form.recipientName) {
      toast({ title: 'خطأ', description: 'يرجى ملء جميع الحقول المطلوبة', variant: 'destructive' });
      return;
    }
    setSaving(true);
    if (editingTransferId) {
      const result = await updateTransfer(editingTransferId, { amount: Number(form.amount), recipientName: form.recipientName, recipientPhone: form.recipientPhone || undefined, transferMethod: form.transferMethod, transferNumber: form.transferNumber || undefined, transferDate: form.transferDate, notes: form.notes || undefined });
      if (result) { toast({ title: 'تم التعديل', description: `${formatCurrency(Number(form.amount))} لـ ${form.recipientName}` }); setShowCreate(false); resetForm(); }
    } else {
      if (!selectedProjectId || !selectedWorkerId) { toast({ title: 'خطأ', description: 'يرجى اختيار مشروع وعامل', variant: 'destructive' }); setSaving(false); return; }
      const worker = workers.find(w => w.id === selectedWorkerId);
      const project = projects.find(p => p.id === selectedProjectId);
      const result = await addTransfer({ worker_id: selectedWorkerId, worker_name: worker?.name || '', project_id: selectedProjectId, project_name: project?.name || '', amount: Number(form.amount), recipientName: form.recipientName, recipientPhone: form.recipientPhone || undefined, transferMethod: form.transferMethod, transferNumber: form.transferNumber || undefined, transferDate: form.transferDate, notes: form.notes || undefined, created_by: user?.full_name || 'مستخدم' });
      if (result) { toast({ title: 'تم إرسال الحوالة', description: `${formatCurrency(Number(form.amount))} لـ ${form.recipientName}` }); setShowCreate(false); resetForm(); }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const ok = await removeTransfer(deleteId);
    if (ok) toast({ title: 'تم الحذف' });
    setDeleteId(null);
  };

  const isLoading = loadingWorkers || loadingAttendance || loadingTransfers;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          {isLoading && <Loader2 className="size-3 animate-spin" />}
          الحوالات المالية وأرصدة العمال
        </p>
        {selectedWorkerId && (
          <Button onClick={() => { resetForm(); setShowCreate(true); }} className="rounded-xl">
            <Plus className="size-4 ml-1" /> إرسال حوالة
          </Button>
        )}
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي المكتسب', value: globalStats.totalEarned, icon: Wallet, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'إجمالي المحوّل', value: globalStats.totalTransferred, icon: Send, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'الرصيد المتبقي', value: globalStats.totalRemaining, icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'عدد العمال', value: globalStats.workersCount, icon: Users, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', isCount: true },
        ].map(c => (
          <Card key={c.label} className="border-0 shadow-sm">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`size-9 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}><c.icon className={`size-4 ${c.color}`} /></div>
              <div>
                <p className="text-[10px] text-muted-foreground">{c.label}</p>
                {isLoading ? <Skeleton className="h-4 w-16 mt-0.5" /> : <p className={`text-xs font-bold ${c.color}`}>{(c as any).isCount ? `${c.value} عامل` : formatCurrency(c.value as number)}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Workers List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم..." className="pr-9 rounded-xl" />
          </div>
          <div className="space-y-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)
            ) : (
              workerSummaries.map(w => (
                <Card key={w.id} className={`border-0 shadow-sm cursor-pointer transition-all hover:shadow-md ${selectedWorkerId === w.id ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedWorkerId(w.id === selectedWorkerId ? null : w.id)}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Users className="size-4 text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{w.name}</p>
                        <p className="text-[11px] text-muted-foreground">{w.type}</p>
                      </div>
                      <ChevronLeft className={`size-4 text-muted-foreground transition-transform ${selectedWorkerId === w.id ? 'rotate-180' : ''}`} />
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { label: 'المكتسب', value: w.totalEarned, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                        { label: 'محوّل', value: w.totalTransferred, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
                        { label: 'رصيد', value: w.remainingBalance, color: w.remainingBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400', bg: w.remainingBalance >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20' },
                      ].map(s => (
                        <div key={s.label} className={`${s.bg} rounded-md p-1.5 text-center`}>
                          <p className={`text-[9px] ${s.color}`}>{s.label}</p>
                          <p className={`text-[9px] font-bold leading-tight ${s.color}`}>{formatCurrency(s.value)}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
            {!isLoading && workerSummaries.length === 0 && (
              <div className="text-center py-8"><Users className="size-10 text-muted-foreground/30 mx-auto mb-2" /><p className="text-sm text-muted-foreground">لا يوجد عمال نشطون</p></div>
            )}
          </div>
        </div>

        {/* Worker Detail */}
        <div className="lg:col-span-2">
          {selectedWorker ? (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center"><Users className="size-6 text-primary" /></div>
                    <div>
                      <CardTitle className="text-base">{selectedWorker.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{selectedWorker.type}</p>
                      <p className="text-[11px] text-muted-foreground">{formatCurrency(selectedWorker.dailyWage)}/يوم</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="rounded-xl text-xs" onClick={() => { resetForm(); setShowCreate(true); }}>
                      <Plus className="size-3 ml-1" /> إرسال حوالة
                    </Button>
                    <Button variant="ghost" size="sm" className="size-8 p-0" onClick={() => setSelectedWorkerId(null)}><X className="size-4" /></Button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    { label: 'المستحق من الحضور', value: selectedWorker.totalEarned, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                    { label: 'إجمالي الحوالات', value: selectedWorker.totalTransferred, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
                    { label: 'الرصيد المتبقي', value: selectedWorker.remainingBalance, color: selectedWorker.remainingBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400', bg: selectedWorker.remainingBalance >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20' },
                  ].map(s => (
                    <div key={s.label} className={`${s.bg} rounded-xl p-2.5 text-center`}>
                      <p className="text-[9px] text-muted-foreground">{s.label}</p>
                      <p className={`text-xs font-bold mt-0.5 ${s.color}`}>{formatCurrency(s.value)}</p>
                    </div>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="transfers">
                  <div className="flex items-center justify-between mb-3">
                    <TabsList className="rounded-xl">
                      <TabsTrigger value="transfers" className="rounded-lg text-xs">الحوالات ({selectedWorker.workerTransfers.length})</TabsTrigger>
                      <TabsTrigger value="attendance" className="rounded-lg text-xs"><Clock className="size-3 ml-1" /> الحضور ({attendance.filter(r => r.worker_id === selectedWorkerId).length})</TabsTrigger>
                    </TabsList>
                    <Select value={methodFilter} onValueChange={v => setMethodFilter(v as typeof methodFilter)}>
                      <SelectTrigger className="w-28 h-8 rounded-xl text-xs"><SelectValue placeholder="الطريقة" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        <SelectItem value="cash">نقد</SelectItem>
                        <SelectItem value="bank">بنك</SelectItem>
                        <SelectItem value="hawaleh">حوالة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <TabsContent value="transfers" className="space-y-2 max-h-72 overflow-y-auto">
                    {filteredTransfers.length === 0 ? (
                      <div className="text-center py-8">
                        <Send className="size-10 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">لا توجد حوالات مسجلة</p>
                        <Button size="sm" variant="outline" className="mt-2 rounded-xl text-xs" onClick={() => { resetForm(); setShowCreate(true); }}>
                          <Plus className="size-3 ml-1" /> إرسال حوالة جديدة
                        </Button>
                      </div>
                    ) : (
                      filteredTransfers.map(t => {
                        const cfg = METHOD_CONFIG[t.transferMethod as keyof typeof METHOD_CONFIG] || METHOD_CONFIG.cash;
                        const Icon = cfg.icon;
                        return (
                          <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-accent/40 hover:bg-accent/60 transition-colors">
                            <Icon className={`size-4 shrink-0 ${cfg.iconColor}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-xs font-medium">إلى: {t.recipientName}</p>
                                <Badge className={`text-[8px] border-0 ${cfg.color}`}>{cfg.label}</Badge>
                              </div>
                              <div className="text-[10px] text-muted-foreground flex items-center gap-2 flex-wrap">
                                <span>{formatDate(t.transferDate)}</span>
                                {t.recipientPhone && <span className="flex items-center gap-0.5"><Phone className="size-2.5" />{t.recipientPhone}</span>}
                                {t.transferNumber && <span className="flex items-center gap-0.5"><Hash className="size-2.5" />{t.transferNumber}</span>}
                                {t.project_name && <span className="flex items-center gap-0.5"><Building2 className="size-2.5" />{t.project_name}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <p className="text-xs font-bold text-red-600 dark:text-red-400">-{formatCurrency(t.amount)}</p>
                              <Button variant="ghost" size="sm" className="size-6 p-0 text-amber-500 hover:text-amber-700" onClick={() => openEditTransfer(t.id)}><Pencil className="size-3" /></Button>
                              <Button variant="ghost" size="sm" className="size-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(t.id)}><Trash2 className="size-3" /></Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </TabsContent>

                  <TabsContent value="attendance" className="space-y-2 max-h-72 overflow-y-auto">
                    {attendance.filter(r => r.worker_id === selectedWorkerId).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">لا توجد سجلات حضور</p>
                    ) : (
                      attendance.filter(r => r.worker_id === selectedWorkerId).sort((a, b) => b.date.localeCompare(a.date)).map(r => (
                        <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-accent/40">
                          <Clock className={`size-4 shrink-0 ${r.status === 'present' ? 'text-emerald-500' : r.status === 'overtime' ? 'text-purple-500' : r.status === 'half' ? 'text-amber-500' : 'text-red-400'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{formatDate(r.date)} — {r.hours} ساعة</p>
                            <p className="text-[10px] text-muted-foreground">{r.status === 'present' ? 'يوم كامل' : r.status === 'overtime' ? 'يوم ونصف' : r.status === 'half' ? 'نصف يوم' : 'غائب'}{r.project_name && ` • ${r.project_name}`}</p>
                          </div>
                          <p className={`text-xs font-bold shrink-0 ${r.earned > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>{formatCurrency(r.earned)}</p>
                        </div>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full min-h-[300px] flex items-center justify-center border-2 border-dashed border-border rounded-2xl p-8">
              <div className="text-center">
                <Wallet className="size-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">اختر عاملاً لعرض حسابه</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transfer Dialog */}
      <Dialog open={showCreate} onOpenChange={open => { if (!open) resetForm(); setShowCreate(open); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingTransferId ? 'تعديل الحوالة' : `إرسال حوالة لـ ${selectedWorker?.name}`}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {(['cash', 'bank', 'hawaleh'] as const).map(m => {
                const cfg = METHOD_CONFIG[m];
                const Icon = cfg.icon;
                return (
                  <button key={m} onClick={() => setForm(f => ({ ...f, transferMethod: m }))} className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${form.transferMethod === m ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
                    <Icon className={`size-5 ${cfg.iconColor}`} />
                    <span className="text-[11px] font-medium">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
            {selectedProjectId && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-blue-600" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">المشروع المحدد</p>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{projects.find(p => p.id === selectedProjectId)?.name || 'غير محدد'}</p>
                  </div>
                </div>
              </div>
            )}
            <div>
              <Label>المبلغ (ر.ي) <span className="text-destructive">*</span></Label>
              <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="50000" className="rounded-xl" />
              {selectedWorker && <p className="text-[10px] text-muted-foreground mt-1">الرصيد المتاح: <span className={selectedWorker.remainingBalance >= 0 ? 'text-emerald-600' : 'text-red-500'}>{formatCurrency(selectedWorker.remainingBalance)}</span></p>}
            </div>
            <div>
              <Label>اسم المستلم <span className="text-destructive">*</span></Label>
              <Input value={form.recipientName} onChange={e => setForm(f => ({ ...f, recipientName: e.target.value }))} placeholder="اسم المستلم" className="rounded-xl" />
            </div>
            <div>
              <Label>رقم الهاتف</Label>
              <div className="relative"><Phone className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input value={form.recipientPhone} onChange={e => setForm(f => ({ ...f, recipientPhone: e.target.value }))} placeholder="777123456" className="rounded-xl pr-9" /></div>
            </div>
            {form.transferMethod !== 'cash' && (
              <div>
                <Label>{form.transferMethod === 'bank' ? 'رقم العملية البنكية' : 'رقم الحوالة'}</Label>
                <div className="relative"><Hash className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input value={form.transferNumber} onChange={e => setForm(f => ({ ...f, transferNumber: e.target.value }))} placeholder="رقم المرجع" className="rounded-xl pr-9" /></div>
              </div>
            )}
            <div>
              <Label>تاريخ الحوالة</Label>
              <Input type="date" value={form.transferDate} onChange={e => setForm(f => ({ ...f, transferDate: e.target.value }))} className="rounded-xl" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }} className="rounded-xl">إلغاء</Button>
              <Button onClick={handleCreate} disabled={saving} className={`rounded-xl gap-1 ${editingTransferId ? 'bg-amber-600 hover:bg-amber-700' : ''}`}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                {editingTransferId ? <><Pencil className="size-4" /> تحديث الحوالة</> : <><Send className="size-4" /> إرسال الحوالة</>}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>حذف الحوالة</AlertDialogTitle><AlertDialogDescription>هل أنت متأكد من حذف هذه الحوالة؟ سيُعاد احتساب الرصيد تلقائياً.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
