/**
 * نظام مقارنة المزامنة
 * Sync Comparison System
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  RefreshCw, CheckCircle, AlertCircle, Database,
  Table2, ChevronDown, ChevronRight, Server,
  HardDrive, Activity, TrendingUp, Zap,
} from 'lucide-react';

interface TableComparison {
  tableName: string;
  localCount: number;
  status: 'synced' | 'has_data' | 'empty';
  lastSync?: string;
}

const TABLE_NAMES = [
  { key: 'axion_projects', label: 'المشاريع' },
  { key: 'axion_workers', label: 'العمال' },
  { key: 'axion_attendance', label: 'الحضور' },
  { key: 'axion_expenses', label: 'المصروفات' },
  { key: 'axion_purchases', label: 'المشتريات' },
  { key: 'axion_suppliers', label: 'الموردين' },
  { key: 'axion_worker_transfers', label: 'حوالات العمال' },
  { key: 'axion_worker_misc_expenses', label: 'نثريات العمال' },
  { key: 'axion_fund_custody', label: 'العهدة اليومية' },
  { key: 'axion_wells', label: 'الآبار' },
  { key: 'axion_customers', label: 'الزبائن' },
  { key: 'axion_supplier_payments', label: 'دفعات الموردين' },
  { key: 'axion_equipment', label: 'المعدات' },
  { key: 'axion_autocomplete_records', label: 'سجلات الإكمال التلقائي' },
  { key: 'axion_backup_logs', label: 'سجلات النسخ الاحتياطي' },
  { key: 'axion_ai_sessions', label: 'جلسات الذكاء الاصطناعي' },
];

export default function SyncComparisonPage() {
  const { toast } = useToast();
  const [comparisons, setComparisons] = useState<TableComparison[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'synced' | 'has_data' | 'empty'>('all');

  const loadComparison = async () => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 800));

    const results: TableComparison[] = TABLE_NAMES.map(({ key, label }) => {
      const data = localStorage.getItem(key);
      let count = 0;
      
      if (data) {
        try {
          const parsed = JSON.parse(data);
          count = Array.isArray(parsed) ? parsed.length : 0;
        } catch {
          count = 0;
        }
      }

      return {
        tableName: label,
        localCount: count,
        status: count > 0 ? 'has_data' : 'empty',
        lastSync: count > 0 ? new Date().toISOString() : undefined,
      };
    });

    setComparisons(results);
    setIsLoading(false);
    toast({ title: 'تم التحديث', description: `فحص ${results.length} جدول` });
  };

  const filtered = useMemo(() => {
    return comparisons.filter(c => {
      const matchesSearch = c.tableName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterStatus === 'all' || c.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [comparisons, searchQuery, filterStatus]);

  const stats = useMemo(() => ({
    total: comparisons.length,
    hasData: comparisons.filter(c => c.status === 'has_data').length,
    empty: comparisons.filter(c => c.status === 'empty').length,
    totalRecords: comparisons.reduce((s, c) => s + c.localCount, 0),
  }), [comparisons]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">فحص وتحليل البيانات المحلية</p>
        <Button
          onClick={loadComparison}
          disabled={isLoading}
          className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          {isLoading ? (
            <><RefreshCw className="size-4 animate-spin ml-1" /> جاري الفحص...</>
          ) : (
            <><RefreshCw className="size-4 ml-1" /> فحص البيانات</>
          )}
        </Button>
      </div>

      {comparisons.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Database className="size-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">اضغط على "فحص البيانات" لبدء التحليل</p>
            <Button onClick={loadComparison} className="rounded-xl">
              <Zap className="size-4 ml-1" /> بدء الفحص
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'إجمالي الجداول', value: stats.total, icon: Table2, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
              { label: 'تحتوي بيانات', value: stats.hasData, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
              { label: 'فارغة', value: stats.empty, icon: AlertCircle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
              { label: 'إجمالي السجلات', value: stats.totalRecords.toLocaleString('ar-YE'), icon: Activity, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
            ].map(c => (
              <Card key={c.label} className="border-0 shadow-sm">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`size-9 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
                    <c.icon className={`size-4 ${c.color}`} />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">{c.label}</p>
                    <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث في الجداول..."
              className="flex-1 min-w-[180px] rounded-xl"
            />
            {(['all', 'has_data', 'empty'] as const).map(status => (
              <Button
                key={status}
                variant={filterStatus === status ? 'default' : 'outline'}
                onClick={() => setFilterStatus(status)}
                className="rounded-xl text-xs"
              >
                {status === 'all' ? 'الكل' : status === 'has_data' ? 'بها بيانات' : 'فارغة'}
              </Button>
            ))}
          </div>

          {/* Tables List */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Table2 className="size-5 text-primary" />
                تفاصيل الجداول ({filtered.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filtered.map((comp, idx) => (
                  <div
                    key={idx}
                    className="bg-accent/40 rounded-xl p-3 hover:bg-accent/60 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <button
                          onClick={() => setExpandedTable(expandedTable === comp.tableName ? null : comp.tableName)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {expandedTable === comp.tableName ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </button>
                        <div className="size-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                          <Table2 className="size-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">{comp.tableName}</p>
                          <p className="text-xs text-muted-foreground">
                            {comp.localCount} سجل محلي
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={`text-[9px] border-0 ${
                          comp.status === 'has_data'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400'
                        }`}>
                          {comp.status === 'has_data' ? (
                            <><CheckCircle className="size-2.5 ml-1" /> بها بيانات</>
                          ) : (
                            <><AlertCircle className="size-2.5 ml-1" /> فارغ</>
                          )}
                        </Badge>
                      </div>
                    </div>

                    {expandedTable === comp.tableName && (
                      <div className="mt-3 pt-3 border-t border-border space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-background/50 rounded-lg p-2">
                            <p className="text-[10px] text-muted-foreground">عدد السجلات</p>
                            <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                              {comp.localCount.toLocaleString('ar-YE')}
                            </p>
                          </div>
                          <div className="bg-background/50 rounded-lg p-2">
                            <p className="text-[10px] text-muted-foreground">آخر تحديث</p>
                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                              {comp.lastSync
                                ? new Date(comp.lastSync).toLocaleDateString('ar-YE', { day: 'numeric', month: 'short' })
                                : '---'}
                            </p>
                          </div>
                        </div>
                        {comp.status === 'empty' && (
                          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2 text-xs text-amber-700 dark:text-amber-400">
                            هذا الجدول فارغ حالياً. ابدأ بإضافة البيانات من الصفحة المخصصة.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {filtered.length === 0 && (
                  <div className="text-center py-8">
                    <Table2 className="size-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">لا توجد جداول تطابق البحث</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
