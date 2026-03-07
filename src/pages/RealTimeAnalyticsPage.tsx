/**
 * AXION Real-Time Analytics — لوحة التحليلات الفورية
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Users, Eye, Clock, Globe, Monitor, Smartphone, Tablet, RefreshCw, Radio, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getActiveVisitors,
  getGeoLocations,
  type ActiveVisitor,
  type GeoLocation,
} from '@/services/analyticsService';

export default function RealTimeAnalyticsPage() {
  const [visitors, setVisitors] = useState<ActiveVisitor[]>([]);
  const [geoData, setGeoData] = useState<GeoLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadData = async () => {
    setLoading(true);
    const [visitorsData, geoDataResult] = await Promise.all([
      getActiveVisitors(),
      getGeoLocations(),
    ]);
    setVisitors(visitorsData);
    setGeoData(geoDataResult);
    setLastUpdate(new Date());
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // تحديث تلقائي كل 5 ثوانٍ
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const activeCount = visitors.length;
  const pageViews = visitors.reduce((acc, v) => {
    const count = visitors.filter(x => x.current_page === v.current_page).length;
    return Math.max(acc, count);
  }, 0);

  const deviceBreakdown = visitors.reduce((acc, v) => {
    const device = v.device_type || 'unknown';
    acc[device] = (acc[device] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading && activeCount === 0) {
    return (
      <div className="space-y-5" dir="rtl">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="size-6 text-primary animate-pulse" />
            التحليلات الفورية
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            آخر تحديث: {lastUpdate.toLocaleTimeString('ar-YE')}
          </p>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={loadData}>
          <RefreshCw className="size-4" />
          تحديث
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-950/30">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">الزوار النشطون الآن</p>
                <p className="text-4xl font-bold mt-1 text-emerald-900 dark:text-emerald-300">
                  {activeCount}
                </p>
              </div>
              <div className="size-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Users className="size-6 text-emerald-600 dark:text-emerald-400 animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">الصفحات النشطة</p>
                <p className="text-3xl font-bold mt-1">{new Set(visitors.map(v => v.current_page)).size}</p>
              </div>
              <div className="size-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Eye className="size-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">متوسط الوقت</p>
                <p className="text-3xl font-bold mt-1">
                  {Math.round(visitors.reduce((sum, v) => sum + (v.seconds_on_page || 0), 0) / (visitors.length || 1))}
                  <span className="text-sm text-muted-foreground mr-1">ث</span>
                </p>
              </div>
              <div className="size-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="size-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Geographic Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="size-4" />
              التوزيع الجغرافي
            </CardTitle>
          </CardHeader>
          <CardContent>
            {geoData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات</p>
            ) : (
              <div className="space-y-3">
                {/* خريطة بسيطة محسّنة */}
                <div className="h-48 rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/30 relative overflow-hidden border border-blue-200/50 dark:border-blue-800/30">
                  {/* Grid overlay */}
                  <div className="absolute inset-0" style={{
                    backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }} />
                  
                  {/* نقاط الخريطة الحيّة */}
                  {geoData.map((geo, idx) => {
                    const positions = [
                      { left: '25%', top: '35%' },
                      { left: '45%', top: '25%' },
                      { left: '65%', top: '50%' },
                      { left: '30%', top: '70%' },
                      { left: '75%', top: '40%' },
                    ];
                    const pos = positions[idx % positions.length];
                    
                    return (
                      <div
                        key={idx}
                        className="absolute"
                        style={{ left: pos.left, top: pos.top }}
                      >
                        {/* Pulse animation */}
                        <div className="relative flex items-center justify-center">
                          <div className="absolute size-8 bg-emerald-500/30 rounded-full animate-ping" />
                          <div className="absolute size-6 bg-emerald-500/50 rounded-full animate-pulse" />
                          <div className="relative size-4 bg-emerald-500 rounded-full flex items-center justify-center">
                            <MapPin className="size-2.5 text-white" />
                          </div>
                        </div>
                        {/* Tooltip */}
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 dark:bg-slate-800 text-white text-[9px] rounded whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                          {geo.country}: {geo.count}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Decorative elements */}
                  <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground flex items-center gap-1">
                    <Radio className="size-3" />
                    <span>Live</span>
                  </div>
                </div>

                {/* قائمة الدول المحسّنة */}
                <div className="space-y-2">
                  {geoData.map((geo, idx) => {
                    const countryFlags: Record<string, string> = {
                      'Yemen': '🇾🇪',
                      'Saudi Arabia': '🇸🇦',
                      'United Arab Emirates': '🇦🇪',
                      'UAE': '🇦🇪',
                      'Egypt': '🇪🇬',
                      'United States': '🇺🇸',
                      'United Kingdom': '🇬🇧',
                      'Germany': '🇩🇪',
                      'Unknown': '🌐',
                    };
                    
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-background to-accent/30 hover:to-accent/50 transition-all group">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{countryFlags[geo.country] || '🌍'}</span>
                          <div>
                            <p className="text-sm font-semibold">{geo.country}</p>
                            <p className="text-xs text-muted-foreground">نشط الآن</p>
                          </div>
                        </div>
                        <Badge className="text-xs border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                          {geo.count} زائر
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Pages */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="size-4" />
              الصفحات المتصفحة حالياً
            </CardTitle>
          </CardHeader>
          <CardContent>
            {visitors.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا يوجد زوار حالياً</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {visitors.map((visitor, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-accent/30 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{visitor.current_title || visitor.current_page}</p>
                        <p className="text-xs text-muted-foreground truncate">{visitor.current_page}</p>
                      </div>
                      <Badge className="text-[9px] border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 shrink-0">
                        <Activity className="size-2.5 ml-1 animate-pulse" />
                        نشط
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {visitor.device_type === 'mobile' ? (
                        <Smartphone className="size-3" />
                      ) : visitor.device_type === 'tablet' ? (
                        <Tablet className="size-3" />
                      ) : (
                        <Monitor className="size-3" />
                      )}
                      <span>{visitor.browser}</span>
                      <span>·</span>
                      <span>{visitor.country || 'Unknown'}</span>
                      <span>·</span>
                      <span>{visitor.seconds_on_page || 0}ث</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Device Breakdown */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Monitor className="size-4" />
            توزيع الأجهزة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(deviceBreakdown).map(([device, count]) => {
              const Icon = device === 'mobile' ? Smartphone : device === 'tablet' ? Tablet : Monitor;
              const total = Object.values(deviceBreakdown).reduce((a, b) => a + b, 0);
              const percentage = Math.round((count / total) * 100);
              
              return (
                <div key={device} className="p-4 rounded-xl bg-accent/30 text-center">
                  <Icon className="size-8 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground capitalize">{device}</p>
                  <p className="text-xs text-primary font-semibold mt-1">{percentage}%</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
