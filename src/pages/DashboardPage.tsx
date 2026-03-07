import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DollarSign, TrendingDown, TrendingUp, Building2, Users,
  Receipt, Clock, Package, ShoppingCart, ClipboardCheck,
  Plus, Activity, ArrowRightLeft, Loader2,
} from 'lucide-react';
import {
  useProjects, useWorkers, useExpenses, usePurchases,
  useAttendance, useWorkerMiscExpenses, useWorkerTransfers, useFundCustody,
} from '@/hooks/useCloudData';
import { formatCurrency, formatDateShort } from '@/constants/config';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Eye, Edit, Trash2, Shield, Key } from 'lucide-react';

const PIE_COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#06b6d4', '#ec4899', '#f97316'];

// ── My Project Access Card (for regular users only) ───────────────────────────
interface MyProjectAccess {
  project_id: string;
  project_name: string;
  project_status: string;
  project_location?: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
}

function MyProjectAccessCard() {
  const [items, setItems]     = useState<MyProjectAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, dbRole }      = useAuth();

  useEffect(() => {
    if (!user?.id || dbRole !== 'user') { setLoading(false); return; }

    (async () => {
      setLoading(true);
      // 1. Permissions granted by admin
      const { data: perms } = await supabase
        .from('project_permissions')
        .select('project_id, can_read, can_write, can_delete')
        .eq('user_id', user.id);

      // 2. Projects the user owns (created_by)
      const { data: ownedProjects } = await supabase
        .from('projects')
        .select('id, name, status, location')
        .eq('created_by', user.id);

      // 3. Fetch project details for delegated permissions
      const delegatedIds = (perms || []).map(p => p.project_id);
      const { data: delegatedProjects } = delegatedIds.length > 0
        ? await supabase.from('projects').select('id, name, status, location').in('id', delegatedIds)
        : { data: [] };

      const result: MyProjectAccess[] = [];

      // Own projects — full access
      for (const p of (ownedProjects || [])) {
        result.push({
          project_id: p.id, project_name: p.name,
          project_status: p.status, project_location: p.location,
          can_read: true, can_write: true, can_delete: true,
        });
      }

      // Delegated projects
      for (const perm of (perms || [])) {
        const proj = (delegatedProjects || []).find(p => p.id === perm.project_id);
        // Skip if already in owned list
        if (!proj || result.find(r => r.project_id === perm.project_id)) continue;
        result.push({
          project_id: perm.project_id, project_name: proj.name,
          project_status: proj.status, project_location: proj.location,
          can_read: perm.can_read, can_write: perm.can_write, can_delete: perm.can_delete,
        });
      }

      setItems(result);
      setLoading(false);
    })();
  }, [user?.id, dbRole]);

  // Only show for regular users
  if (dbRole !== 'user') return null;

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/5 to-indigo-500/5">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Key className="size-3.5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold">صلاحياتي في المشاريع</h3>
            <p className="text-[10px] text-muted-foreground">
              {loading ? 'جاري التحميل...' : `${items.length} مشروع متاح`}
            </p>
          </div>
        </div>
        <Link to="/projects"
          className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1">
          عرض المشاريع
        </Link>
      </div>

      {/* Content */}
      <div className="p-3">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center">
            <Shield className="size-10 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground font-medium">لا توجد مشاريع</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              أنشئ مشروعاً جديداً أو انتظر تفويض المسؤول
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.project_id}
                className="flex items-center gap-3 p-3 rounded-xl bg-accent/40 hover:bg-accent/70 transition-colors">
                {/* Project icon */}
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="size-5 text-primary" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold truncate">{item.project_name}</span>
                    <Badge className={`text-[9px] border-0 shrink-0 ${
                      item.project_status === 'active'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {item.project_status === 'active' ? 'نشط' : item.project_status === 'completed' ? 'مكتمل' : 'معلق'}
                    </Badge>
                  </div>
                  {item.project_location && (
                    <p className="text-[10px] text-muted-foreground truncate">📍 {item.project_location}</p>
                  )}
                </div>

                {/* Permission pills */}
                <div className="flex items-center gap-1 shrink-0">
                  <span title="قراءة" className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${
                    item.can_read
                      ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                      : 'bg-muted/40 text-muted-foreground/40 border-border/40 line-through'
                  }`}>
                    <Eye className="size-2.5" /> ق
                  </span>
                  <span title="كتابة" className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${
                    item.can_write
                      ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
                      : 'bg-muted/40 text-muted-foreground/40 border-border/40 line-through'
                  }`}>
                    <Edit className="size-2.5" /> ك
                  </span>
                  <span title="حذف" className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${
                    item.can_delete
                      ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                      : 'bg-muted/40 text-muted-foreground/40 border-border/40 line-through'
                  }`}>
                    <Trash2 className="size-2.5" /> ح
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      {!loading && items.length > 0 && (
        <div className="px-4 pb-3 flex items-center gap-3 flex-wrap">
          <span className="text-[10px] text-muted-foreground">المفتاح:</span>
          <span className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400">
            <Eye className="size-3" /> ق = قراءة
          </span>
          <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
            <Edit className="size-3" /> ك = كتابة
          </span>
          <span className="flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400">
            <Trash2 className="size-3" /> ح = حذف
          </span>
        </div>
      )}
    </div>
  );
}

function StatSkeleton() {
  return <Skeleton className="h-[72px] w-full rounded-2xl" />;
}

export default function DashboardPage() {
  const { projects, loading: loadingProjects } = useProjects();
  const { workers, loading: loadingWorkers } = useWorkers();
  const { expenses, loading: loadingExpenses } = useExpenses();
  const { purchases, loading: loadingPurchases } = usePurchases();
  const { attendance, loading: loadingAttendance } = useAttendance();
  const { miscExpenses, loading: loadingMisc } = useWorkerMiscExpenses();
  const { transfers, loading: loadingTransfers } = useWorkerTransfers();
  const { custodies, loading: loadingCustody } = useFundCustody();

  const isLoading = loadingProjects || loadingWorkers || loadingExpenses ||
    loadingPurchases || loadingAttendance || loadingMisc || loadingTransfers || loadingCustody;

  // ── Real aggregated totals ──────────────────────────────────────────
  const totals = useMemo(() => {
    const manualExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const purchasesTotal = purchases.reduce((s, p) => s + p.total_price, 0);
    const wagesTotal = attendance.filter(r => r.earned > 0).reduce((s, r) => s + r.earned, 0);
    const miscTotal = miscExpenses.reduce((s, m) => s + m.amount, 0);
    const transfersTotal = transfers.reduce((s, t) => s + t.amount, 0);
    const custodyTotal = custodies.reduce((s, c) => s + c.amount, 0);
    const totalExpenses = manualExpenses + purchasesTotal + wagesTotal + miscTotal;

    const today = new Date().toISOString().split('T')[0];
    const todayExpenses = expenses.filter(e => e.date === today).reduce((s, e) => s + e.amount, 0);
    const todayPurchases = purchases.filter(p => p.date === today).reduce((s, p) => s + p.total_price, 0);
    const todayWages = attendance.filter(r => r.date === today && r.earned > 0).reduce((s, r) => s + r.earned, 0);
    const todayMisc = miscExpenses.filter(m => m.date === today).reduce((s, m) => s + m.amount, 0);
    const todayTransfers = transfers.filter(t => t.transferDate === today).reduce((s, t) => s + t.amount, 0);
    const todayTotal = todayExpenses + todayPurchases + todayWages + todayMisc + todayTransfers;

    return { manualExpenses, purchasesTotal, wagesTotal, miscTotal, transfersTotal, custodyTotal, totalExpenses, todayTotal };
  }, [expenses, purchases, attendance, miscExpenses, transfers, custodies]);

  const projectStats = useMemo(() => {
    const active = projects.filter(p => p.status === 'active').length;
    const activeWorkers = workers.filter(w => w.is_active).length;
    return { active, total: projects.length, activeWorkers };
  }, [projects, workers]);

  // ── Bar chart: expenses per source per project ──────────────────────
  const barChartData = useMemo(() => {
    const map: Record<string, { name: string; يدوية: number; مواد: number; أجور: number }> = {};
    projects.filter(p => p.status === 'active').slice(0, 5).forEach(p => {
      map[p.id] = {
        name: p.name.length > 10 ? p.name.substring(0, 10) + '..' : p.name,
        يدوية: 0, مواد: 0, أجور: 0,
      };
    });
    expenses.forEach(e => {
      if (map[e.project_id]) map[e.project_id].يدوية += e.amount / 1_000_000;
    });
    purchases.forEach(p => {
      if (p.project_id && map[p.project_id]) map[p.project_id].مواد += p.total_price / 1_000_000;
    });
    attendance.filter(r => r.earned > 0 && r.project_id).forEach(r => {
      if (r.project_id && map[r.project_id]) map[r.project_id].أجور += r.earned / 1_000_000;
    });
    return Object.values(map);
  }, [projects, expenses, purchases, attendance]);

  // ── Pie chart: breakdown by source ─────────────────────────────────
  const pieData = useMemo(() => {
    return [
      { name: 'مصروفات يدوية', value: totals.manualExpenses },
      { name: 'شراء مواد', value: totals.purchasesTotal },
      { name: 'أجور عمال', value: totals.wagesTotal },
    ].filter(d => d.value > 0);
  }, [totals]);

  // ── Recent activity ─────────────────────────────────────────────────
  const recentActivity = useMemo(() => {
    const items: { id: string; type: string; label: string; project: string; amount: number; date: string }[] = [];
    expenses.slice(0, 4).forEach(e => items.push({ id: e.id, type: 'expense', label: e.description, project: e.project_name, amount: e.amount, date: e.date }));
    purchases.slice(0, 4).forEach(p => {
      const proj = projects.find(x => x.id === p.project_id);
      items.push({ id: p.id, type: 'material', label: p.material_name + ' (' + p.supplier_name + ')', project: proj?.name || '–', amount: p.total_price, date: p.date });
    });
    return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  }, [expenses, purchases, projects]);

  const ICON_MAP: Record<string, React.ElementType> = { expense: Receipt, material: Package, worker: Users, project: Building2, transfer: ArrowRightLeft };
  const COLOR_MAP: Record<string, string> = {
    expense: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    material: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    worker: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    project: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  };

  // Attendance summary today
  const todayDate = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.filter(r => r.date === todayDate);
  const presentToday = todayAttendance.filter(r => r.status !== 'absent').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          {isLoading && <Loader2 className="size-3 animate-spin" />}
          {isLoading ? 'جاري تحميل البيانات...' : 'إجماليات حقيقية من OnSpace Cloud'}
        </p>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline" className="rounded-xl">
            <Link to="/projects"><Eye className="size-4 ml-1" /> المشاريع</Link>
          </Button>
          <Button asChild size="sm" className="rounded-xl">
            <Link to="/expenses"><Plus className="size-4 ml-1" /> مصروف</Link>
          </Button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <Card className="border-0 shadow-sm col-span-2 lg:col-span-1">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="size-11 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                  <TrendingDown className="size-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground">إجمالي المصروفات</p>
                  <p className="text-sm font-bold text-red-600 dark:text-red-400 truncate">{formatCurrency(totals.totalExpenses)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="size-11 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                  <ShoppingCart className="size-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground">شراء مواد</p>
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400 truncate">{formatCurrency(totals.purchasesTotal)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="size-11 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                  <ClipboardCheck className="size-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground">أجور مسجّلة</p>
                  <p className="text-sm font-bold text-amber-600 dark:text-amber-400 truncate">{formatCurrency(totals.wagesTotal)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="size-11 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center shrink-0">
                  <TrendingUp className="size-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground">إجمالي العهد</p>
                  <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 truncate">{formatCurrency(totals.custodyTotal)}</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                  <Building2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">المشاريع النشطة</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{projectStats.active}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                  <Users className="size-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">العمال النشطون</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{projectStats.activeWorkers}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                  <ClipboardCheck className="size-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">حاضرون اليوم</p>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{presentToday}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                  <DollarSign className="size-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">مصروفات اليوم</p>
                  <p className="text-sm font-bold text-red-600 dark:text-red-400 truncate">{formatCurrency(totals.todayTotal)}</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Bar Chart */}
        <Card className="lg:col-span-7 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">المصروفات بالمشاريع (مليون ر.ي)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-60 w-full rounded-xl" />
            ) : barChartData.length === 0 ? (
              <div className="h-60 flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات بعد</div>
            ) : (
              <>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ direction: 'rtl', borderRadius: 12, fontSize: 11, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        formatter={(value: number) => [`${value.toFixed(2)} مليون`, '']}
                      />
                      <Bar dataKey="يدوية" fill="#8b5cf6" radius={[4, 4, 0, 0]} stackId="a" />
                      <Bar dataKey="مواد" fill="#3b82f6" radius={[0, 0, 0, 0]} stackId="a" />
                      <Bar dataKey="أجور" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-4 mt-2 justify-center">
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="size-2 rounded-full bg-purple-500 inline-block" />يدوية</span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="size-2 rounded-full bg-blue-500 inline-block" />مواد</span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="size-2 rounded-full bg-amber-500 inline-block" />أجور</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="lg:col-span-5 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">توزيع المصروفات حسب المصدر</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-60 w-full rounded-xl" />
            ) : pieData.length === 0 ? (
              <div className="h-60 flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات بعد</div>
            ) : (
              <>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={3} dataKey="value">
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ direction: 'rtl', borderRadius: 12, fontSize: 11, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        formatter={(value: number) => [formatCurrency(value), '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 mt-1">
                  {pieData.map((d, i) => {
                    const pct = totals.totalExpenses > 0 ? Math.round((d.value / totals.totalExpenses) * 100) : 0;
                    return (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-[11px] text-muted-foreground flex-1">{d.name}</span>
                        <span className="text-[11px] font-bold" style={{ color: PIE_COLORS[i % PIE_COLORS.length] }}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* My Project Access — regular users only */}
      <MyProjectAccessCard />

      {/* Projects + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Active Projects */}
        <Card className="lg:col-span-7 border-0 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">المشاريع النشطة</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs rounded-lg">
              <Link to="/projects">عرض الكل</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
            ) : projects.filter(p => p.status === 'active').slice(0, 4).map(project => {
              const projExpenses = expenses.filter(e => e.project_id === project.id).reduce((s, e) => s + e.amount, 0);
              const projPurchases = purchases.filter(p => p.project_id === project.id).reduce((s, p) => s + p.total_price, 0);
              const projWages = attendance.filter(r => r.project_id === project.id && r.earned > 0).reduce((s, r) => s + r.earned, 0);
              const projMisc = miscExpenses.filter(m => m.project_id === project.id).reduce((s, m) => s + m.amount, 0);
              const projTotal = projExpenses + projPurchases + projWages + projMisc;
              return (
                <div key={project.id} className="flex items-center gap-3 p-3 rounded-xl bg-accent/50 hover:bg-accent transition-colors">
                  <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="size-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{project.name}</p>
                    <p className="text-[11px] text-muted-foreground">{project.location || project.project_type_name || '–'}</p>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="text-xs font-bold text-red-600 dark:text-red-400">{formatCurrency(projTotal)}</p>
                    <p className="text-[10px] text-muted-foreground">إجمالي المصروفات</p>
                  </div>
                </div>
              );
            })}
            {!isLoading && projects.filter(p => p.status === 'active').length === 0 && (
              <div className="text-center py-6 text-sm text-muted-foreground">لا توجد مشاريع نشطة</div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-5 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="size-4" /> آخر الإجراءات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)
            ) : recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">لا توجد إجراءات بعد</p>
            ) : (
              recentActivity.map(item => {
                const Icon = ICON_MAP[item.type] || Activity;
                const colorClass = COLOR_MAP[item.type] || COLOR_MAP.project;
                return (
                  <div key={item.id} className="flex items-center gap-3 py-1.5">
                    <div className={`size-8 rounded-lg ${colorClass} flex items-center justify-center shrink-0`}>
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{item.project} • {formatDateShort(item.date)}</p>
                    </div>
                    <Badge variant="secondary" className="text-[9px] font-mono shrink-0">
                      {formatCurrency(item.amount)}
                    </Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
