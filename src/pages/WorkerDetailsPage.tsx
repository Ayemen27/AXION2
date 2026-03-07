import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowRight,
  User,
  Briefcase,
  Phone,
  Building,
  DollarSign,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Banknote,
  TrendingUp,
  UserCheck,
  UserX,
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useWorkers, useProjects } from '@/hooks/useDataStore';
import { formatCurrency, formatDate } from '@/constants/config';

// ---- helpers ----

interface AttendanceRecord {
  workerId: string;
  date: string;
  present: boolean;
  overtime: number;
  hours: number;
}

function loadAttendance(date: string): AttendanceRecord[] {
  const saved = localStorage.getItem(`axion_attendance_${date}`);
  if (saved) {
    const records: any[] = JSON.parse(saved);
    return records.map(r => ({
      ...r,
      hours: r.hours !== undefined ? r.hours : (r.present ? 8 + (r.overtime || 0) : 0),
    }));
  }
  return [];
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getMonthDates(year: number, month: number): string[] {
  const days = getDaysInMonth(year, month);
  const dates: string[] = [];
  for (let d = 1; d <= days; d++) {
    dates.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return dates;
}

const ARABIC_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const ARABIC_DAYS_SHORT = ['أحد','إثن','ثلا','أرب','خمي','جمع','سبت'];

// ---- types ----
interface Transaction {
  id: string;
  type: 'earning' | 'withdrawal';
  description: string;
  amount: number;
  date: string;
  project?: string;
}

// Generate transactions for worker based on attendance hours
function generateTransactions(workerId: string, dailyWage: number, projectName: string, filterYear: number, filterMonth: number): Transaction[] {
  const txs: Transaction[] = [];
  // Scan all attendance
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('axion_attendance_')) {
      const date = key.replace('axion_attendance_', '');
      const rawRecords: any[] = JSON.parse(localStorage.getItem(key) || '[]');
      const rec = rawRecords.find((r: any) => r.workerId === workerId);
      if (rec) {
        const hours = rec.hours !== undefined ? rec.hours : (rec.present ? 8 + (rec.overtime || 0) : 0);
        if (hours > 0) {
          const workDays = hours / 8;
          const amount = workDays * dailyWage;
          const hoursLabel = hours === 8 ? 'يوم كامل' : hours === 4 ? 'نصف يوم' : `${hours} ساعة`;
          txs.push({
            id: `earn_${date}`,
            type: 'earning',
            description: `أجر ${date} (${hoursLabel})`,
            amount,
            date,
            project: projectName,
          });
        }
      }
    }
  }

  // Add some mock withdrawals for visual data
  const mockWithdrawals: Transaction[] = [
    { id: 'wd1', type: 'withdrawal', description: 'سلفة نقدية', amount: dailyWage * 3, date: '2026-02-20', project: projectName },
    { id: 'wd2', type: 'withdrawal', description: 'صرف مستحقات أسبوعية', amount: dailyWage * 5, date: '2026-02-27', project: projectName },
    { id: 'wd3', type: 'withdrawal', description: 'سلفة طارئة', amount: dailyWage * 2, date: '2026-03-01', project: projectName },
  ];

  return [...txs, ...mockWithdrawals].sort((a, b) => b.date.localeCompare(a.date));
}

// ---- component ----

export default function WorkerDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { workers } = useWorkers();
  const { projects } = useProjects();

  const worker = workers.find(w => w.id === id);
  const project = projects.find(p => p.id === worker?.project_id);

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [activeTab, setActiveTab] = useState('calendar');

  if (!worker) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/workers')} className="gap-2">
          <ArrowRight className="size-4" /> العودة للعمال
        </Button>
        <div className="text-center py-20">
          <User className="size-16 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-lg font-semibold text-muted-foreground">العامل غير موجود</p>
        </div>
      </div>
    );
  }

  const projectName = project?.name || 'بدون مشروع';

  // ===== CALENDAR DATA =====
  const calendarData = useMemo(() => {
    const daysInMonth = getDaysInMonth(calYear, calMonth);
    const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
    const dates = getMonthDates(calYear, calMonth);

    const attendanceMap: Record<string, { present: boolean; overtime: number }> = {};
    dates.forEach(date => {
      const records = loadAttendance(date);
      const rec = records.find(r => r.workerId === worker.id);
      if (rec) attendanceMap[date] = { present: rec.present, overtime: rec.overtime };
    });

    let presentCount = 0;
    let absentCount = 0;
    let totalOvertime = 0;
    const today = new Date();
    let workingDays = daysInMonth;
    if (calYear === today.getFullYear() && calMonth === today.getMonth()) {
      workingDays = today.getDate();
    }

    let totalHours = 0;
    dates.forEach((date, idx) => {
      if (idx < workingDays) {
        const rec = attendanceMap[date];
        if (rec && rec.hours > 0) {
          presentCount++;
          totalHours += rec.hours;
          totalOvertime += Math.max(0, rec.hours - 8);
        } else if (rec) {
          absentCount++;
        }
      }
    });

    const totalWorkDays = totalHours / 8;
    const baseDue = totalWorkDays * worker.dailyWage;
    const overtimeRate = (worker.dailyWage / 8) * 1.5;
    const overtimeDue = 0; // overtime is already included in hours-based calculation

    return { daysInMonth, firstDayOfWeek, attendanceMap, presentCount, absentCount, totalOvertime, totalHours, totalWorkDays, baseDue, overtimeDue, totalDue: baseDue, workingDays };
  }, [calYear, calMonth, worker]);

  // ===== WEEKLY CHART DATA =====
  const weeklyChartData = useMemo(() => {
    const weeks: { name: string; present: number; absent: number }[] = [];
    const dates = getMonthDates(calYear, calMonth);
    const chunkSize = 7;
    for (let i = 0; i < dates.length; i += chunkSize) {
      const chunk = dates.slice(i, i + chunkSize);
      let present = 0;
      let absent = 0;
      chunk.forEach(date => {
        const records = loadAttendance(date);
        const rec = records.find(r => r.workerId === worker.id);
        if (rec?.present) present++;
        else if (rec && !rec.present) absent++;
      });
      const weekNum = Math.floor(i / chunkSize) + 1;
      weeks.push({ name: `الأسبوع ${weekNum}`, present, absent });
    }
    return weeks;
  }, [calYear, calMonth, worker]);

  // ===== TRANSACTIONS =====
  const transactions = useMemo(() => generateTransactions(worker.id, worker.dailyWage, projectName, calYear, calMonth), [worker, projectName, calYear, calMonth]);

  const totalEarnings = transactions.filter(t => t.type === 'earning').reduce((s, t) => s + t.amount, 0);
  const totalWithdrawals = transactions.filter(t => t.type === 'withdrawal').reduce((s, t) => s + t.amount, 0);
  const netBalance = totalEarnings - totalWithdrawals;

  // Calendar navigation
  const changeMonth = (delta: number) => {
    let m = calMonth + delta;
    let y = calYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setCalMonth(m);
    setCalYear(y);
  };

  const attendanceRate = calendarData.workingDays > 0 ? (calendarData.presentCount / calendarData.workingDays) * 100 : 0;

  const getRateColor = (rate: number) => {
    if (rate >= 90) return 'text-emerald-600 dark:text-emerald-400';
    if (rate >= 70) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-4">
      {/* Back Button */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/workers')} className="gap-2 rounded-xl -mr-2">
        <ArrowRight className="size-4" /> العودة لقائمة العمال
      </Button>

      {/* Worker Profile Card */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-l from-primary/10 via-primary/5 to-transparent p-5">
          <div className="flex items-center gap-4">
            <div className={`size-16 rounded-2xl flex items-center justify-center shrink-0 ${worker.is_active ? 'bg-primary/15 ring-2 ring-primary/20' : 'bg-muted'}`}>
              <User className={`size-7 ${worker.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-lg font-bold truncate">{worker.name}</h1>
                {worker.is_active ? (
                  <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">نشط</Badge>
                ) : (
                  <Badge className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">متوقف</Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Briefcase className="size-3.5" />{worker.type}</span>
                {worker.phone && <span className="flex items-center gap-1"><Phone className="size-3.5" />{worker.phone}</span>}
                <span className="flex items-center gap-1"><Building className="size-3.5" />{projectName}</span>
                <span className="flex items-center gap-1"><DollarSign className="size-3.5" />{formatCurrency(worker.dailyWage)} / يوم</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Monthly Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <UserCheck className="size-4.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground">أيام الحضور</p>
              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{calendarData.presentCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <UserX className="size-4.5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground">أيام الغياب</p>
              <p className="text-base font-bold text-red-600 dark:text-red-400">{calendarData.absentCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
              <TrendingUp className="size-4.5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground">نسبة الالتزام</p>
              <p className={`text-base font-bold ${getRateColor(attendanceRate)}`}>{attendanceRate.toFixed(0)}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <Clock className="size-4.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground">ساعات إضافية</p>
              <p className="text-base font-bold text-blue-600 dark:text-blue-400">{calendarData.totalOvertime}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm col-span-2 lg:col-span-1">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <Banknote className="size-4.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground">مستحقات الشهر</p>
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{formatCurrency(calendarData.totalDue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full rounded-xl h-11">
          <TabsTrigger value="calendar" className="rounded-lg text-xs gap-1.5">
            <Calendar className="size-3.5" /> التقويم
          </TabsTrigger>
          <TabsTrigger value="chart" className="rounded-lg text-xs gap-1.5">
            <TrendingUp className="size-3.5" /> الرسم البياني
          </TabsTrigger>
          <TabsTrigger value="account" className="rounded-lg text-xs gap-1.5">
            <Receipt className="size-3.5" /> كشف الحساب
          </TabsTrigger>
        </TabsList>

        {/* ===== TAB: Calendar ===== */}
        <TabsContent value="calendar" className="space-y-4 mt-0">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => changeMonth(1)} className="p-2 rounded-lg hover:bg-accent transition-colors">
                  <ChevronRight className="size-5" />
                </button>
                <div className="text-center">
                  <h3 className="text-sm font-bold">{ARABIC_MONTHS[calMonth]} {calYear}</h3>
                  <p className="text-[10px] text-muted-foreground">{calendarData.daysInMonth} يوم</p>
                </div>
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg hover:bg-accent transition-colors">
                  <ChevronLeft className="size-5" />
                </button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {ARABIC_DAYS_SHORT.map(day => (
                  <div key={day} className="text-center text-[10px] font-semibold text-muted-foreground py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells before first day */}
                {Array.from({ length: calendarData.firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Days */}
                {Array.from({ length: calendarData.daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const rec = calendarData.attendanceMap[dateStr];
                  const isToday = dateStr === new Date().toISOString().split('T')[0];
                  const isFriday = new Date(dateStr).getDay() === 5;

                  let bg = 'bg-accent/30';
                  let textColor = 'text-foreground';
                  let icon = null;

                  if (rec && rec.hours > 0) {
                    if (rec.hours <= 4) {
                      bg = 'bg-amber-100 dark:bg-amber-900/30';
                      textColor = 'text-amber-700 dark:text-amber-400';
                      icon = <Clock className="size-2.5 text-amber-500" />;
                    } else if (rec.hours <= 8) {
                      bg = 'bg-emerald-100 dark:bg-emerald-900/30';
                      textColor = 'text-emerald-700 dark:text-emerald-400';
                      icon = <CheckCircle2 className="size-2.5 text-emerald-500" />;
                    } else {
                      bg = 'bg-blue-100 dark:bg-blue-900/30';
                      textColor = 'text-blue-700 dark:text-blue-400';
                      icon = <CheckCircle2 className="size-2.5 text-blue-500" />;
                    }
                  } else if (rec && rec.hours === 0) {
                    bg = 'bg-red-100 dark:bg-red-900/30';
                    textColor = 'text-red-700 dark:text-red-400';
                    icon = <XCircle className="size-2.5 text-red-500" />;
                  } else if (isFriday) {
                    bg = 'bg-blue-50 dark:bg-blue-900/20';
                    textColor = 'text-blue-500 dark:text-blue-400';
                  }

                  return (
                    <div
                      key={dayNum}
                      className={`aspect-square rounded-lg ${bg} flex flex-col items-center justify-center gap-0.5 relative transition-colors ${isToday ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                    >
                      <span className={`text-xs font-semibold ${textColor}`}>{dayNum}</span>
                      {icon}
                      {rec && rec.hours > 0 && (
                        <span className="text-[7px] font-bold text-blue-600 dark:text-blue-400">{rec.hours}h</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-border flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="size-3 rounded bg-amber-100 dark:bg-amber-900/30" />
                  <span className="text-[10px] text-muted-foreground">نصف يوم</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="size-3 rounded bg-emerald-100 dark:bg-emerald-900/30" />
                  <span className="text-[10px] text-muted-foreground">يوم كامل</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="size-3 rounded bg-blue-100 dark:bg-blue-900/30" />
                  <span className="text-[10px] text-muted-foreground">أكثر من يوم</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="size-3 rounded bg-red-100 dark:bg-red-900/30" />
                  <span className="text-[10px] text-muted-foreground">غائب</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="size-3 rounded ring-2 ring-primary" />
                  <span className="text-[10px] text-muted-foreground">اليوم</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Month Summary */}
          <Card className="border-0 shadow-sm bg-primary/5 dark:bg-primary/10">
            <CardContent className="p-4">
              <h4 className="text-xs font-bold mb-3 flex items-center gap-2">
                <Calendar className="size-4 text-primary" />
                ملخص {ARABIC_MONTHS[calMonth]} {calYear}
              </h4>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-card rounded-xl p-3 shadow-sm">
                  <p className="text-[10px] text-muted-foreground mb-0.5">إجمالي الساعات</p>
                  <p className="text-sm font-bold">{calendarData.totalHours} ساعة</p>
                  <p className="text-[9px] text-muted-foreground">{calendarData.presentCount} يوم حضور</p>
                </div>
                <div className="bg-card rounded-xl p-3 shadow-sm">
                  <p className="text-[10px] text-muted-foreground mb-0.5">أيام العمل</p>
                  <p className="text-sm font-bold text-purple-600 dark:text-purple-400">{calendarData.totalWorkDays.toFixed(1)} يوم</p>
                  <p className="text-[9px] text-muted-foreground">8 ساعات = يوم كامل</p>
                </div>
                <div className="bg-card rounded-xl p-3 shadow-sm">
                  <p className="text-[10px] text-muted-foreground mb-0.5">الإجمالي</p>
                  <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{formatCurrency(calendarData.totalDue)}</p>
                  <p className="text-[9px] text-muted-foreground">المستحقات الكلية</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TAB: Chart ===== */}
        <TabsContent value="chart" className="space-y-4 mt-0">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" />
                  نشاط الحضور الأسبوعي — {ARABIC_MONTHS[calMonth]} {calYear}
                </h3>
                <div className="flex items-center gap-1">
                  <button onClick={() => changeMonth(1)} className="p-1.5 rounded hover:bg-accent transition-colors">
                    <ChevronRight className="size-4" />
                  </button>
                  <button onClick={() => changeMonth(-1)} className="p-1.5 rounded hover:bg-accent transition-colors">
                    <ChevronLeft className="size-4" />
                  </button>
                </div>
              </div>

              <div className="h-[280px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyChartData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        fontSize: '12px',
                        direction: 'rtl',
                      }}
                      formatter={(value: number, name: string) => [
                        `${value} يوم`,
                        name === 'present' ? 'حضور' : 'غياب',
                      ]}
                    />
                    <Bar dataKey="present" name="حضور" radius={[6, 6, 0, 0]} maxBarSize={40}>
                      {weeklyChartData.map((_, index) => (
                        <Cell key={`p-${index}`} fill="hsl(142, 76%, 36%)" />
                      ))}
                    </Bar>
                    <Bar dataKey="absent" name="غياب" radius={[6, 6, 0, 0]} maxBarSize={40}>
                      {weeklyChartData.map((_, index) => (
                        <Cell key={`a-${index}`} fill="hsl(0, 84%, 60%)" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded bg-emerald-500" />
                  <span className="text-xs text-muted-foreground">أيام الحضور</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded bg-red-500" />
                  <span className="text-xs text-muted-foreground">أيام الغياب</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Rate Indicator */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h4 className="text-xs font-bold mb-3">مؤشر الالتزام الشهري</h4>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>0%</span>
                    <span>{attendanceRate.toFixed(0)}%</span>
                    <span>100%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div
                      className={`rounded-full h-3 transition-all duration-700 ${
                        attendanceRate >= 90 ? 'bg-emerald-500' : attendanceRate >= 70 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, attendanceRate)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] mt-1">
                    <span className="text-red-500">ضعيف</span>
                    <span className="text-amber-500">مقبول</span>
                    <span className="text-emerald-500">ممتاز</span>
                  </div>
                </div>
                <div className={`text-center min-w-[70px] ${getRateColor(attendanceRate)}`}>
                  <p className="text-2xl font-bold">{attendanceRate.toFixed(0)}%</p>
                  <p className="text-[9px]">نسبة الالتزام</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TAB: Account Statement ===== */}
        <TabsContent value="account" className="space-y-4 mt-0">
          {/* Balance Summary */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3 text-center">
                <div className="size-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-1.5">
                  <ArrowUpCircle className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-[9px] text-muted-foreground">المستحقات</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalEarnings)}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3 text-center">
                <div className="size-8 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-1.5">
                  <ArrowDownCircle className="size-4 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-[9px] text-muted-foreground">السحبيات</p>
                <p className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(totalWithdrawals)}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3 text-center">
                <div className={`size-8 rounded-xl flex items-center justify-center mx-auto mb-1.5 ${netBalance >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
                  <Banknote className={`size-4 ${netBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`} />
                </div>
                <p className="text-[9px] text-muted-foreground">الرصيد المتبقي</p>
                <p className={`text-sm font-bold ${netBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  {formatCurrency(netBalance)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Transactions List */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h4 className="text-xs font-bold mb-3 flex items-center gap-2">
                <Receipt className="size-4 text-primary" />
                كشف الحساب التفصيلي
                <Badge variant="secondary" className="text-[9px] mr-auto">{transactions.length} حركة</Badge>
              </h4>

              {transactions.length === 0 ? (
                <div className="text-center py-10">
                  <Receipt className="size-10 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">لا توجد حركات مالية مسجلة</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {transactions.map(tx => (
                    <div
                      key={tx.id}
                      className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                        tx.type === 'earning'
                          ? 'bg-emerald-50/50 dark:bg-emerald-900/10'
                          : 'bg-red-50/50 dark:bg-red-900/10'
                      }`}
                    >
                      <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                        tx.type === 'earning'
                          ? 'bg-emerald-100 dark:bg-emerald-900/30'
                          : 'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        {tx.type === 'earning'
                          ? <ArrowUpCircle className="size-4 text-emerald-600 dark:text-emerald-400" />
                          : <ArrowDownCircle className="size-4 text-red-600 dark:text-red-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{tx.description}</p>
                        <p className="text-[10px] text-muted-foreground">{tx.date}</p>
                      </div>
                      <p className={`text-xs font-bold shrink-0 ${
                        tx.type === 'earning'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {tx.type === 'earning' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
