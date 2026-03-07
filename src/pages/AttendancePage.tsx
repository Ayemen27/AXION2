import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useWorkers, useAttendance, useProjects, useWorkerMiscExpenses } from '@/hooks/useCloudData';
import { useSelectedProject } from '@/hooks/useSelectedProject';
import { formatCurrency } from '@/constants/config';
import {
  CheckCircle2, XCircle, Clock, DollarSign,
  Calendar, ChevronLeft, ChevronRight, Building2,
  Search, CalendarDays, Plus, Minus, Zap, TrendingUp,
  Timer, RotateCcw, Save, Users2, Trash2, Receipt, Pencil, Loader2,
} from 'lucide-react';
import type { AttendanceRecord } from '@/types';

function getStatus(hours: number): 'absent' | 'half' | 'present' | 'overtime' {
  if (hours === 0) return 'absent';
  if (hours < 8) return 'half';
  if (hours === 8) return 'present';
  return 'overtime';
}

const STATUS_CONFIG = {
  present:  { label: 'يوم كامل',  color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
  absent:   { label: 'غائب',      color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',                 icon: XCircle },
  half:     { label: 'نصف يوم',   color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',         icon: Clock },
  overtime: { label: 'يوم ونصف',  color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',     icon: Zap },
};

const QUICK_PRESETS = [
  { label: 'غائب',     hours: 0,  active: 'bg-red-500 text-white',     inactive: 'bg-background border border-border text-foreground hover:bg-red-50' },
  { label: 'نصف يوم',  hours: 4,  active: 'bg-amber-500 text-white',   inactive: 'bg-background border border-border text-foreground hover:bg-amber-50' },
  { label: 'يوم كامل', hours: 8,  active: 'bg-emerald-500 text-white', inactive: 'bg-background border border-border text-foreground hover:bg-emerald-50' },
  { label: 'يوم ونصف', hours: 12, active: 'bg-purple-500 text-white',  inactive: 'bg-background border border-border text-foreground hover:bg-purple-50' },
];

function formatDateISO(d: Date) { return d.toISOString().split('T')[0]; }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function getMonthDays(year: number, month: number) {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }
  return days;
}
function formatDateAr(iso: string) {
  return new Date(iso).toLocaleDateString('ar-YE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
const MONTH_NAMES = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

export default function AttendancePage() {
  const { toast } = useToast();
  const { workers, loading: loadingWorkers } = useWorkers();
  const { projects } = useProjects();
  const { attendance, loading: loadingAttendance, upsertRecord } = useAttendance();
  const { miscExpenses, loading: loadingMisc, addMiscExpense, removeMiscExpense, updateMiscExpense } = useWorkerMiscExpenses();
  const { selectedProjectId } = useSelectedProject();
  const [saving, setSaving] = useState(false);

  const [showMiscDialog, setShowMiscDialog] = useState(false);
  const [editingMiscId, setEditingMiscId] = useState<string | null>(null);
  const [miscForm, setMiscForm] = useState({ worker_id: '', amount: '', description: '', notes: '' });

  const openEditMisc = (id: string) => {
    const m = miscExpenses.find(x => x.id === id);
    if (!m) return;
    setMiscForm({ worker_id: m.worker_id, amount: String(m.amount), description: m.description, notes: m.notes || '' });
    setEditingMiscId(id);
    setShowMiscDialog(true);
  };

  const [selectedDate, setSelectedDate] = useState(formatDateISO(new Date()));
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState(selectedProjectId || 'all');
  const [activeTab, setActiveTab] = useState('daily');

  useEffect(() => { setProjectFilter(selectedProjectId || 'all'); }, [selectedProjectId]);

  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const activeWorkers = useMemo(() =>
    workers.filter(w => w.is_active &&
      (projectFilter === 'all' || w.project_id === projectFilter) &&
      (w.name.includes(search) || w.type.includes(search))
    ), [workers, projectFilter, search]);

  const dateAttendanceMap = useMemo(() => {
    const map: Record<string, typeof attendance[0]> = {};
    attendance.filter(r => r.date === selectedDate).forEach(r => { map[r.worker_id] = r; });
    return map;
  }, [attendance, selectedDate]);

  const dailyStats = useMemo(() => {
    const allActiveWorkers = workers.filter(w => w.is_active && (projectFilter === 'all' || w.project_id === projectFilter));
    const records = allActiveWorkers.map(w => dateAttendanceMap[w.id]);
    const present = records.filter(r => r && (r.status === 'present' || r.status === 'overtime')).length;
    const half = records.filter(r => r && r.status === 'half').length;
    const absent = records.filter(r => !r || r.status === 'absent').length;
    const totalHours = records.reduce((s, r) => s + (r?.hours || 0), 0);
    const earned = records.reduce((s, r) => s + (r?.earned || 0), 0);
    const workDays = totalHours / 8;
    const attendanceRate = allActiveWorkers.length > 0 ? Math.round(((present + half * 0.5) / allActiveWorkers.length) * 100) : 0;
    return { present, half, absent, totalHours, earned, workDays, attendanceRate, total: allActiveWorkers.length };
  }, [dateAttendanceMap, workers, projectFilter]);

  const setHours = useCallback(async (workerId: string, hours: number) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;
    const project = projects.find(p => p.id === worker.project_id);
    await upsertRecord(workerId, selectedDate, hours, worker.name, worker.type, worker.dailyWage, worker.project_id, project?.name);
  }, [workers, projects, selectedDate, upsertRecord]);

  const adjustHours = useCallback((workerId: string, delta: number) => {
    const current = dateAttendanceMap[workerId]?.hours ?? 0;
    setHours(workerId, Math.max(0, Math.min(24, current + delta)));
  }, [dateAttendanceMap, setHours]);

  const markAll = async (hours: number) => {
    setSaving(true);
    for (const w of activeWorkers) {
      const project = projects.find(p => p.id === w.project_id);
      await upsertRecord(w.id, selectedDate, hours, w.name, w.type, w.dailyWage, w.project_id, project?.name);
    }
    setSaving(false);
    const preset = QUICK_PRESETS.find(p => p.hours === hours);
    toast({ title: 'تم التطبيق', description: `تم تعيين "${preset?.label}" لجميع العمال` });
  };

  const resetAll = () => markAll(0).then(() => toast({ title: 'تم الإعادة', description: 'تم تعيين الكل كغائب' }));

  const handleAddMisc = async () => {
    if (!miscForm.worker_id || !miscForm.amount || !miscForm.description) {
      toast({ title: 'خطأ', description: 'يرجى ملء جميع الحقول المطلوبة', variant: 'destructive' });
      return;
    }
    setSaving(true);
    if (editingMiscId) {
      await updateMiscExpense(editingMiscId, { description: miscForm.description, amount: Number(miscForm.amount), notes: miscForm.notes || undefined });
      toast({ title: 'تم التعديل', description: `${miscForm.description} — ${formatCurrency(Number(miscForm.amount))}` });
    } else {
      if (!selectedProjectId) {
        toast({ title: 'خطأ', description: 'يرجى اختيار مشروع من الشريط العلوي أولاً', variant: 'destructive' });
        setSaving(false); return;
      }
      const worker = workers.find(w => w.id === miscForm.worker_id);
      const project = projects.find(p => p.id === selectedProjectId);
      await addMiscExpense({ worker_id: miscForm.worker_id, worker_name: worker?.name || '', project_id: selectedProjectId, project_name: project?.name || '', amount: Number(miscForm.amount), description: miscForm.description, notes: miscForm.notes, date: selectedDate });
      toast({ title: 'تمت إضافة النثريات', description: `${miscForm.description} — ${formatCurrency(Number(miscForm.amount))}` });
    }
    setSaving(false);
    setShowMiscDialog(false);
    setEditingMiscId(null);
    setMiscForm({ worker_id: '', amount: '', description: '', notes: '' });
  };

  const todayMiscExpenses = useMemo(() => miscExpenses.filter(m => m.date === selectedDate), [miscExpenses, selectedDate]);
  const todayMiscTotal = todayMiscExpenses.reduce((s, m) => s + m.amount, 0);

  const monthDays = useMemo(() => getMonthDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const monthStart = formatDateISO(monthDays[0]);
  const monthEnd = formatDateISO(monthDays[monthDays.length - 1]);

  const salarySummary = useMemo(() => {
    const monthRecords = attendance.filter(r => r.date >= monthStart && r.date <= monthEnd);
    const map: Record<string, { worker_id: string; name: string; type: string; dailyWage: number; totalHours: number; fullDays: number; halfDays: number; overtimeDays: number; earned: number }> = {};
    workers.filter(w => w.is_active).forEach(w => {
      map[w.id] = { worker_id: w.id, name: w.name, type: w.type, dailyWage: w.dailyWage, totalHours: 0, fullDays: 0, halfDays: 0, overtimeDays: 0, earned: 0 };
    });
    monthRecords.forEach(r => {
      if (!map[r.worker_id]) return;
      map[r.worker_id].totalHours += r.hours;
      map[r.worker_id].earned += r.earned;
      if (r.status === 'present') map[r.worker_id].fullDays++;
      else if (r.status === 'half') map[r.worker_id].halfDays++;
      else if (r.status === 'overtime') map[r.worker_id].overtimeDays++;
    });
    return Object.values(map).sort((a, b) => b.earned - a.earned);
  }, [attendance, monthStart, monthEnd, workers]);

  const totalMonthlyEarned = salarySummary.reduce((s, x) => s + x.earned, 0);
  const totalMonthlyHours = salarySummary.reduce((s, x) => s + x.totalHours, 0);

  const isLoading = loadingWorkers || loadingAttendance;

  return (
    <div className="space-y-4 pb-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          <p className="text-xs text-muted-foreground">تسجيل ساعات العمل وحساب المستحقات تلقائياً</p>
        </div>
        {activeTab === 'daily' && (
          <Button onClick={() => toast({ title: 'تم الحفظ ✓', description: `تم حفظ سجل حضور ${formatDateAr(selectedDate)}` })} className="rounded-xl gap-1.5 shrink-0">
            <Save className="size-4" /> حفظ الحضور
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="rounded-xl w-full">
          <TabsTrigger value="daily" className="rounded-lg text-xs flex-1"><Calendar className="size-3 ml-1" /> الحضور اليومي</TabsTrigger>
          <TabsTrigger value="salary" className="rounded-lg text-xs flex-1"><DollarSign className="size-3 ml-1" /> كشف الرواتب</TabsTrigger>
        </TabsList>

        {/* Daily Tab */}
        <TabsContent value="daily" className="space-y-3 mt-3">
          <div className="bg-card rounded-2xl border border-border shadow-sm p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <button className="size-9 rounded-xl bg-accent flex items-center justify-center hover:bg-accent/80 transition-colors" onClick={() => setSelectedDate(formatDateISO(addDays(new Date(selectedDate), 1)))} disabled={selectedDate >= formatDateISO(new Date())}>
                <ChevronRight className="size-4" />
              </button>
              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Calendar className="size-4 text-primary" />
                  <input type="date" value={selectedDate} max={formatDateISO(new Date())} onChange={e => setSelectedDate(e.target.value)} className="text-sm font-bold bg-transparent border-0 outline-none text-center cursor-pointer" />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{formatDateAr(selectedDate)}</p>
              </div>
              <button className="size-9 rounded-xl bg-accent flex items-center justify-center hover:bg-accent/80 transition-colors" onClick={() => setSelectedDate(formatDateISO(addDays(new Date(selectedDate), -1)))}>
                <ChevronLeft className="size-4" />
              </button>
            </div>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="rounded-xl h-10 text-sm border-border bg-accent/40">
                <Building2 className="size-4 ml-2 text-primary shrink-0" />
                <SelectValue placeholder="اختر المشروع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المشاريع</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2.5">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
            ) : (
              <>
                {[
                  { label: 'حاضر', value: dailyStats.present, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', Icon: Users2 },
                  { label: 'إجمالي العمال', value: dailyStats.total, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', Icon: Users2 },
                  { label: 'أيام العمل', value: dailyStats.workDays.toFixed(1), color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', Icon: Timer },
                  { label: 'غائب', value: dailyStats.absent, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', Icon: XCircle },
                ].map(({ label, value, color, bg, Icon }) => (
                  <div key={label} className="bg-card rounded-2xl border border-border p-3 flex items-center gap-3 shadow-sm">
                    <div className={`size-10 rounded-xl ${bg} flex items-center justify-center`}><Icon className={`size-5 ${color}`} /></div>
                    <div><p className="text-[10px] text-muted-foreground">{label}</p><p className={`text-xl font-bold ${color}`}>{value}</p></div>
                  </div>
                ))}
                <div className="col-span-2 bg-card rounded-2xl border border-border p-3 flex items-center gap-3 shadow-sm">
                  <div className="size-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center"><DollarSign className="size-5 text-amber-600 dark:text-amber-400" /></div>
                  <div><p className="text-[10px] text-muted-foreground">المستحقات اليوم</p><p className="text-lg font-bold text-amber-600 dark:text-amber-400">{formatCurrency(dailyStats.earned)}</p></div>
                </div>
              </>
            )}
          </div>

          {/* Search + Actions */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو التخصص..." className="pr-9 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400" onClick={() => markAll(8)} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin ml-1" /> : <CheckCircle2 className="size-4 ml-1" />} الكل يوم كامل
              </Button>
              <Button variant="outline" className="rounded-xl border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400" onClick={resetAll} disabled={saving}>
                <RotateCcw className="size-4 ml-1" /> إعادة تعيين
              </Button>
            </div>
          </div>

          {/* Workers List */}
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)
            ) : activeWorkers.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-2xl border border-border">
                <Users2 className="size-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">لا يوجد عمال نشطون</p>
              </div>
            ) : (
              activeWorkers.map(worker => {
                const record = dateAttendanceMap[worker.id];
                const hours = record?.hours ?? 0;
                const hasRecord = !!record;
                const status = hasRecord ? getStatus(hours) : 'absent';
                const earned = record?.earned ?? 0;
                const statusCfg = STATUS_CONFIG[status];
                const StatusIcon = statusCfg.icon;
                const project = projects.find(p => p.id === worker.project_id);
                return (
                  <div key={worker.id} className={`bg-card rounded-2xl border shadow-sm transition-all ${status === 'present' ? 'border-emerald-200 dark:border-emerald-800' : status === 'overtime' ? 'border-purple-200 dark:border-purple-800' : status === 'half' ? 'border-amber-200 dark:border-amber-800' : 'border-border'}`}>
                    <div className="flex items-center gap-3 p-3 pb-2">
                      <button onClick={() => setHours(worker.id, status === 'present' ? 0 : 8)} className={`size-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${status === 'present' ? 'bg-emerald-500 text-white shadow-sm' : status === 'overtime' ? 'bg-purple-500 text-white shadow-sm' : status === 'half' ? 'bg-amber-500 text-white shadow-sm' : 'bg-muted text-muted-foreground border border-border'}`}>
                        <StatusIcon className="size-5" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-bold">{worker.name}</h3>
                          <Badge className={`text-[9px] border-0 ${statusCfg.color}`}>{statusCfg.label}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{worker.type}{project && <span className="text-primary/70"> • {project.name}</span>}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 px-3 pb-2">
                      <div className="flex-1">
                        {hasRecord && earned > 0 ? <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(earned)}</p> : <p className="text-sm font-bold text-muted-foreground/40">{formatCurrency(0)}</p>}
                        <p className="text-[10px] text-muted-foreground">يومي: <span className="font-medium">{formatCurrency(worker.dailyWage)}</span></p>
                      </div>
                      <div className="flex items-center gap-2 bg-accent rounded-xl px-2 py-1.5">
                        <button onClick={() => adjustHours(worker.id, 1)} className="size-8 rounded-lg bg-background hover:bg-muted flex items-center justify-center transition-colors shadow-sm"><Plus className="size-4" /></button>
                        <div className="w-14 text-center"><span className="text-base font-bold">{hours}</span><span className="text-[10px] text-muted-foreground"> ساعة</span></div>
                        <button onClick={() => adjustHours(worker.id, -1)} className="size-8 rounded-lg bg-background hover:bg-muted flex items-center justify-center transition-colors shadow-sm"><Minus className="size-4" /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 px-3 pb-3">
                      {QUICK_PRESETS.map(q => (
                        <button key={q.hours} onClick={() => setHours(worker.id, q.hours)} className={`py-2 rounded-xl text-xs font-semibold transition-all ${hours === q.hours && hasRecord ? q.active + ' shadow-sm scale-[0.98]' : q.inactive}`}>
                          {q.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Misc Expenses */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="size-4 text-orange-500" />
                <span className="text-sm font-bold">نثريات العمال</span>
              </div>
              <Button size="sm" variant="outline" className="rounded-xl text-xs h-8 border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400" onClick={() => setShowMiscDialog(true)}>
                <Plus className="size-3 ml-1" /> إضافة نثرية
              </Button>
            </div>
            {loadingMisc ? <Skeleton className="h-10 w-full rounded-lg" /> : todayMiscExpenses.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">لا توجد نثريات لهذا اليوم</p>
            ) : (
              <div className="space-y-1.5">
                {todayMiscExpenses.map(m => (
                  <div key={m.id} className="flex items-center gap-2 p-2 rounded-xl bg-orange-50/50 dark:bg-orange-900/10">
                    <Receipt className="size-3.5 text-orange-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{m.description}</p>
                      <p className="text-[10px] text-muted-foreground">{m.worker_name} • {m.project_name}</p>
                    </div>
                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400 shrink-0">{formatCurrency(m.amount)}</span>
                    <Button variant="ghost" size="sm" className="size-6 p-0 text-amber-500 hover:text-amber-700 shrink-0" onClick={() => openEditMisc(m.id)}><Pencil className="size-3" /></Button>
                    <Button variant="ghost" size="sm" className="size-6 p-0 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeMiscExpense(m.id)}><Trash2 className="size-3" /></Button>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <span className="text-[10px] text-muted-foreground">إجمالي النثريات</span>
                  <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{formatCurrency(todayMiscTotal)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Summary */}
          {!isLoading && activeWorkers.length > 0 && (
            <div className="bg-accent/50 rounded-2xl border border-border p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">الحاضرون / الإجمالي</p>
                  <p className="text-lg font-bold mt-0.5"><span className="text-emerald-600 dark:text-emerald-400">{dailyStats.present}</span><span className="text-muted-foreground text-sm font-normal"> / {dailyStats.total}</span></p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">نسبة الحضور</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">{dailyStats.attendanceRate}%</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">إجمالي الأجور</p>
                  <p className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">{formatCurrency(dailyStats.earned)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">نثريات اليوم</p>
                  <p className="text-base font-bold text-orange-600 dark:text-orange-400 mt-0.5">{formatCurrency(todayMiscTotal)}</p>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Salary Tab */}
        <TabsContent value="salary" className="space-y-4 mt-3">
          <div className="bg-card rounded-2xl border border-border p-3 flex items-center justify-between shadow-sm">
            <button className="size-9 rounded-xl bg-accent flex items-center justify-center hover:bg-accent/80 transition-colors" onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); }} disabled={viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth >= today.getMonth())}>
              <ChevronRight className="size-4" />
            </button>
            <div className="text-center">
              <p className="text-sm font-bold">{MONTH_NAMES[viewMonth]} {viewYear}</p>
              <p className="text-[10px] text-muted-foreground">{monthDays.length} يوم</p>
            </div>
            <button className="size-9 rounded-xl bg-accent flex items-center justify-center hover:bg-accent/80 transition-colors" onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); }}>
              <ChevronLeft className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: 'إجمالي الرواتب', value: formatCurrency(totalMonthlyEarned), color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', Icon: DollarSign },
              { label: 'إجمالي الساعات', value: `${totalMonthlyHours} ساعة`, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', Icon: Timer },
            ].map(({ label, value, color, bg, Icon }) => (
              <div key={label} className="bg-card rounded-2xl border border-border p-3 flex items-center gap-3 shadow-sm">
                <div className={`size-9 rounded-xl ${bg} flex items-center justify-center`}><Icon className={`size-4 ${color}`} /></div>
                <div><p className="text-[10px] text-muted-foreground">{label}</p><p className={`text-xs font-bold ${color}`}>{value}</p></div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1"><TrendingUp className="size-4 text-primary" /><p className="text-sm font-bold">كشف رواتب {MONTH_NAMES[viewMonth]}</p></div>
            {loadingAttendance ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)
            ) : salarySummary.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-2xl border border-border">
                <CalendarDays className="size-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">لا توجد سجلات لهذا الشهر</p>
              </div>
            ) : (
              salarySummary.map((row, i) => (
                <div key={row.worker_id} className="bg-card rounded-2xl border border-border p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</div>
                      <div><p className="text-sm font-bold">{row.name}</p><p className="text-[10px] text-muted-foreground">{row.type} • {formatCurrency(row.dailyWage)}/8س</p></div>
                    </div>
                    <p className={`text-sm font-bold ${row.earned > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`}>{formatCurrency(row.earned)}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { bg: 'bg-accent/50', color: 'text-blue-600 dark:text-blue-400', label: 'الساعات', value: `${row.totalHours}س` },
                      { bg: 'bg-emerald-50 dark:bg-emerald-900/20', color: 'text-emerald-700 dark:text-emerald-400', label: 'كامل', value: row.fullDays },
                      { bg: 'bg-amber-50 dark:bg-amber-900/20', color: 'text-amber-700 dark:text-amber-400', label: 'جزئي', value: row.halfDays },
                      { bg: 'bg-purple-50 dark:bg-purple-900/20', color: 'text-purple-700 dark:text-purple-400', label: 'أوفرتايم', value: row.overtimeDays },
                    ].map(({ bg, color, label, value }) => (
                      <div key={label} className={`${bg} rounded-lg p-1.5 text-center`}>
                        <p className={`text-[9px] ${color}`}>{label}</p>
                        <p className={`text-[10px] font-bold ${color}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Misc Dialog */}
      <Dialog open={showMiscDialog} onOpenChange={open => { if (!open) { setEditingMiscId(null); setMiscForm({ worker_id: '', amount: '', description: '', notes: '' }); } setShowMiscDialog(open); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Receipt className="size-5 text-orange-500" /> {editingMiscId ? 'تعديل النثرية' : 'إضافة نثرية عامل'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>العامل <span className="text-destructive">*</span></Label>
              <Select value={miscForm.worker_id} onValueChange={v => setMiscForm(f => ({ ...f, worker_id: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="اختر العامل" /></SelectTrigger>
                <SelectContent>{workers.filter(w => w.is_active).map(w => <SelectItem key={w.id} value={w.id}>{w.name} — {w.type}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>الوصف <span className="text-destructive">*</span></Label>
              <Input value={miscForm.description} onChange={e => setMiscForm(f => ({ ...f, description: e.target.value }))} placeholder="وجبات / مواصلات / ..." className="rounded-xl" />
            </div>
            <div>
              <Label>المبلغ (ر.ي) <span className="text-destructive">*</span></Label>
              <Input type="number" value={miscForm.amount} onChange={e => setMiscForm(f => ({ ...f, amount: e.target.value }))} placeholder="5000" className="rounded-xl" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowMiscDialog(false); setEditingMiscId(null); setMiscForm({ worker_id: '', amount: '', description: '', notes: '' }); }} className="rounded-xl">إلغاء</Button>
              <Button onClick={handleAddMisc} disabled={saving} className={`rounded-xl text-white ${editingMiscId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-orange-500 hover:bg-orange-600'}`}>
                {saving && <Loader2 className="size-4 animate-spin ml-1" />}
                {editingMiscId ? 'تحديث النثرية' : 'إضافة النثرية'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
