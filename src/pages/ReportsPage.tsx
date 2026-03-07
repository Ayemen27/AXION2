/**
 * صفحة التقارير الشاملة - مطابقة للمشروع الأصلي
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  useProjects, useWorkers, useAttendance, usePurchases,
  useExpenses, useWorkerTransfers, useWorkerMiscExpenses, useFundCustody,
} from '@/hooks/useCloudData';
import { useSelectedProject } from '@/hooks/useSelectedProject';
import { formatCurrency, formatDate } from '@/constants/config';
import {
  BarChart3, TrendingUp, TrendingDown, Users, Package,
  DollarSign, FileText, Download, Search, Building2,
  Calendar, ArrowLeftRight, Receipt, Wallet, Truck,
  ChevronLeft, ChevronRight, PieChart, Activity,
  Clock, CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart as RechartsPie, Pie, Cell, Legend,
  AreaChart, Area,
} from 'recharts';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];
const MONTH_NAMES = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export default function ReportsPage() {
  const { toast } = useToast();
  const { projects } = useProjects();
  const { workers } = useWorkers();
  const { attendance } = useAttendance();
  const { purchases } = usePurchases();
  const { expenses } = useExpenses();
  const { transfers } = useWorkerTransfers();
  const { miscExpenses } = useWorkerMiscExpenses();
  const { custodies } = useFundCustody();
  const { selectedProjectId } = useSelectedProject();

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [workerSearch, setWorkerSearch] = useState('');
  const [reportProjectId, setReportProjectId] = useState(selectedProjectId || 'all');
  const [reportMonth, setReportMonth] = useState(new Date().getMonth());
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  // فلترة البيانات بحسب المشروع المحدد للتقرير
  const filterByProject = <T extends { project_id?: string }>(items: T[]) =>
    reportProjectId === 'all' ? items : items.filter(i => i.project_id === reportProjectId);

  const filteredAttendance = useMemo(() => filterByProject(attendance), [attendance, reportProjectId]);
  const filteredPurchases = useMemo(() => filterByProject(purchases), [purchases, reportProjectId]);
  const filteredExpenses = useMemo(() => filterByProject(expenses), [expenses, reportProjectId]);
  const filteredTransfers = useMemo(() => filterByProject(transfers.map(t => ({ ...t, project_id: t.project_id }))), [transfers, reportProjectId]);
  const filteredMisc = useMemo(() => filterByProject(miscExpenses), [miscExpenses, reportProjectId]);
  const filteredCustodies = useMemo(() => filterByProject(custodies), [custodies, reportProjectId]);

  // ملخص الإجماليات
  const totals = useMemo(() => {
    const wages = filteredAttendance.reduce((s, a) => s + a.earned, 0);
    const materials = filteredPurchases.reduce((s, p) => s + p.total_price, 0);
    const transport = filteredExpenses.filter(e => e.category === 'نقل').reduce((s, e) => s + e.amount, 0);
    const misc = filteredMisc.reduce((s, m) => s + m.amount, 0);
    const workerTransfers = filteredTransfers.reduce((s, t) => s + t.amount, 0);
    const otherExpenses = filteredExpenses.filter(e => e.category !== 'نقل').reduce((s, e) => s + e.amount, 0);
    const totalExpenses = wages + materials + transport + misc + workerTransfers + otherExpenses;
    const totalIncome = filteredCustodies.reduce((s, c) => s + c.amount, 0);
    return { wages, materials, transport, misc, workerTransfers, otherExpenses, totalExpenses, totalIncome, balance: totalIncome - totalExpenses };
  }, [filteredAttendance, filteredPurchases, filteredExpenses, filteredMisc, filteredTransfers, filteredCustodies]);

  // رسم بياني: المصروفات الشهرية
  const monthlyData = useMemo(() => {
    const map: Record<string, { month: string; wages: number; materials: number; transport: number; misc: number }> = {};
    const addToMap = (date: string, category: string, amount: number) => {
      const d = new Date(date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map[key]) map[key] = { month: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`, wages: 0, materials: 0, transport: 0, misc: 0 };
      if (category === 'wages') map[key].wages += amount;
      else if (category === 'materials') map[key].materials += amount;
      else if (category === 'transport') map[key].transport += amount;
      else map[key].misc += amount;
    };
    filteredAttendance.forEach(a => addToMap(a.date, 'wages', a.earned));
    filteredPurchases.forEach(p => addToMap(p.date, 'materials', p.total_price));
    filteredExpenses.forEach(e => addToMap(e.date, e.category === 'نقل' ? 'transport' : 'misc', e.amount));
    filteredMisc.forEach(m => addToMap(m.date, 'misc', m.amount));
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([, v]) => v);
  }, [filteredAttendance, filteredPurchases, filteredExpenses, filteredMisc]);

  // رسم دائري: توزيع المصروفات
  const pieData = useMemo(() => [
    { name: 'أجور العمال', value: totals.wages },
    { name: 'مشتريات المواد', value: totals.materials },
    { name: 'المواصلات', value: totals.transport },
    { name: 'النثريات', value: totals.misc },
    { name: 'حوالات العمال', value: totals.workerTransfers },
    { name: 'مصروفات أخرى', value: totals.otherExpenses },
  ].filter(d => d.value > 0), [totals]);

  // تقارير العمال
  const workerReports = useMemo(() => {
    const monthStart = `${reportYear}-${String(reportMonth + 1).padStart(2, '0')}-01`;
    const monthEnd = `${reportYear}-${String(reportMonth + 1).padStart(2, '0')}-31`;
    return workers.filter(w => w.name.includes(workerSearch)).map(w => {
      const monthAttendance = attendance.filter(a => a.worker_id === w.id && a.date >= monthStart && a.date <= monthEnd);
      const allAttendance = attendance.filter(a => a.worker_id === w.id);
      const totalTransferred = transfers.filter(t => t.worker_id === w.id).reduce((s, t) => s + t.amount, 0);
      const monthEarned = monthAttendance.reduce((s, a) => s + a.earned, 0);
      const totalEarned = allAttendance.reduce((s, a) => s + a.earned, 0);
      const fullDays = monthAttendance.filter(a => a.status === 'present').length;
      const halfDays = monthAttendance.filter(a => a.status === 'half').length;
      const overtimeDays = monthAttendance.filter(a => a.status === 'overtime').length;
      const absentDays = monthAttendance.filter(a => a.status === 'absent').length;
      return {
        ...w, monthEarned, totalEarned, totalTransferred,
        remainingBalance: totalEarned - totalTransferred,
        fullDays, halfDays, overtimeDays, absentDays,
        totalHours: monthAttendance.reduce((s, a) => s + a.hours, 0),
      };
    }).sort((a, b) => b.monthEarned - a.monthEarned);
  }, [workers, attendance, transfers, reportMonth, reportYear, workerSearch]);

  // تقارير المشاريع
  const projectReports = useMemo(() => projects.map(p => {
    const pWages = attendance.filter(a => a.project_id === p.id).reduce((s, a) => s + a.earned, 0);
    const pMaterials = purchases.filter(x => x.project_id === p.id).reduce((s, x) => s + x.total_price, 0);
    const pExpenses = expenses.filter(e => e.project_id === p.id).reduce((s, e) => s + e.amount, 0);
    const pMisc = miscExpenses.filter(m => m.project_id === p.id).reduce((s, m) => s + m.amount, 0);
    const pCustodies = custodies.filter(c => c.project_id === p.id).reduce((s, c) => s + c.amount, 0);
    const pTotal = pWages + pMaterials + pExpenses + pMisc;
    return { ...p, pWages, pMaterials, pExpenses: pExpenses + pMisc, pCustodies, pTotal, pBalance: pCustodies - pTotal };
  }), [projects, attendance, purchases, expenses, miscExpenses, custodies]);

  const selectedWorkerData = selectedWorkerId ? workerReports.find(w => w.id === selectedWorkerId) : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">ملخص شامل لجميع العمليات المالية</p>
        <div className="flex gap-2">
          <Select value={reportProjectId} onValueChange={setReportProjectId}>
            <SelectTrigger className="w-44 rounded-xl">
              <Building2 className="size-3.5 ml-1.5" />
              <SelectValue placeholder="المشروع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المشاريع</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي الدخل (العهد)', value: formatCurrency(totals.totalIncome), icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'إجمالي المصروفات', value: formatCurrency(totals.totalExpenses), icon: TrendingDown, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'الرصيد الصافي', value: formatCurrency(totals.balance), icon: Wallet, color: totals.balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400', bg: totals.balance >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-red-50 dark:bg-red-900/20' },
          { label: 'الأجور الإجمالية', value: formatCurrency(totals.wages), icon: Users, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
        ].map(c => (
          <Card key={c.label} className="border-0 shadow-sm">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`size-10 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
                <c.icon className={`size-5 ${c.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground truncate">{c.label}</p>
                <p className={`text-xs font-bold ${c.color} truncate`}>{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="rounded-xl flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="rounded-lg text-xs">
            <Activity className="size-3 ml-1" /> نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="expenses" className="rounded-lg text-xs">
            <Receipt className="size-3 ml-1" /> المصروفات
          </TabsTrigger>
          <TabsTrigger value="workers" className="rounded-lg text-xs">
            <Users className="size-3 ml-1" /> العمال
          </TabsTrigger>
          <TabsTrigger value="projects" className="rounded-lg text-xs">
            <Building2 className="size-3 ml-1" /> المشاريع
          </TabsTrigger>
        </TabsList>

        {/* ===== نظرة عامة ===== */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bar Chart */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="size-4 text-primary" /> المصروفات الشهرية (مليون ر.ي)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyData.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">لا توجد بيانات</div>
                ) : (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }} />
                        <Tooltip
                          contentStyle={{ direction: 'rtl', borderRadius: 8, fontSize: 10, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          formatter={(v: number) => [`${(v / 1_000_000).toFixed(2)} م`, '']}
                        />
                        <Bar dataKey="wages" name="أجور" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
                        <Bar dataKey="materials" name="مواد" fill="#10b981" radius={[0, 0, 0, 0]} stackId="a" />
                        <Bar dataKey="transport" name="نقل" fill="#f59e0b" radius={[0, 0, 0, 0]} stackId="a" />
                        <Bar dataKey="misc" name="نثريات" fill="#8b5cf6" radius={[4, 4, 0, 0]} stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="flex flex-wrap gap-3 mt-2 justify-center">
                  {[['#3b82f6', 'أجور'], ['#10b981', 'مواد'], ['#f59e0b', 'نقل'], ['#8b5cf6', 'نثريات']].map(([c, l]) => (
                    <span key={l} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className="size-2 rounded-full inline-block" style={{ background: c }} />{l}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Pie Chart */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PieChart className="size-4 text-primary" /> توزيع المصروفات
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">لا توجد بيانات</div>
                ) : (
                  <>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={2} dataKey="value">
                            {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip
                            contentStyle={{ direction: 'rtl', borderRadius: 8, fontSize: 10, border: 'none' }}
                            formatter={(v: number) => [formatCurrency(v), '']}
                          />
                        </RechartsPie>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-1 mt-2">
                      {pieData.map((d, i) => {
                        const pct = totals.totalExpenses > 0 ? Math.round((d.value / totals.totalExpenses) * 100) : 0;
                        return (
                          <div key={d.name} className="flex items-center gap-2">
                            <div className="size-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span className="text-[10px] text-muted-foreground flex-1">{d.name}</span>
                            <span className="text-[10px] font-bold text-muted-foreground">{pct}%</span>
                            <span className="text-[10px] font-bold" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>{formatCurrency(d.value)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Expense Breakdown Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'أجور العمال', value: totals.wages, icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', pct: totals.totalExpenses > 0 ? Math.round(totals.wages / totals.totalExpenses * 100) : 0 },
              { label: 'مشتريات المواد', value: totals.materials, icon: Package, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', pct: totals.totalExpenses > 0 ? Math.round(totals.materials / totals.totalExpenses * 100) : 0 },
              { label: 'المواصلات', value: totals.transport, icon: Truck, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', pct: totals.totalExpenses > 0 ? Math.round(totals.transport / totals.totalExpenses * 100) : 0 },
              { label: 'النثريات', value: totals.misc, icon: Receipt, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', pct: totals.totalExpenses > 0 ? Math.round(totals.misc / totals.totalExpenses * 100) : 0 },
              { label: 'حوالات العمال', value: totals.workerTransfers, icon: ArrowLeftRight, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', pct: totals.totalExpenses > 0 ? Math.round(totals.workerTransfers / totals.totalExpenses * 100) : 0 },
              { label: 'مصروفات أخرى', value: totals.otherExpenses, icon: DollarSign, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-900/20', pct: totals.totalExpenses > 0 ? Math.round(totals.otherExpenses / totals.totalExpenses * 100) : 0 },
            ].map(c => (
              <Card key={c.label} className="border-0 shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`size-7 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
                      <c.icon className={`size-3.5 ${c.color}`} />
                    </div>
                    <p className="text-[11px] text-muted-foreground">{c.label}</p>
                  </div>
                  <p className={`text-sm font-bold ${c.color}`}>{formatCurrency(c.value)}</p>
                  <div className="mt-1.5 h-1 bg-accent rounded-full overflow-hidden">
                    <div className="h-full bg-current rounded-full transition-all opacity-60" style={{ width: `${c.pct}%` }} />
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{c.pct}% من الإجمالي</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ===== تفاصيل المصروفات ===== */}
        <TabsContent value="expenses" className="space-y-4 mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">آخر المصروفات المسجلة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredExpenses.length === 0 && filteredPurchases.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">لا توجد مصروفات</p>
              ) : (
                <>
                  {filteredPurchases.slice(0, 10).map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-accent/40">
                      <div className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                        <Package className="size-4 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{p.material_name}</p>
                        <p className="text-[10px] text-muted-foreground">{p.supplier_name} • {formatDate(p.date)}</p>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">{formatCurrency(p.total_price)}</span>
                    </div>
                  ))}
                  {filteredExpenses.slice(0, 10).map(e => (
                    <div key={e.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-accent/40">
                      <div className="size-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                        <Truck className="size-4 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{e.description}</p>
                        <p className="text-[10px] text-muted-foreground">{e.project_name} • {formatDate(e.date)}</p>
                      </div>
                      <span className="text-xs font-bold text-orange-600 dark:text-orange-400 shrink-0">{formatCurrency(e.amount)}</span>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== تقارير العمال ===== */}
        <TabsContent value="workers" className="space-y-4 mt-4">
          {/* Month Selector */}
          <div className="flex items-center justify-between bg-card rounded-xl border p-3 shadow-sm">
            <button
              className="size-8 rounded-lg bg-accent flex items-center justify-center hover:bg-accent/80 transition-colors"
              onClick={() => {
                if (reportMonth === 11) { setReportMonth(0); setReportYear(y => y + 1); }
                else setReportMonth(m => m + 1);
              }}
              disabled={reportYear > new Date().getFullYear() || (reportYear === new Date().getFullYear() && reportMonth >= new Date().getMonth())}
            >
              <ChevronRight className="size-4" />
            </button>
            <p className="text-sm font-bold">{MONTH_NAMES[reportMonth]} {reportYear}</p>
            <button
              className="size-8 rounded-lg bg-accent flex items-center justify-center hover:bg-accent/80 transition-colors"
              onClick={() => {
                if (reportMonth === 0) { setReportMonth(11); setReportYear(y => y - 1); }
                else setReportMonth(m => m - 1);
              }}
            >
              <ChevronLeft className="size-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={workerSearch} onChange={e => setWorkerSearch(e.target.value)} placeholder="بحث بالاسم..." className="pr-9 rounded-xl" />
          </div>

          {/* Worker Statement */}
          {selectedWorkerData && (
            <Card className="border-2 border-primary/20 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">كشف حساب: {selectedWorkerData.name}</CardTitle>
                  <Badge className="text-[9px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">{selectedWorkerData.type}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center">
                    <p className="text-[9px] text-blue-600">المكتسب هذا الشهر</p>
                    <p className="text-xs font-bold text-blue-600">{formatCurrency(selectedWorkerData.monthEarned)}</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 text-center">
                    <p className="text-[9px] text-red-600">المحوّل</p>
                    <p className="text-xs font-bold text-red-600">{formatCurrency(selectedWorkerData.totalTransferred)}</p>
                  </div>
                  <div className={`${selectedWorkerData.remainingBalance >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'} rounded-lg p-2 text-center`}>
                    <p className={`text-[9px] ${selectedWorkerData.remainingBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>الرصيد</p>
                    <p className={`text-xs font-bold ${selectedWorkerData.remainingBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(selectedWorkerData.remainingBalance)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: 'أيام كاملة', value: selectedWorkerData.fullDays, color: 'text-emerald-600' },
                    { label: 'أيام جزئية', value: selectedWorkerData.halfDays, color: 'text-amber-600' },
                    { label: 'أوفرتايم', value: selectedWorkerData.overtimeDays, color: 'text-purple-600' },
                    { label: 'غياب', value: selectedWorkerData.absentDays, color: 'text-red-600' },
                  ].map(s => (
                    <div key={s.label} className="bg-accent/50 rounded-lg p-2 text-center">
                      <p className="text-[9px] text-muted-foreground">{s.label}</p>
                      <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Workers List */}
          <div className="space-y-2">
            {workerReports.map(w => (
              <Card
                key={w.id}
                className={`border-0 shadow-sm cursor-pointer transition-all hover:shadow-md ${selectedWorkerId === w.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedWorkerId(w.id === selectedWorkerId ? null : w.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="size-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold truncate">{w.name}</p>
                        <Badge className="text-[9px] bg-accent text-muted-foreground border-0">{w.type}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{formatCurrency(w.dailyWage)}/يوم</p>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{formatCurrency(w.monthEarned)}</p>
                      <p className="text-[9px] text-muted-foreground">هذا الشهر</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {workerReports.length === 0 && (
              <div className="text-center py-8">
                <Users className="size-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">لا يوجد عمال</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ===== تقارير المشاريع ===== */}
        <TabsContent value="projects" className="space-y-4 mt-4">
          <div className="space-y-3">
            {projectReports.map((p, i) => (
              <Card key={p.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">{p.location || p.project_type_name}</p>
                      </div>
                    </div>
                    <Badge className={`text-[10px] border-0 ${p.pBalance >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {p.pBalance >= 0 ? 'فائض' : 'عجز'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2 text-center">
                      <p className="text-[9px] text-emerald-600">العهد الواردة</p>
                      <p className="text-[10px] font-bold text-emerald-600">{formatCurrency(p.pCustodies)}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center">
                      <p className="text-[9px] text-blue-600">الأجور</p>
                      <p className="text-[10px] font-bold text-blue-600">{formatCurrency(p.pWages)}</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2 text-center">
                      <p className="text-[9px] text-amber-600">المواد</p>
                      <p className="text-[10px] font-bold text-amber-600">{formatCurrency(p.pMaterials)}</p>
                    </div>
                    <div className={`${p.pBalance >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-red-50 dark:bg-red-900/20'} rounded-lg p-2 text-center`}>
                      <p className={`text-[9px] ${p.pBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>الرصيد</p>
                      <p className={`text-[10px] font-bold ${p.pBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(p.pBalance)}</p>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  {p.pCustodies > 0 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
                        <span>نسبة الإنفاق</span>
                        <span>{Math.min(Math.round((p.pTotal / p.pCustodies) * 100), 100)}%</span>
                      </div>
                      <div className="h-1 bg-accent rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${p.pTotal > p.pCustodies ? 'bg-red-500' : 'bg-primary'}`}
                          style={{ width: `${Math.min((p.pTotal / p.pCustodies) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {projectReports.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="size-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">لا توجد مشاريع</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
