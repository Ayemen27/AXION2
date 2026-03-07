/**
 * نظام إدارة الإكمال التلقائي الذكي
 * AutoComplete System Administration Interface
 */

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  AlertCircle, BarChart3, Settings, Trash2, RefreshCw,
  Database, Clock, Activity, TrendingUp, Shield,
  Sparkles, Zap, CheckCircle2, XCircle, Loader2,
} from 'lucide-react';

interface AutocompleteRecord {
  id: string;
  category: string;
  value: string;
  usageCount: number;
  lastUsedAt: string;
  createdAt: string;
}

interface CategoryStats {
  category: string;
  count: number;
  avgUsage: number;
  oldRecords: number;
}

const STORAGE_KEY = 'axion_autocomplete_records';
const CATEGORY_LIMIT = 100;
const OLD_RECORD_DAYS = 180; // 6 أشهر
const MIN_USAGE = 3;

function loadRecords(): AutocompleteRecord[] {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
}

function saveRecords(records: AutocompleteRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export default function AutocompleteAdminPage() {
  const { toast } = useToast();
  const [records, setRecords] = useState<AutocompleteRecord[]>(loadRecords);
  const [isMaintenanceRunning, setIsMaintenanceRunning] = useState(false);
  const [lastCleanup, setLastCleanup] = useState<Date | null>(null);

  useEffect(() => {
    saveRecords(records);
  }, [records]);

  // حساب الإحصائيات
  const stats = useMemo(() => {
    const categoriesMap = new Map<string, CategoryStats>();
    let oldRecordsCount = 0;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(sixMonthsAgo.getDate() - OLD_RECORD_DAYS);

    records.forEach(r => {
      if (!categoriesMap.has(r.category)) {
        categoriesMap.set(r.category, {
          category: r.category,
          count: 0,
          avgUsage: 0,
          oldRecords: 0,
        });
      }
      const cat = categoriesMap.get(r.category)!;
      cat.count++;
      cat.avgUsage += r.usageCount;

      // سجلات قديمة
      const lastUsed = new Date(r.lastUsedAt);
      if (lastUsed < sixMonthsAgo && r.usageCount < MIN_USAGE) {
        oldRecordsCount++;
        cat.oldRecords++;
      }
    });

    const categoryBreakdown = Array.from(categoriesMap.values()).map(c => ({
      ...c,
      avgUsage: c.count > 0 ? c.avgUsage / c.count : 0,
    }));

    return {
      totalRecords: records.length,
      categoriesCount: categoriesMap.size,
      categoryBreakdown,
      oldRecordsCount,
    };
  }, [records]);

  // تنظيف البيانات القديمة
  const handleCleanup = () => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(sixMonthsAgo.getDate() - OLD_RECORD_DAYS);

    const beforeCount = records.length;
    const cleaned = records.filter(r => {
      const lastUsed = new Date(r.lastUsedAt);
      return !(lastUsed < sixMonthsAgo && r.usageCount < MIN_USAGE);
    });

    setRecords(cleaned);
    const deletedCount = beforeCount - cleaned.length;
    setLastCleanup(new Date());

    toast({
      title: 'تم التنظيف بنجاح',
      description: `تم حذف ${deletedCount} سجل قديم`,
    });
  };

  // تطبيق حدود الفئات
  const handleEnforceLimits = (category?: string) => {
    let trimmedCount = 0;
    const categoriesToProcess = category
      ? [category]
      : Array.from(new Set(records.map(r => r.category)));

    let result = [...records];

    categoriesToProcess.forEach(cat => {
      const catRecords = result.filter(r => r.category === cat);
      if (catRecords.length > CATEGORY_LIMIT) {
        // ترتيب حسب الاستخدام والتاريخ
        catRecords.sort((a, b) => {
          if (a.usageCount !== b.usageCount) return b.usageCount - a.usageCount;
          return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
        });

        const toKeep = catRecords.slice(0, CATEGORY_LIMIT);
        const toRemove = catRecords.slice(CATEGORY_LIMIT);
        trimmedCount += toRemove.length;

        result = result.filter(r => !(r.category === cat && toRemove.includes(r)));
      }
    });

    setRecords(result);
    toast({
      title: 'تم تطبيق الحدود',
      description: `تم تقليم ${categoriesToProcess.length} فئة وحذف ${trimmedCount} سجل`,
    });
  };

  // صيانة شاملة
  const handleMaintenance = async () => {
    setIsMaintenanceRunning(true);
    
    // محاكاة عملية الصيانة
    await new Promise(r => setTimeout(r, 1500));

    // 1. تنظيف السجلات القديمة
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(sixMonthsAgo.getDate() - OLD_RECORD_DAYS);
    let cleaned = records.filter(r => {
      const lastUsed = new Date(r.lastUsedAt);
      return !(lastUsed < sixMonthsAgo && r.usageCount < MIN_USAGE);
    });

    // 2. تطبيق حدود الفئات
    const categories = Array.from(new Set(cleaned.map(r => r.category)));
    categories.forEach(cat => {
      const catRecords = cleaned.filter(r => r.category === cat);
      if (catRecords.length > CATEGORY_LIMIT) {
        catRecords.sort((a, b) => {
          if (a.usageCount !== b.usageCount) return b.usageCount - a.usageCount;
          return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
        });
        const toKeep = catRecords.slice(0, CATEGORY_LIMIT);
        cleaned = cleaned.filter(r => !(r.category === cat && !toKeep.includes(r)));
      }
    });

    const totalProcessed = records.length - cleaned.length;
    setRecords(cleaned);
    setLastCleanup(new Date());
    setIsMaintenanceRunning(false);

    toast({
      title: 'اكتملت الصيانة الشاملة',
      description: `معالجة ${totalProcessed} سجل بنجاح`,
    });
  };

  const formatNumber = (num: number) => new Intl.NumberFormat('ar-YE').format(num);

  const systemHealth = useMemo(() => {
    if (stats.totalRecords === 0) return 100;
    const efficiency = ((stats.totalRecords - stats.oldRecordsCount) / stats.totalRecords) * 100;
    return Math.round(efficiency);
  }, [stats]);

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">تحسين وتنظيف البيانات الذكية</p>
        <Button
          onClick={handleMaintenance}
          disabled={isMaintenanceRunning}
          className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
        >
          {isMaintenanceRunning ? (
            <><Loader2 className="size-4 animate-spin ml-1" /> جاري الصيانة...</>
          ) : (
            <><Zap className="size-4 ml-1" /> تشغيل الصيانة</>
          )}
        </Button>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="size-10 rounded-xl bg-blue-500 flex items-center justify-center">
                <Database className="size-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">إجمالي السجلات</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {formatNumber(stats.totalRecords)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="size-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                <BarChart3 className="size-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">عدد الفئات</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {formatNumber(stats.categoriesCount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="size-10 rounded-xl bg-amber-500 flex items-center justify-center">
                <AlertCircle className="size-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">سجلات قديمة</p>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {formatNumber(stats.oldRecordsCount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="size-10 rounded-xl bg-purple-500 flex items-center justify-center">
                {systemHealth >= 80 ? (
                  <CheckCircle2 className="size-5 text-white" />
                ) : (
                  <XCircle className="size-5 text-white" />
                )}
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">صحة النظام</p>
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {systemHealth}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health Card */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="size-5 text-primary" />
            كفاءة البيانات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">نسبة الكفاءة</span>
              <span className="font-bold text-primary">{systemHealth}%</span>
            </div>
            <Progress value={systemHealth} className="h-2" />
          </div>
          <Badge className={`text-xs ${systemHealth >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'} border-0`}>
            {systemHealth >= 80 ? 'ممتاز' : 'يحتاج تحسين'}
          </Badge>

          {stats.oldRecordsCount > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    يوجد {formatNumber(stats.oldRecordsCount)} سجل قديم
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    هذه السجلات لم تُستخدم لأكثر من 6 أشهر واستخدمت أقل من 3 مرات
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 text-xs h-7 rounded-lg border-amber-300 hover:bg-amber-100 dark:border-amber-700"
                    onClick={handleCleanup}
                  >
                    <Trash2 className="size-3 ml-1" /> تنظيف سريع
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="categories">
        <TabsList className="rounded-xl w-full">
          <TabsTrigger value="categories" className="rounded-lg flex-1">
            <BarChart3 className="size-3 ml-1" /> تفصيل الفئات
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="rounded-lg flex-1">
            <Settings className="size-3 ml-1" /> أدوات الصيانة
          </TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-3 mt-3">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">تفصيل الفئات</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs h-8"
                  onClick={() => handleEnforceLimits()}
                >
                  <Shield className="size-3 ml-1" /> تطبيق الحدود على الكل
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {stats.categoryBreakdown.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="size-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">لا توجد فئات محفوظة بعد</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.categoryBreakdown.map((cat, idx) => (
                    <div
                      key={idx}
                      className="bg-accent/40 rounded-xl p-3 hover:bg-accent/60 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{cat.category}</p>
                            <Badge
                              className={`text-[9px] border-0 ${
                                cat.count > 100
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  : cat.count > 50
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              }`}
                            >
                              {cat.count > 100 ? 'مرتفع' : cat.count > 50 ? 'متوسط' : 'منخفض'}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={cat.count > 100 ? 'destructive' : 'outline'}
                          className="text-xs h-7 rounded-lg"
                          onClick={() => handleEnforceLimits(cat.category)}
                        >
                          <Shield className="size-3 ml-1" /> تقليم
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <div className="bg-background/50 rounded-lg p-2 text-center">
                          <p className="text-[9px] text-muted-foreground">عدد السجلات</p>
                          <p className="text-xs font-bold">{formatNumber(cat.count)}</p>
                        </div>
                        <div className="bg-background/50 rounded-lg p-2 text-center">
                          <p className="text-[9px] text-muted-foreground">متوسط الاستخدام</p>
                          <p className="text-xs font-bold">{cat.avgUsage.toFixed(1)}</p>
                        </div>
                        <div className="bg-background/50 rounded-lg p-2 text-center">
                          <p className="text-[9px] text-muted-foreground">الحالة</p>
                          <p
                            className={`text-xs font-bold ${
                              cat.count > 100
                                ? 'text-red-600'
                                : cat.count > 50
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {cat.count > 100 ? 'يحتاج تقليم' : cat.count > 50 ? 'مراقبة' : 'صحي'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>الاستخدام</span>
                          <span>{Math.round((cat.count / CATEGORY_LIMIT) * 100)}%</span>
                        </div>
                        <Progress
                          value={(cat.count / CATEGORY_LIMIT) * 100}
                          className="h-1.5"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="space-y-3 mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Cleanup Card */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="size-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                    <Trash2 className="size-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">تنظيف البيانات القديمة</CardTitle>
                    <p className="text-xs text-muted-foreground">حذف السجلات غير المستخدمة</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  حذف السجلات التي لم تُستخدم لأكثر من 6 أشهر والمستخدمة أقل من 3 مرات
                </p>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">السجلات المستهدفة:</span>
                  <span className="text-sm font-bold text-red-600 dark:text-red-400">
                    {formatNumber(stats.oldRecordsCount)}
                  </span>
                </div>
                <Button
                  variant="outline"
                  className="w-full rounded-xl border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                  onClick={handleCleanup}
                >
                  <Trash2 className="size-4 ml-1" /> تشغيل التنظيف
                </Button>
              </CardContent>
            </Card>

            {/* Enforce Limits Card */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <Shield className="size-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">تطبيق حدود الفئات</CardTitle>
                    <p className="text-xs text-muted-foreground">الحد الأقصى 100 سجل لكل فئة</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  الاحتفاظ بأكثر السجلات استخداماً وحذف الباقي من الفئات الممتلئة
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">الفئات الممتلئة:</span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {stats.categoryBreakdown.filter(c => c.count > CATEGORY_LIMIT).length}
                  </span>
                </div>
                <Button
                  variant="outline"
                  className="w-full rounded-xl border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400"
                  onClick={() => handleEnforceLimits()}
                >
                  <Shield className="size-4 ml-1" /> تطبيق الحدود
                </Button>
              </CardContent>
            </Card>

            {/* Full Maintenance Card */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow md:col-span-2 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="size-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                    <Zap className="size-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">صيانة شاملة للنظام</CardTitle>
                    <p className="text-xs text-muted-foreground">تنظيف + تطبيق حدود + تحسين</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/50 dark:bg-black/20 rounded-lg p-2">
                    <p className="text-[10px] text-muted-foreground">آخر صيانة</p>
                    <p className="text-xs font-bold">
                      {lastCleanup
                        ? new Date(lastCleanup).toLocaleString('ar-YE', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : 'لم يتم بعد'}
                    </p>
                  </div>
                  <div className="bg-white/50 dark:bg-black/20 rounded-lg p-2">
                    <p className="text-[10px] text-muted-foreground">الحالة</p>
                    <p className="text-xs font-bold text-purple-600 dark:text-purple-400">
                      {isMaintenanceRunning ? 'جاري...' : 'جاهز'}
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  onClick={handleMaintenance}
                  disabled={isMaintenanceRunning}
                >
                  {isMaintenanceRunning ? (
                    <><Loader2 className="size-4 animate-spin ml-1" /> جاري التشغيل...</>
                  ) : (
                    <><Zap className="size-4 ml-1" /> تشغيل الصيانة الشاملة</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
