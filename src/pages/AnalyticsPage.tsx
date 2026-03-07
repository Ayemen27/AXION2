
/**
 * AXION Analytics Page — صفحة التحليلات والإحصائيات
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Eye,
  Users,
  MousePointerClick,
  Clock,
  Activity,
  RefreshCw,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Calendar,
  Save,
  Trash2,
  Star,
  Chrome,
  Navigation,
  Gauge,
} from 'lucide-react';
import {
  getSummary,
  getTrend,
  getSourceData,
  getPageData,
  getCountryData,
  getDeviceData,
  getBrowserData,
  getOSData,
  getCurrentVisitors,
  getSavedFilters,
  saveFilter,
  deleteFilter,
  type AnalyticsSummary,
  type TrendData,
  type SourceData,
  type PageData,
  type CountryData,
  type DeviceData,
  type BrowserData,
  type OSData,
  type SavedDateFilter,
} from '@/services/analyticsService';

type TimeRange = 'today' | '7days' | '30days' | '90days' | 'custom';

const timeRanges: Record<TimeRange, { label: string; days: number }> = {
  today: { label: 'اليوم', days: 0 },
  '7days': { label: 'آخر 7 أيام', days: 7 },
  '30days': { label: 'آخر 30 يوم', days: 30 },
  '90days': { label: 'آخر 90 يوم', days: 90 },
  custom: { label: 'فترة مخصصة', days: 0 },
};

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Custom date range
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  
  // Saved filters
  const [savedFilters, setSavedFilters] = useState<SavedDateFilter[]>([]);
  const [filterName, setFilterName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trend, setTrend] = useState<TrendData[]>([]);
  const [sources, setSources] = useState<SourceData[]>([]);
  const [pages, setPages] = useState<PageData[]>([]);
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [browsers, setBrowsers] = useState<BrowserData[]>([]);
  const [oses, setOSes] = useState<OSData[]>([]);
  const [currentVisitors, setCurrentVisitors] = useState(0);

  const getDateRange = (range: TimeRange) => {
    if (range === 'custom' && customStartDate && customEndDate) {
      return {
        startDate: new Date(customStartDate).toISOString(),
        endDate: new Date(customEndDate + ' 23:59:59').toISOString(),
      };
    }
    
    const end = new Date();
    const start = new Date();
    
    if (range === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (range !== 'custom') {
      start.setDate(start.getDate() - timeRanges[range].days);
    }
    
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  };
  
  const loadSavedFilters = async () => {
    if (!user?.id) return;
    const filters = await getSavedFilters(user.id);
    setSavedFilters(filters);
  };
  
  const handleSaveFilter = async () => {
    if (!user?.id || !filterName || !customStartDate || !customEndDate) return;
    
    await saveFilter(user.id, filterName, customStartDate, customEndDate, false);
    toast({ title: 'تم الحفظ', description: `تم حفظ الفلتر "${filterName}" بنجاح` });
    setShowSaveDialog(false);
    setFilterName('');
    loadSavedFilters();
  };
  
  const handleDeleteFilter = async (filterId: string) => {
    await deleteFilter(filterId);
    toast({ title: 'تم الحذف', description: 'تم حذف الفلتر' });
    loadSavedFilters();
  };
  
  const applyCustomRange = () => {
    if (!customStartDate || !customEndDate) {
      toast({ title: 'خطأ', description: 'يرجى اختيار تاريخ البداية والنهاية', variant: 'destructive' });
      return;
    }
    setTimeRange('custom');
    setShowCustomDialog(false);
  };
  
  const applySavedFilter = (filter: SavedDateFilter) => {
    setCustomStartDate(filter.start_date);
    setCustomEndDate(filter.end_date);
    setTimeRange('custom');
  };

  const loadAnalytics = async () => {
    setLoading(true);
    const { startDate, endDate } = getDateRange(timeRange);

    const [
      summaryData,
      trendData,
      sourceData,
      pageData,
      countryData,
      deviceData,
      browserData,
      osData,
      currentVis,
    ] = await Promise.all([
      getSummary(startDate, endDate),
      getTrend(startDate, endDate),
      getSourceData(startDate, endDate),
      getPageData(startDate, endDate),
      getCountryData(startDate, endDate),
      getDeviceData(startDate, endDate),
      getBrowserData(startDate, endDate),
      getOSData(startDate, endDate),
      getCurrentVisitors(),
    ]);

    setSummary(summaryData);
    setTrend(trendData);
    setSources(sourceData);
    setPages(pageData);
    setCountries(countryData);
    setDevices(deviceData);
    setBrowsers(browserData);
    setOSes(osData);
    setCurrentVisitors(currentVis);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  useEffect(() => {
    loadAnalytics();
    loadSavedFilters();
    // تحديث الزوار الحاليين كل دقيقة
    const interval = setInterval(() => {
      getCurrentVisitors().then(setCurrentVisitors);
    }, 60000);
    return () => clearInterval(interval);
  }, [timeRange, customStartDate, customEndDate]);

  if (loading) {
    return (
      <div className="space-y-5" dir="rtl">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="size-6 text-primary" />
            التحليلات
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className="text-[10px] border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Activity className="size-2.5 ml-1 animate-pulse" />
              {currentVisitors} زائر حالي
            </Badge>
            <span className="text-xs text-muted-foreground">
              آخر تحديث: {new Date().toLocaleTimeString('ar-YE')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={timeRange} onValueChange={(v) => {
            if (v === 'custom') {
              setShowCustomDialog(true);
            } else {
              setTimeRange(v as TimeRange);
            }
          }}>
            <SelectTrigger className="w-40 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(timeRanges).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {timeRange === 'custom' && customStartDate && customEndDate && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5"
              onClick={() => setShowSaveDialog(true)}
            >
              <Save className="size-3.5" />
              حفظ الفلتر
            </Button>
          )}
          
          {savedFilters.length > 0 && (
            <Select onValueChange={(id) => {
              const filter = savedFilters.find(f => f.id === id);
              if (filter) applySavedFilter(filter);
            }}>
              <SelectTrigger className="w-44 rounded-xl">
                <Star className="size-3.5 ml-1" />
                <span className="text-xs">الفلاتر المحفوظة</span>
              </SelectTrigger>
              <SelectContent>
                {savedFilters.map(filter => (
                  <SelectItem key={filter.id} value={filter.id}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs">{filter.filter_name}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteFilter(filter.id); }}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            variant="outline"
            size="icon"
            className="rounded-xl"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      
      {/* Custom Date Range Dialog */}
      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="size-5" />
              فترة زمنية مخصصة
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">تاريخ البداية</Label>
              <Input
                id="start-date"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">تاريخ النهاية</Label>
              <Input
                id="end-date"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="rounded-xl"
                min={customStartDate}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomDialog(false)} className="rounded-xl">
              إلغاء
            </Button>
            <Button onClick={applyCustomRange} className="rounded-xl gap-2">
              <Calendar className="size-4" />
              تطبيق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Save Filter Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="size-5" />
              حفظ الفلتر
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filter-name">اسم الفلتر</Label>
              <Input
                id="filter-name"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="مثال: ربع سنوي 2026"
                className="rounded-xl"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              <p>من: {customStartDate}</p>
              <p>إلى: {customEndDate}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)} className="rounded-xl">
              إلغاء
            </Button>
            <Button onClick={handleSaveFilter} className="rounded-xl gap-2" disabled={!filterName}>
              <Save className="size-4" />
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* This closing div tag was misplaced. It should be outside the Dialog components */}
      {/* The Dialog components are siblings to the main content div, not children of it. */}
      {/* Removing the incorrect closing div here */}

      {/* بطاقات الإحصائيات الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">إجمالي الزوار</p>
                <p className="text-3xl font-bold mt-1">{summary?.totalVisitors || 0}</p>
              </div>
              <div className="size-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="size-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">مشاهدات الصفحات</p>
                <p className="text-3xl font-bold mt-1">{summary?.totalPageviews || 0}</p>
              </div>
              <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Eye className="size-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">مشاهدات/زيارة</p>
                <p className="text-3xl font-bold mt-1">{summary?.viewsPerVisit || 0}</p>
              </div>
              <div className="size-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <MousePointerClick className="size-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-950/30">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-amber-700 dark:text-amber-400">معدل الارتداد</p>
                <p className="text-3xl font-bold mt-1 text-amber-900 dark:text-amber-300">
                  {summary?.bounceRate || 0}%
                </p>
              </div>
              <div className="size-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Navigation className="size-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">متوسط المدة</p>
                <p className="text-3xl font-bold mt-1">
                  {summary?.avgDuration || 0}
                  <span className="text-sm text-muted-foreground mr-1">ث</span>
                </p>
              </div>
              <div className="size-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Clock className="size-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* رسوم بيانية متقدمة */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* رسم بياني خطي - الاتجاه */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="size-4" />
              اتجاه الزوار والمشاهدات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trend.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-muted-foreground text-sm">
                لا توجد بيانات لعرضها
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(val) => new Date(val).toLocaleDateString('ar-YE', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    labelFormatter={(val) => new Date(val).toLocaleDateString('ar-YE')}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="visitors"
                    name="الزوار"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="pageviews"
                    name="المشاهدات"
                    stroke="hsl(142 76% 36%)" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart - الأجهزة */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Monitor className="size-4" />
              توزيع الأجهزة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {devices.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                لا توجد بيانات
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={devices}
                    dataKey="visitors"
                    nameKey="device"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ device, percentage }) => `${device} ${percentage}%`}
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {devices.map((entry, index) => {
                      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: any) => [`${value} زائر`, 'العدد']}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart - المتصفحات */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Chrome className="size-4" />
              توزيع المتصفحات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {browsers.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                لا توجد بيانات
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={browsers}
                    dataKey="visitors"
                    nameKey="browser"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ browser, percentage }) => `${browser} ${percentage}%`}
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {browsers.map((entry, index) => {
                      const colors = ['#ef4444', '#06b6d4', '#f97316', '#84cc16', '#a855f7'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: any) => [`${value} زائر`, 'العدد']}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart - أعلى الصفحات */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="size-4" />
              أعلى الصفحات مشاهدة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                لا توجد بيانات لهذه الفترة
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={pages.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    dataKey="page"
                    type="category"
                    tick={{ fontSize: 10 }}
                    width={120}
                    tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + '...' : val}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: any) => [`${value} مشاهدة`, 'العدد']}
                  />
                  <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* جداول التحليلات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* المصدر */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span>المصدر (Source)</span>
              <span className="text-xs text-muted-foreground">الزوار</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sources.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                لا توجد بيانات لهذه الفترة
              </p>
            ) : (
              <div className="space-y-2">
                {sources.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Globe className="size-4 text-muted-foreground shrink-0" />
                      <span className="text-xs font-medium truncate">{item.source}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">{item.percentage}%</span>
                      <span className="text-sm font-bold">{item.visitors}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* الصفحات */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span>الصفحات (Pages)</span>
              <span className="text-xs text-muted-foreground">المشاهدات</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                لا توجد بيانات لهذه الفترة
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {pages.slice(0, 8).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="size-6 rounded-md bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {idx + 1}
                      </div>
                      <span className="text-xs font-medium truncate">{item.page}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="h-1.5 rounded-full bg-primary/20" style={{ width: `${item.percentage}px` }}>
                        <div className="h-full rounded-full bg-primary" style={{ width: `${item.percentage}%` }} />
                      </div>
                      <span className="text-sm font-bold w-12 text-right">{item.views}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* الدول */}
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10">
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Globe className="size-4" />
                الدول (Countries)
              </span>
              <span className="text-xs text-muted-foreground">الزوار</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {countries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                لا توجد بيانات لهذه الفترة
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {countries.map((item, idx) => {
                  const countryFlags: Record<string, string> = {
                    'Yemen': '🇾🇪',
                    'Saudi Arabia': '🇸🇦',
                    'United Arab Emirates': '🇦🇪',
                    'UAE': '🇦🇪',
                    'Egypt': '🇪🇬',
                    'United States': '🇺🇸',
                    'United Kingdom': '🇬🇧',
                    'Unknown': '🌐',
                  };
                  
                  return (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-background/50 transition-colors">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xl shrink-0">{countryFlags[item.country] || '🌍'}</span>
                        <span className="text-xs font-medium truncate">{item.country}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className="text-[9px] border-0 bg-blue-500/20 text-blue-700 dark:text-blue-400">
                          {item.percentage}%
                        </Badge>
                        <span className="text-sm font-bold w-12 text-right">{item.visitors}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* نظم التشغيل */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Gauge className="size-4" />
                نظم التشغيل (OS)
              </span>
              <span className="text-xs text-muted-foreground">الزوار</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {oses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                لا توجد بيانات لهذه الفترة
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {oses.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent/50 transition-colors">
                    <span className="text-xs font-medium">{item.os}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 rounded-full bg-primary/20" style={{ width: '60px' }}>
                        <div className="h-full rounded-full bg-primary" style={{ width: `${item.percentage}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{item.percentage}%</span>
                      <span className="text-sm font-bold w-10 text-right">{item.visitors}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
