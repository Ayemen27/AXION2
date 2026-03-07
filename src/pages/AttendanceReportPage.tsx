import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart3,
  Users,
  Calendar,
  Search,
  Download,
  Building2,
  UserCheck,
  UserX,
  Percent,
  Banknote,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  Printer,
  ArrowUpDown,
  Clock,
} from 'lucide-react';
import { useProjects, useWorkers } from '@/hooks/useDataStore';
import { useSelectedProject } from '@/hooks/useSelectedProject';
import { formatCurrency } from '@/constants/config';

interface WorkerMonthlyReport {
  workerId: string;
  workerName: string;
  workerType: string;
  projectId?: string;
  projectName: string;
  dailyWage: number;
  presentDays: number;
  absentDays: number;
  totalHours: number;
  totalWorkDays: number;
  totalOvertime: number;
  attendanceRate: number;
  baseDue: number;
  overtimeDue: number;
  totalDue: number;
}

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

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getMonthDates(year: number, month: number): string[] {
  const days = getDaysInMonth(year, month);
  const dates: string[] = [];
  for (let d = 1; d <= days; d++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    dates.push(date);
  }
  return dates;
}

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

type SortKey = 'name' | 'presentDays' | 'attendanceRate' | 'totalDue';

export default function AttendanceReportPage() {
  const { projects } = useProjects();
  const { workers } = useWorkers();
  const { selectedProjectId, selectProject } = useSelectedProject();
  const { toast } = useToast();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const activeProjects = useMemo(() => projects.filter(p => p.status === 'active'), [projects]);
  const daysInMonth = getDaysInMonth(year, month);

  // Build monthly report data
  const reportData = useMemo(() => {
    const monthDates = getMonthDates(year, month);

    // Load all attendance for the month
    const allRecords: Map<string, Map<string, { present: boolean; overtime: number }>> = new Map();
    monthDates.forEach(date => {
      const records = loadAttendance(date);
      records.forEach(r => {
        if (!allRecords.has(r.workerId)) {
          allRecords.set(r.workerId, new Map());
        }
        allRecords.get(r.workerId)!.set(date, { present: r.present, overtime: r.overtime });
      });
    });

    // Calculate per-worker stats
    let filteredWorkers = workers.filter(w => w.is_active);
    if (selectedProjectId) {
      filteredWorkers = filteredWorkers.filter(w => w.project_id === selectedProjectId);
    }

    const reports: WorkerMonthlyReport[] = filteredWorkers.map(worker => {
      const workerRecords = allRecords.get(worker.id);
      let presentDays = 0;
      let totalHoursWorked = 0;
      let totalOvertime = 0;

      if (workerRecords) {
        workerRecords.forEach(record => {
          if (record.hours > 0) {
            presentDays++;
            totalHoursWorked += record.hours;
            totalOvertime += Math.max(0, record.hours - 8);
          }
        });
      }

      // Count working days up to today or end of month
      const today = new Date();
      let workingDaysInMonth = daysInMonth;
      if (year === today.getFullYear() && month === today.getMonth()) {
        workingDaysInMonth = today.getDate();
      }

      const totalWorkDays = totalHoursWorked / 8;
      const absentDays = Math.max(0, workingDaysInMonth - presentDays);
      const attendanceRate = workingDaysInMonth > 0 ? (presentDays / workingDaysInMonth) * 100 : 0;
      const baseDue = totalWorkDays * worker.dailyWage;
      const overtimeDue = 0;
      const totalDue = baseDue;

      const projectName = projects.find(p => p.id === worker.project_id)?.name || 'بدون مشروع';

      return {
        workerId: worker.id,
        workerName: worker.name,
        workerType: worker.type,
        projectId: worker.project_id,
        projectName,
        dailyWage: worker.dailyWage,
        presentDays,
        absentDays,
        totalHours: totalHoursWorked,
        totalWorkDays,
        totalOvertime,
        attendanceRate,
        baseDue,
        overtimeDue,
        totalDue,
      };
    });

    return reports;
  }, [workers, projects, selectedProjectId, year, month, daysInMonth]);

  // Apply search & sort
  const filteredReports = useMemo(() => {
    let result = reportData;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        r => r.workerName.toLowerCase().includes(q) || r.workerType.toLowerCase().includes(q) || r.projectName.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.workerName.localeCompare(b.workerName, 'ar'); break;
        case 'presentDays': cmp = a.presentDays - b.presentDays; break;
        case 'attendanceRate': cmp = a.attendanceRate - b.attendanceRate; break;
        case 'totalDue': cmp = a.totalDue - b.totalDue; break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [reportData, searchQuery, sortKey, sortAsc]);

  // Summary stats
  const summary = useMemo(() => {
    const totalWorkers = filteredReports.length;
    const totalPresent = filteredReports.reduce((s, r) => s + r.presentDays, 0);
    const totalAbsent = filteredReports.reduce((s, r) => s + r.absentDays, 0);
    const totalDue = filteredReports.reduce((s, r) => s + r.totalDue, 0);
    const totalOvertimeDue = filteredReports.reduce((s, r) => s + r.overtimeDue, 0);
    const avgRate = totalWorkers > 0 ? filteredReports.reduce((s, r) => s + r.attendanceRate, 0) / totalWorkers : 0;
    return { totalWorkers, totalPresent, totalAbsent, totalDue, totalOvertimeDue, avgRate };
  }, [filteredReports]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(prev => !prev);
    } else {
      setSortKey(key);
      setSortAsc(key === 'name');
    }
  };

  const changeMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m);
    setYear(y);
  };

  const getRateColor = (rate: number) => {
    if (rate >= 90) return 'text-emerald-600 dark:text-emerald-400';
    if (rate >= 70) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getRateBg = (rate: number) => {
    if (rate >= 90) return 'bg-emerald-500';
    if (rate >= 70) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const exportCSV = () => {
    const header = 'الاسم,التخصص,المشروع,الأجر اليومي,أيام الحضور,أيام الغياب,إجمالي الساعات,أيام العمل,نسبة الالتزام,إجمالي المستحقات\n';
    const rows = filteredReports.map(r =>
      `${r.workerName},${r.workerType},${r.projectName},${r.dailyWage},${r.presentDays},${r.absentDays},${r.totalHours},${r.totalWorkDays.toFixed(1)},${r.attendanceRate.toFixed(1)}%,${r.totalDue}`
    ).join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير_الحضور_${ARABIC_MONTHS[month]}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'تم التصدير', description: `تم تصدير تقرير ${ARABIC_MONTHS[month]} ${year} بنجاح` });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="size-6 text-primary" />
            تقارير الحضور الشهرية
          </h1>
          <p className="text-sm text-muted-foreground">
            ملخص حضور وغياب العمال ومستحقاتهم
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportCSV} variant="outline" size="sm" className="rounded-xl gap-1.5">
            <FileSpreadsheet className="size-4" />
            <span className="hidden sm:inline">تصدير CSV</span>
          </Button>
          <Button onClick={handlePrint} variant="outline" size="sm" className="rounded-xl gap-1.5">
            <Printer className="size-4" />
            <span className="hidden sm:inline">طباعة</span>
          </Button>
        </div>
      </div>

      {/* Month & Project Selector */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Month Picker */}
            <div className="flex items-center gap-2 bg-accent/50 rounded-xl p-1.5 flex-1">
              <button onClick={() => changeMonth(1)} className="p-2 rounded-lg hover:bg-accent transition-colors">
                <ChevronRight className="size-4" />
              </button>
              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Calendar className="size-4 text-primary" />
                  <span className="text-sm font-bold">{ARABIC_MONTHS[month]} {year}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{daysInMonth} يوم</p>
              </div>
              <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg hover:bg-accent transition-colors">
                <ChevronLeft className="size-4" />
              </button>
            </div>

            {/* Project Selector */}
            <div className="flex-1">
              <Select value={selectedProjectId || 'all'} onValueChange={(v) => selectProject(v === 'all' ? null : v)}>
                <SelectTrigger className="rounded-xl h-12 border-0 bg-accent/50">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-primary" />
                    <SelectValue placeholder="جميع المشاريع" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المشاريع</SelectItem>
                  {activeProjects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Users className="size-4.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">عدد العمال</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{summary.totalWorkers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <UserCheck className="size-4.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">إجمالي أيام الحضور</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{summary.totalPresent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                <UserX className="size-4.5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">إجمالي أيام الغياب</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{summary.totalAbsent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                <TrendingUp className="size-4.5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">متوسط الالتزام</p>
                <p className={`text-lg font-bold ${getRateColor(summary.avgRate)}`}>{summary.avgRate.toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm col-span-2 lg:col-span-1">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <Banknote className="size-4.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">إجمالي المستحقات</p>
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{formatCurrency(summary.totalDue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overtime breakdown */}
      {summary.totalOvertimeDue > 0 && (
        <Card className="border-0 shadow-sm border-r-4 border-r-purple-500">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-purple-600" />
                <span className="text-xs text-muted-foreground">بدل ساعات إضافية:</span>
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(summary.totalOvertimeDue)}
                </span>
              </div>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              من إجمالي {formatCurrency(summary.totalDue)}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم أو التخصص أو المشروع..."
            className="pr-10 rounded-xl border-0 bg-card shadow-sm h-10"
          />
        </div>
        <div className="flex gap-1.5">
          {([
            { key: 'name' as SortKey, label: 'الاسم' },
            { key: 'presentDays' as SortKey, label: 'الحضور' },
            { key: 'attendanceRate' as SortKey, label: 'الالتزام' },
            { key: 'totalDue' as SortKey, label: 'المستحقات' },
          ]).map(s => (
            <Button
              key={s.key}
              variant={sortKey === s.key ? 'default' : 'outline'}
              size="sm"
              className="rounded-xl text-[11px] h-8 px-2.5"
              onClick={() => handleSort(s.key)}
            >
              {s.label}
              {sortKey === s.key && <ArrowUpDown className="size-3 mr-1" />}
            </Button>
          ))}
        </div>
      </div>

      {/* Workers Report List */}
      {filteredReports.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <BarChart3 className="size-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">لا توجد بيانات حضور لهذا الشهر</p>
            <p className="text-xs text-muted-foreground/60 mt-1">سجّل حضور العمال من صفحة الحضور اليومي أولاً</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2" id="printable-report">
          {filteredReports.map((report, index) => (
            <Card key={report.workerId} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Rank */}
                  <div className="size-9 rounded-xl bg-accent flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground">
                    {index + 1}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold truncate">{report.workerName}</h3>
                      <Badge variant="secondary" className="text-[9px]">{report.workerType}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-3">
                      {report.projectName} • يومي: {formatCurrency(report.dailyWage)}
                    </p>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-emerald-50 dark:bg-emerald-900/15 rounded-lg p-2 text-center">
                        <p className="text-[9px] text-muted-foreground mb-0.5">أيام الحضور</p>
                        <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                          {report.presentDays}
                          <span className="text-[9px] font-normal text-muted-foreground mr-0.5">/{daysInMonth}</span>
                        </p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/15 rounded-lg p-2 text-center">
                        <p className="text-[9px] text-muted-foreground mb-0.5">أيام الغياب</p>
                        <p className="text-base font-bold text-red-600 dark:text-red-400">{report.absentDays}</p>
                      </div>
                      <div className="rounded-lg p-2 text-center bg-accent/60">
                        <p className="text-[9px] text-muted-foreground mb-0.5">نسبة الالتزام</p>
                        <p className={`text-base font-bold ${getRateColor(report.attendanceRate)}`}>
                          {report.attendanceRate.toFixed(0)}%
                        </p>
                        <div className="w-full bg-muted rounded-full h-1 mt-1">
                          <div
                            className={`${getRateBg(report.attendanceRate)} rounded-full h-1 transition-all duration-500`}
                            style={{ width: `${Math.min(100, report.attendanceRate)}%` }}
                          />
                        </div>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-900/15 rounded-lg p-2 text-center">
                        <p className="text-[9px] text-muted-foreground mb-0.5">المستحقات</p>
                        <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{formatCurrency(report.totalDue)}</p>
                        <p className="text-[8px] text-purple-500 mt-0.5">
                          {report.totalHours}h = {report.totalWorkDays.toFixed(1)} يوم
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Footer Summary */}
      {filteredReports.length > 0 && (
        <Card className="border-0 shadow-sm bg-primary/5 dark:bg-primary/10 print:break-before-avoid">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <BarChart3 className="size-4 text-primary" />
                ملخص الشهر — {ARABIC_MONTHS[month]} {year}
              </h3>
              <Badge variant="secondary" className="text-[10px]">
                {filteredReports.length} عامل
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-card rounded-xl p-3 text-center shadow-sm">
                <p className="text-[10px] text-muted-foreground mb-1">إجمالي أيام الحضور</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{summary.totalPresent}</p>
                <p className="text-[9px] text-muted-foreground">يوم عمل</p>
              </div>
              <div className="bg-card rounded-xl p-3 text-center shadow-sm">
                <p className="text-[10px] text-muted-foreground mb-1">إجمالي أيام الغياب</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">{summary.totalAbsent}</p>
                <p className="text-[9px] text-muted-foreground">يوم غياب</p>
              </div>
              <div className="bg-card rounded-xl p-3 text-center shadow-sm">
                <p className="text-[10px] text-muted-foreground mb-1">متوسط نسبة الالتزام</p>
                <p className={`text-xl font-bold ${getRateColor(summary.avgRate)}`}>{summary.avgRate.toFixed(1)}%</p>
                <div className="w-full bg-muted rounded-full h-1.5 mt-1.5">
                  <div
                    className={`${getRateBg(summary.avgRate)} rounded-full h-1.5 transition-all duration-500`}
                    style={{ width: `${Math.min(100, summary.avgRate)}%` }}
                  />
                </div>
              </div>
              <div className="bg-card rounded-xl p-3 text-center shadow-sm">
                <p className="text-[10px] text-muted-foreground mb-1">إجمالي المستحقات</p>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{formatCurrency(summary.totalDue)}</p>
                <p className="text-[9px] text-muted-foreground">ريال يمني</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
