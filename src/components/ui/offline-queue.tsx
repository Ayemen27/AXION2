/**
 * Offline Queue - قائمة العمليات المعلقة
 */

import { useState } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Clock, Trash2, RefreshCw, AlertCircle,
  CheckCircle, XCircle, Loader2, Database,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

export function OfflineQueue() {
  const {
    pendingOperations,
    isSyncing,
    syncPendingOperations,
    deletePendingOperation,
    clearAllOperations,
  } = useOfflineSync();

  const [open, setOpen] = useState(false);

  if (pendingOperations.length === 0) return null;

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'create': return <CheckCircle className="size-4 text-emerald-600" />;
      case 'update': return <RefreshCw className="size-4 text-blue-600" />;
      case 'delete': return <XCircle className="size-4 text-red-600" />;
      default: return <AlertCircle className="size-4" />;
    }
  };

  const getOperationLabel = (type: string) => {
    switch (type) {
      case 'create': return 'إضافة';
      case 'update': return 'تعديل';
      case 'delete': return 'حذف';
      default: return 'عملية';
    }
  };

  const getEntityLabel = (entity: string) => {
    const labels: Record<string, string> = {
      project: 'مشروع',
      worker: 'عامل',
      expense: 'مصروف',
      purchase: 'مشتريات',
      attendance: 'حضور',
      customer: 'عميل',
      supplier: 'مورد',
    };
    return labels[entity] || entity;
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
        >
          <Database className="size-4 ml-1" />
          عمليات معلقة
          <Badge className="mr-1 size-5 rounded-full p-0 flex items-center justify-center bg-amber-600 text-white text-[10px]">
            {pendingOperations.length}
          </Badge>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Database className="size-5 text-amber-600" />
            قائمة العمليات المعلقة
          </SheetTitle>
          <SheetDescription>
            العمليات التي تم حفظها محلياً وستتم مزامنتها عند الاتصال بالإنترنت
          </SheetDescription>
        </SheetHeader>

        <div className="my-4 space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto">
          {pendingOperations.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="size-12 text-emerald-500/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">لا توجد عمليات معلقة</p>
              <p className="text-xs text-muted-foreground mt-1">جميع البيانات متزامنة</p>
            </div>
          ) : (
            pendingOperations.map((operation) => (
              <Card key={operation.id} className="border-0 shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="size-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
                      {getOperationIcon(operation.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="text-[9px] border-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          {getOperationLabel(operation.type)}
                        </Badge>
                        <span className="text-xs font-medium">
                          {getEntityLabel(operation.entity)}
                        </span>
                      </div>
                      {operation.data?.name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {operation.data.name}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="size-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(operation.timestamp, { addSuffix: true, locale: ar })}
                        </span>
                        {operation.retryCount > 0 && (
                          <Badge className="text-[9px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">
                            محاولة {operation.retryCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => deletePendingOperation(operation.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <SheetFooter className="border-t pt-4 flex-col sm:flex-col gap-2">
          <Button
            onClick={syncPendingOperations}
            disabled={isSyncing || pendingOperations.length === 0}
            className="w-full rounded-xl"
          >
            {isSyncing ? (
              <>
                <Loader2 className="size-4 ml-2 animate-spin" />
                جاري المزامنة...
              </>
            ) : (
              <>
                <RefreshCw className="size-4 ml-2" />
                مزامنة الآن ({pendingOperations.length})
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={clearAllOperations}
            disabled={pendingOperations.length === 0}
            className="w-full rounded-xl text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-4 ml-2" />
            مسح الكل
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
