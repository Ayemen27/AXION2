/**
 * نظام النسخ الاحتياطي المتقدم
 * Advanced Backup Manager with Local Storage
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Database, Download, RotateCcw, ShieldCheck, History,
  HardDrive, RefreshCw, FileText, Loader2, Trash2,
  Calendar, CheckCircle2, Clock, Archive, Activity,
  Server, FileArchive, Upload, Sparkles, Zap,
} from 'lucide-react';

interface BackupLog {
  id: string;
  filename: string;
  size: string;
  sizeBytes: number;
  compressed: boolean;
  created_at: string;
  tablesCount: number;
  totalRows: number;
  created_by: string;
}

const STORAGE_KEY_BACKUPS = 'axion_backup_logs';

function loadBackups(): BackupLog[] {
  const saved = localStorage.getItem(STORAGE_KEY_BACKUPS);
  return saved ? JSON.parse(saved) : [];
}

function saveBackups(backups: BackupLog[]) {
  localStorage.setItem(STORAGE_KEY_BACKUPS, JSON.stringify(backups));
}

// حساب حجم البيانات في localStorage
function calculateStorageSize() {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return total;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export default function BackupManagerPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [backups, setBackups] = useState<BackupLog[]>(loadBackups);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const storageInfo = useMemo(() => {
    const used = calculateStorageSize();
    const limit = 5 * 1024 * 1024; // 5MB تقريباً (حد localStorage)
    return {
      used,
      limit,
      usedFormatted: formatBytes(used),
      limitFormatted: formatBytes(limit),
      percentage: Math.round((used / limit) * 100),
    };
  }, [backups]);

  const stats = useMemo(() => {
    return {
      total: backups.length,
      totalSize: backups.reduce((s, b) => s + b.sizeBytes, 0),
      lastBackup: backups.length > 0 ? backups[0].created_at : null,
    };
  }, [backups]);

  // إنشاء نسخة احتياطية
  const handleCreateBackup = async () => {
    setIsCreating(true);

    // محاكاة عملية النسخ
    await new Promise(r => setTimeout(r, 2000));

    const allData: Record<string, any> = {};
    const tablesList = [
      'axion_projects',
      'axion_workers',
      'axion_attendance',
      'axion_expenses',
      'axion_purchases',
      'axion_suppliers',
      'axion_worker_transfers',
      'axion_worker_misc_expenses',
      'axion_fund_custody',
      'axion_wells',
      'axion_customers',
    ];

    let totalRows = 0;
    tablesList.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          allData[key] = parsed;
          totalRows += Array.isArray(parsed) ? parsed.length : 0;
        } catch (e) {
          allData[key] = data;
        }
      }
    });

    const backupData = JSON.stringify(allData);
    const sizeBytes = new Blob([backupData]).size;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `backup_${timestamp}_${Date.now()}.json`;

    const newBackup: BackupLog = {
      id: 'backup_' + Date.now(),
      filename,
      size: formatBytes(sizeBytes),
      sizeBytes,
      compressed: false,
      created_at: new Date().toISOString(),
      tablesCount: Object.keys(allData).length,
      totalRows,
      created_by: user?.full_name || 'مستخدم',
    };

    const updated = [newBackup, ...backups];
    setBackups(updated);
    saveBackups(updated);

    // حفظ البيانات في localStorage مؤقتاً
    localStorage.setItem(`backup_${newBackup.id}`, backupData);

    setIsCreating(false);
    toast({
      title: 'تم النسخ الاحتياطي بنجاح',
      description: `${newBackup.tablesCount} جدول | ${newBackup.totalRows} صف | ${newBackup.size}`,
    });
  };

  // تنزيل نسخة احتياطية
  const handleDownload = (backup: BackupLog) => {
    const data = localStorage.getItem(`backup_${backup.id}`);
    if (!data) {
      toast({
        title: 'خطأ',
        description: 'البيانات غير متوفرة',
        variant: 'destructive',
      });
      return;
    }

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backup.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'تم التنزيل',
      description: `تم تنزيل ${backup.filename}`,
    });
  };

  // حذف نسخة
  const handleDelete = (id: string) => {
    const updated = backups.filter(b => b.id !== id);
    setBackups(updated);
    saveBackups(updated);
    localStorage.removeItem(`backup_${id}`);
    toast({ title: 'تم الحذف', description: 'تم حذف النسخة الاحتياطية' });
  };

  // استعادة نسخة
  const handleRestore = (backup: BackupLog) => {
    const data = localStorage.getItem(`backup_${backup.id}`);
    if (!data) {
      toast({
        title: 'خطأ',
        description: 'البيانات غير متوفرة',
        variant: 'destructive',
      });
      return;
    }

    try {
      const parsed = JSON.parse(data);
      Object.keys(parsed).forEach(key => {
        localStorage.setItem(key, JSON.stringify(parsed[key]));
      });

      toast({
        title: 'تمت الاستعادة بنجاح',
        description: 'سيتم إعادة تحميل الصفحة...',
      });

      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      toast({
        title: 'فشل الاستعادة',
        description: 'حدث خطأ في البيانات',
        variant: 'destructive',
      });
    }
  };

  const filteredBackups = useMemo(() => {
    return backups.filter(b =>
      b.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.created_by.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [backups, searchQuery]);

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">حماية واستعادة البيانات</p>
        <Button
          onClick={handleCreateBackup}
          disabled={isCreating}
          className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          {isCreating ? (
            <><Loader2 className="size-4 animate-spin ml-1" /> جاري النسخ...</>
          ) : (
            <><Database className="size-4 ml-1" /> إنشاء نسخة احتياطية</>
          )}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-blue-500 flex items-center justify-center">
                <FileArchive className="size-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">عدد النسخ</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {stats.total}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                <HardDrive className="size-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">حجم النسخ</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {formatBytes(stats.totalSize)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-purple-500 flex items-center justify-center">
                <Activity className="size-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">التخزين المستخدم</p>
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {storageInfo.percentage}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-amber-500 flex items-center justify-center">
                <Clock className="size-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">آخر نسخة</p>
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  {stats.lastBackup
                    ? new Date(stats.lastBackup).toLocaleDateString('ar-YE', { day: 'numeric', month: 'short' })
                    : 'لا يوجد'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Storage Info */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HardDrive className="size-5 text-primary" />
            معلومات التخزين
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">المساحة المستخدمة</span>
            <span className="font-bold">
              {storageInfo.usedFormatted} / {storageInfo.limitFormatted}
            </span>
          </div>
          <div className="h-3 bg-accent rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                storageInfo.percentage > 80
                  ? 'bg-red-500'
                  : storageInfo.percentage > 60
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
            />
          </div>
          {storageInfo.percentage > 80 && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 border border-red-200 dark:border-red-800">
              <p className="text-xs text-red-700 dark:text-red-400">
                ⚠️ التخزين ممتلئ تقريباً. احذف بعض النسخ القديمة.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <FileText className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="بحث في النسخ الاحتياطية..."
          className="pr-9 rounded-xl"
        />
      </div>

      {/* Backups List */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="size-5 text-primary" />
            سجل النسخ الاحتياطية ({filteredBackups.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredBackups.length === 0 ? (
            <div className="text-center py-16">
              <FileArchive className="size-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">لا توجد نسخ احتياطية</p>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={handleCreateBackup}
                disabled={isCreating}
              >
                <Database className="size-4 ml-1" /> إنشاء أول نسخة
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBackups.map(backup => (
                <div
                  key={backup.id}
                  className="bg-accent/40 rounded-xl p-3 hover:bg-accent/60 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                        <FileArchive className="size-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{backup.filename}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="size-2.5" />
                            {new Date(backup.created_at).toLocaleString('ar-YE', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            بواسطة: {backup.created_by}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-[10px]">
                      {backup.size}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-background/50 rounded-lg p-2 text-center">
                      <p className="text-[9px] text-muted-foreground">الجداول</p>
                      <p className="text-xs font-bold">{backup.tablesCount}</p>
                    </div>
                    <div className="bg-background/50 rounded-lg p-2 text-center">
                      <p className="text-[9px] text-muted-foreground">الصفوف</p>
                      <p className="text-xs font-bold">{backup.totalRows}</p>
                    </div>
                    <div className="bg-background/50 rounded-lg p-2 text-center">
                      <p className="text-[9px] text-muted-foreground">الحجم</p>
                      <p className="text-xs font-bold">{backup.size}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 rounded-lg text-xs h-8 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400"
                      onClick={() => handleDownload(backup)}
                    >
                      <Download className="size-3 ml-1" /> تنزيل
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 rounded-lg text-xs h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
                      onClick={() => handleRestore(backup)}
                    >
                      <RotateCcw className="size-3 ml-1" /> استعادة
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg text-xs h-8 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(backup.id)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
