/**
 * AXION User Behavior Analytics — تحليل سلوك المستخدم
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Route,
  TrendingDown,
  Clock,
  MousePointer2,
  ArrowRight,
  Eye,
  Activity,
  RefreshCw,
} from 'lucide-react';
import {
  getUserJourneys,
  getPageBounceRates,
  getExitPages,
  getClickHeatmap,
  type UserJourney,
  type PageBounceRate,
  type ExitPage,
  type ClickHeatmapData,
} from '@/services/analyticsService';

type TimeRange = 'today' | '7days' | '30days';

const timeRanges: Record<TimeRange, { label: string; days: number }> = {
  today: { label: 'اليوم', days: 0 },
  '7days': { label: 'آخر 7 أيام', days: 7 },
  '30days': { label: 'آخر 30 يوم', days: 30 },
};

export default function UserBehaviorPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');
  const [loading, setLoading] = useState(true);
  const [journeys, setJourneys] = useState<UserJourney[]>([]);
  const [bounceRates, setBounceRates] = useState<PageBounceRate[]>([]);
  const [exitPages, setExitPages] = useState<ExitPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<string>('/');
  const [heatmapData, setHeatmapData] = useState<ClickHeatmapData | null>(null);

  const getDateRange = (range: TimeRange) => {
    const end = new Date();
    const start = new Date();
    if (range === 'today') {
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(start.getDate() - timeRanges[range].days);
    }
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  };

  const loadData = async () => {
    setLoading(true);
    const { startDate, endDate } = getDateRange(timeRange);

    const [journeysData, bounceData, exitData, heatmapResult] = await Promise.all([
      getUserJourneys(startDate, endDate, 20),
      getPageBounceRates(startDate, endDate),
      getExitPages(startDate, endDate),
      getClickHeatmap(selectedPage, startDate, endDate),
    ]);

    setJourneys(journeysData);
    setBounceRates(bounceData);
    setExitPages(exitData);
    setHeatmapData(heatmapResult);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [timeRange, selectedPage]);

  if (loading) {
    return (
      <div className="space-y-5" dir="rtl">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Route className="size-6 text-primary" />
            تحليل سلوك المستخدم
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            مسارات التصفح ومعدلات الارتداد والخروج
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
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

          <Button variant="outline" size="icon" className="rounded-xl" onClick={loadData}>
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* User Journeys */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Route className="size-4" />
              مسارات الزوار (User Journeys)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {journeys.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                لا توجد بيانات لهذه الفترة
              </p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {journeys.slice(0, 10).map((journey, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-accent/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className="text-[9px] border-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        #{idx + 1}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {journey.path.length} صفحة
                      </span>
                      <span className="text-xs text-muted-foreground">
                        · {Math.round(journey.durations.reduce((a, b) => a + b, 0) / 60)} دقيقة
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {journey.path.map((page, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <span className="text-xs font-medium px-2 py-1 rounded-lg bg-background truncate max-w-[120px]">
                            {page}
                          </span>
                          {i < journey.path.length - 1 && (
                            <ArrowRight className="size-3 text-muted-foreground" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bounce Rates */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="size-4" />
              معدل الارتداد لكل صفحة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bounceRates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                لا توجد بيانات لهذه الفترة
              </p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {bounceRates.slice(0, 10).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.page}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <Eye className="size-3" />
                        <span>{item.views} مشاهدة</span>
                        <span>·</span>
                        <Clock className="size-3" />
                        <span>{item.avgDuration}ث</span>
                      </div>
                    </div>
                    <Badge
                      className={`text-xs border-0 shrink-0 ${
                        item.bounceRate > 70
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : item.bounceRate > 50
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      }`}
                    >
                      {item.bounceRate}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Exit Pages */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="size-4" />
              الصفحات الأكثر خروجاً
            </CardTitle>
          </CardHeader>
          <CardContent>
            {exitPages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                لا توجد بيانات لهذه الفترة
              </p>
            ) : (
              <div className="space-y-2">
                {exitPages.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.page}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.exits} خروج من {item.views} زيارة
                      </p>
                    </div>
                    <Badge className="text-xs border-0 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 shrink-0">
                      {item.exitRate}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Click Heatmap */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MousePointer2 className="size-4" />
              خريطة النقرات (Heatmap)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Select value={selectedPage} onValueChange={setSelectedPage}>
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue placeholder="اختر صفحة" />
                </SelectTrigger>
                <SelectContent>
                  {bounceRates.slice(0, 10).map((item, idx) => (
                    <SelectItem key={idx} value={item.page}>
                      {item.page}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative h-64 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 overflow-hidden">
                {/* خريطة الحرارة المبسطة */}
                {heatmapData && heatmapData.clicks.length > 0 ? (
                  <>
                    {heatmapData.clicks.map((click, idx) => {
                      const maxClicks = Math.max(...heatmapData.clicks.map(c => c.count));
                      const intensity = (click.count / maxClicks) * 100;
                      const size = 20 + (intensity / 100) * 60;
                      
                      return (
                        <div
                          key={idx}
                          className="absolute rounded-full pointer-events-none"
                          style={{
                            left: `${(click.x / window.innerWidth) * 100}%`,
                            top: `${(click.y / 300) * 100}%`,
                            width: `${size}px`,
                            height: `${size}px`,
                            backgroundColor: `rgba(239, 68, 68, ${intensity / 100})`,
                            filter: 'blur(10px)',
                          }}
                          title={`${click.count} نقرة`}
                        />
                      );
                    })}
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <MousePointer2 className="size-12 text-muted-foreground/20 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">لا توجد بيانات نقرات</p>
                    </div>
                  </div>
                )}
              </div>

              {heatmapData && heatmapData.clicks.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold">أكثر المناطق نقراً:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {heatmapData.clicks
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 4)
                      .map((click, idx) => (
                        <div key={idx} className="p-2 rounded-lg bg-accent/30 text-xs">
                          <p className="font-medium truncate">{click.element || 'عنصر'}</p>
                          <p className="text-muted-foreground">{click.count} نقرة</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-950/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-700 dark:text-blue-400">إجمالي المسارات</p>
                <p className="text-3xl font-bold mt-1 text-blue-900 dark:text-blue-300">
                  {journeys.length}
                </p>
              </div>
              <Route className="size-10 text-blue-500 opacity-30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-950/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700 dark:text-amber-400">متوسط معدل الارتداد</p>
                <p className="text-3xl font-bold mt-1 text-amber-900 dark:text-amber-300">
                  {bounceRates.length > 0
                    ? Math.round(
                        bounceRates.reduce((sum, r) => sum + r.bounceRate, 0) / bounceRates.length
                      )
                    : 0}
                  %
                </p>
              </div>
              <TrendingDown className="size-10 text-amber-500 opacity-30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-950/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-700 dark:text-red-400">صفحات الخروج</p>
                <p className="text-3xl font-bold mt-1 text-red-900 dark:text-red-300">
                  {exitPages.length}
                </p>
              </div>
              <Activity className="size-10 text-red-500 opacity-30" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
