/**
 * صفحة الإشعارات — مع دعم إشعارات الموافقة بأزرار قبول/رفض مباشرة
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { notificationService, type AppNotification } from '@/services/extraServices';
import { formatDate } from '@/constants/config';
import {
  Bell, Receipt, Building2, AlertTriangle,
  Settings, CheckCheck, Loader2, RefreshCw, Trash2,
  UserCheck, Clock, ThumbsUp, ThumbsDown, Shield,
  CheckCircle2, XCircle, User, Calendar,
} from 'lucide-react';

// ─── Icon & color maps ──────────────────────────────────────────────────────
const typeIcons: Record<string, React.ElementType> = {
  financial: Receipt,
  project:   Building2,
  alert:     AlertTriangle,
  system:    Settings,
  approval:  UserCheck,
};

const typeColors: Record<string, string> = {
  financial: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  project:   'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  alert:     'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  system:    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  approval:  'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
};

// ─── Types ──────────────────────────────────────────────────────────────────
interface PendingUser {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
}

// ─── Approval Notification Card ─────────────────────────────────────────────
function ApprovalCard({
  notification,
  onApprove,
  onReject,
  onDelete,
  onMarkRead,
  processing,
}: {
  notification: AppNotification;
  onApprove: (notifId: string, userId: string) => void;
  onReject: (notifId: string, userId: string) => void;
  onDelete: (id: string) => void;
  onMarkRead: (id: string) => void;
  processing: string | null;
}) {
  // Extract user email from body ("طلب انضمام بانتظار الموافقة: email@...")
  const emailMatch = notification.body.match(/:\s*(.+)$/);
  const userEmail = emailMatch?.[1]?.trim() ?? '';

  const [userId, setUserId] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<PendingUser | null>(null);

  useEffect(() => {
    if (!userEmail) return;
    supabase
      .from('user_profiles')
      .select('id, email, username, full_name, is_approved')
      .eq('email', userEmail)
      .single()
      .then(({ data }) => {
        if (data) {
          setUserId(data.id);
          setUserInfo(data as PendingUser);
        }
      });
  }, [userEmail]);

  // Pending request: title contains 'طلب تسجيل' (not an approval/rejection response)
  const isApprovalRequest = notification.type === 'approval' && notification.title.includes('طلب تسجيل');
  const isApproved        = notification.title.includes('تمت الموافقة') || notification.title.includes('تم قبول');
  const isRejected        = notification.title.includes('تم رفض');
  const processingThis    = processing === userId;

  return (
    <Card className={`border-0 shadow-sm transition-all ${
      !notification.is_read
        ? 'border-r-4 border-r-amber-500 bg-amber-50/30 dark:bg-amber-900/10'
        : 'opacity-80 hover:opacity-100'
    }`}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
            isApproved ? 'bg-emerald-100 dark:bg-emerald-900/30' :
            isRejected ? 'bg-red-100 dark:bg-red-900/30' :
                         'bg-amber-100 dark:bg-amber-900/30'
          }`}>
            {isApproved ? <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" /> :
             isRejected ? <XCircle      className="size-5 text-red-600 dark:text-red-400" /> :
                          <Clock        className="size-5 text-amber-600 dark:text-amber-400 animate-pulse" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold">{notification.title}</p>
              <div className="flex items-center gap-1.5 shrink-0">
                {!notification.is_read && (
                  <span className="size-2 rounded-full bg-amber-500 shrink-0" />
                )}
                <button
                  onClick={() => onDelete(notification.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{notification.body}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{formatDate(notification.created_at)}</p>
          </div>
        </div>

        {/* User Info Card (for pending requests) */}
        {isApprovalRequest && userInfo && (
          <div className="p-2.5 rounded-lg bg-amber-100/60 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0 text-sm font-bold text-amber-700 dark:text-amber-400">
              {(userInfo.username || userInfo.full_name || userInfo.email).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate text-amber-800 dark:text-amber-300">
                {userInfo.username || userInfo.full_name || userEmail.split('@')[0]}
              </p>
              <p className="text-[11px] text-amber-700/70 dark:text-amber-500 truncate">{userInfo.email}</p>
            </div>
            <Badge className="text-[9px] border-0 bg-amber-200 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 shrink-0">
              <Clock className="size-2.5 ml-1" /> معلّق
            </Badge>
          </div>
        )}

        {/* Action Buttons (only for pending requests with known userId) */}
        {isApprovalRequest && userId && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => { onMarkRead(notification.id); onApprove(notification.id, userId); }}
              disabled={processingThis}
              className="flex-1 rounded-xl h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {processingThis
                ? <Loader2 className="size-3.5 animate-spin" />
                : <ThumbsUp className="size-3.5" />
              }
              قبول الطلب
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { onMarkRead(notification.id); onReject(notification.id, userId); }}
              disabled={processingThis}
              className="flex-1 rounded-xl h-9 text-xs gap-1.5 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              {processingThis
                ? <Loader2 className="size-3.5 animate-spin" />
                : <ThumbsDown className="size-3.5" />
              }
              رفض الطلب
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Generic Notification Card ───────────────────────────────────────────────
function NotifCard({
  n,
  onMarkRead,
  onDelete,
}: {
  n: AppNotification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  // استخراج معلومات العملية من body الإشعار
  const parseNotificationDetails = (body: string) => {
    // نموذج: "تم حذف سجل حضور للعامل: [اسم] من المشروع: [مشروع] بتاريخ: [تاريخ]"
    const userMatch = body.match(/بواسطة المستخدم:\s*([^·|،]+)/);
    const projectMatch = body.match(/من المشروع:\s*([^·|،]+)/);
    const dateMatch = body.match(/بتاريخ:\s*([^·|،]+)/);
    const timeMatch = body.match(/الساعة:\s*([^·|،]+)/);
    const operationMatch = body.match(/^(تم إضافة|تم تعديل|تم حذف|تم قبول|تم رفض)/);
    
    return {
      user: userMatch?.[1]?.trim() || null,
      project: projectMatch?.[1]?.trim() || null,
      recordDate: dateMatch?.[1]?.trim() || null,
      operationTime: timeMatch?.[1]?.trim() || null,
      operationType: operationMatch?.[1] || null,
    };
  };

  const details = parseNotificationDetails(n.body);
  
  // تحديد اللون والأيقونة حسب نوع العملية
  const getOperationStyle = () => {
    const title = n.title.toLowerCase();
    const body = n.body.toLowerCase();
    
    if (title.includes('إضافة') || title.includes('جديد') || body.includes('تم إضافة')) {
      return {
        icon: CheckCircle2,
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        text: 'text-emerald-600 dark:text-emerald-400',
        badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        borderColor: 'border-r-emerald-500',
        label: 'إضافة',
      };
    }
    
    if (title.includes('تعديل') || title.includes('تحديث') || body.includes('تم تعديل')) {
      return {
        icon: Settings,
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-600 dark:text-blue-400',
        badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        borderColor: 'border-r-blue-500',
        label: 'تعديل',
      };
    }
    
    if (title.includes('حذف') || body.includes('تم حذف')) {
      return {
        icon: Trash2,
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-600 dark:text-red-400',
        badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        borderColor: 'border-r-red-500',
        label: 'حذف',
      };
    }
    
    // افتراضي للإشعارات الأخرى
    const Icon = typeIcons[n.type] || Bell;
    return {
      icon: Icon,
      bg: typeColors[n.type] || typeColors.system,
      text: '',
      badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      borderColor: 'border-r-primary',
      label: n.type === 'financial' ? 'مالي' : n.type === 'project' ? 'مشروع' : n.type === 'alert' ? 'تنبيه' : 'نظام',
    };
  };

  const opStyle = getOperationStyle();
  const Icon = opStyle.icon;

  return (
    <Card
      className={`border-0 shadow-sm transition-all cursor-pointer hover:shadow-md ${
        !n.is_read ? `border-r-4 ${opStyle.borderColor}` : 'opacity-75 hover:opacity-100'
      }`}
      onClick={() => !n.is_read && onMarkRead(n.id)}
    >
      <CardContent className="p-3.5 space-y-2.5">
        {/* Header Section */}
        <div className="flex items-start gap-3">
          <div className={`size-10 rounded-xl ${opStyle.bg} flex items-center justify-center shrink-0`}>
            <Icon className={`size-5 ${opStyle.text || ''}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold leading-snug">{n.title}</p>
              <div className="flex items-center gap-1.5 shrink-0">
                {!n.is_read && <span className="size-2 rounded-full bg-primary shrink-0" />}
                <button
                  onClick={e => { e.stopPropagation(); onDelete(n.id); }}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
            <Badge className={`text-[9px] border-0 mt-1 ${opStyle.badge}`}>
              {opStyle.label}
            </Badge>
          </div>
        </div>

        {/* Details Grid */}
        {(details.user || details.project || details.recordDate || details.operationTime) && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            {details.user && (
              <div className="bg-accent/40 rounded-lg px-2.5 py-1.5">
                <p className="text-[9px] text-muted-foreground">المستخدم</p>
                <p className="text-xs font-semibold truncate">{details.user}</p>
              </div>
            )}
            {details.project && (
              <div className="bg-accent/40 rounded-lg px-2.5 py-1.5">
                <p className="text-[9px] text-muted-foreground">المشروع</p>
                <p className="text-xs font-semibold truncate">{details.project}</p>
              </div>
            )}
            {details.recordDate && (
              <div className="bg-accent/40 rounded-lg px-2.5 py-1.5">
                <p className="text-[9px] text-muted-foreground">تاريخ السجل</p>
                <p className="text-xs font-semibold">{details.recordDate}</p>
              </div>
            )}
            {details.operationTime && (
              <div className="bg-accent/40 rounded-lg px-2.5 py-1.5">
                <p className="text-[9px] text-muted-foreground">وقت العملية</p>
                <p className="text-xs font-semibold">{details.operationTime}</p>
              </div>
            )}
          </div>
        )}

        {/* Body Text */}
        <p className="text-xs text-muted-foreground leading-relaxed">{n.body}</p>

        {/* Timestamp */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1">
          <Clock className="size-3" />
          {formatDate(n.created_at)}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<'all' | 'approval' | 'system'>('all');

  // Check admin
  useEffect(() => {
    if (!user?.id) return;
    supabase.from('user_profiles').select('role').eq('id', user.id).single()
      .then(({ data }) => setIsAdmin(data?.role === 'admin'));
  }, [user?.id]);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await notificationService.getAll(user.id);
    setNotifications(data);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // ── Derived lists ──────────────────────────────────────────────────────────
  const approvalNotifs = notifications.filter(n => n.type === 'approval');
  const systemNotifs   = notifications.filter(n => n.type !== 'approval');
  const unreadCount    = notifications.filter(n => !n.is_read).length;
  // Pending = approval notifications that are requests (not responses) and unread
  const pendingCount   = approvalNotifs.filter(n =>
    n.title.includes('طلب تسجيل') && !n.is_read
  ).length;

  const currentList =
    tab === 'approval' ? approvalNotifs :
    tab === 'system'   ? systemNotifs   :
    notifications;

  // ── Actions ────────────────────────────────────────────────────────────────
  const markAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    setMarkingAll(true);
    await notificationService.markAllAsRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setMarkingAll(false);
    toast({ title: 'تم', description: 'تم تحديد جميع الإشعارات كمقروءة' });
  };

  const deleteNotification = async (id: string) => {
    await notificationService.delete(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast({ title: 'تم الحذف', description: 'تم حذف الإشعار' });
  };

  // ── Approve User directly from notification ────────────────────────────────
  const approveUser = async (notifId: string, userId: string) => {
    setProcessing(userId);

    // 1. Update user status immediately
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_approved: true, is_active: true })
      .eq('id', userId);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      setProcessing(null);
      return;
    }

    // 2. Get user info
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email, full_name, username')
      .eq('id', userId)
      .single();

    // 3. Send in-app notification to approved user
    await supabase.from('notifications').insert({
      user_id: userId,
      title:   'تمت الموافقة على حسابك ✅',
      body:    'تهانينا! تمت الموافقة على حسابك في AXION. يمكنك الآن تسجيل الدخول والبدء باستخدام النظام.',
      type:    'approval',
      link:    '/',
    });

    // 4. Mark the admin's request notification as read
    await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);

    // 5. Send email notification (fire-and-forget)
    supabase.functions.invoke('send-email', {
      body: {
        type:     'approval',
        to:       profile?.email,
        userName: profile?.full_name || profile?.username || profile?.email?.split('@')[0],
      },
    }).catch(() => null);

    toast({ title: '✓ تمت الموافقة', description: `تم قبول حساب ${profile?.email ?? ''}` });
    await fetchNotifications();
    setProcessing(null);
  };

  // ── Reject User directly from notification ─────────────────────────────────
  const rejectUser = async (notifId: string, userId: string) => {
    setProcessing(userId);

    // 1. Get user info first
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email, full_name, username')
      .eq('id', userId)
      .single();

    // 2. Send in-app notification to rejected user BEFORE deactivating
    await supabase.from('notifications').insert({
      user_id: userId,
      title:   'تم رفض طلب التسجيل ❌',
      body:    'نأسف، تم رفض طلب تسجيلك في AXION. للاستفسار تواصل مع مسؤول النظام.',
      type:    'approval',
    });

    // 3. Deactivate account
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active: false, is_approved: false })
      .eq('id', userId);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      setProcessing(null);
      return;
    }

    // 4. Mark the admin's request notification as read
    await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);

    // 5. Send email notification (fire-and-forget)
    supabase.functions.invoke('send-email', {
      body: {
        type:     'rejection',
        to:       profile?.email,
        userName: profile?.full_name || profile?.username || profile?.email?.split('@')[0],
      },
    }).catch(() => null);

    toast({ title: 'تم الرفض', description: `تم رفض حساب ${profile?.email ?? ''}`, variant: 'destructive' });
    await fetchNotifications();
    setProcessing(null);
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40 rounded-xl" />
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bell className="size-5 text-primary" /> الإشعارات
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {unreadCount > 0
              ? <><span className="text-primary font-semibold">{unreadCount}</span> غير مقروء</>
              : 'جميعها مقروءة'}
            {pendingCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                {' '}· {pendingCount} طلب موافقة بانتظارك
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5" onClick={fetchNotifications}>
            <RefreshCw className="size-3.5" /> تحديث
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5" onClick={markAllAsRead} disabled={markingAll}>
              {markingAll ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCheck className="size-3.5" />}
              تحديد الكل
            </Button>
          )}
        </div>
      </div>

      {/* Pending Approval Banner */}
      {pendingCount > 0 && isAdmin && (
        <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 flex items-center gap-3">
          <div className="size-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <Clock className="size-5 text-amber-600 dark:text-amber-400 animate-pulse" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
              {pendingCount} طلب تسجيل بانتظار موافقتك
            </p>
            <p className="text-xs text-amber-600/80 dark:text-amber-500">
              يمكنك القبول أو الرفض مباشرة من هنا
            </p>
          </div>
          <Button size="sm" onClick={() => setTab('approval')}
            className="rounded-xl h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white shrink-0">
            مراجعة
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={v => setTab(v as any)}>
        <TabsList className="w-full rounded-xl h-10">
          <TabsTrigger value="all" className="flex-1 rounded-lg text-xs gap-1.5">
            <Bell className="size-3.5" /> الكل
            {unreadCount > 0 && (
              <Badge className="text-[9px] border-0 bg-primary/10 text-primary">{unreadCount}</Badge>
            )}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="approval" className="flex-1 rounded-lg text-xs gap-1.5">
              <UserCheck className="size-3.5" /> الموافقات
              {pendingCount > 0 && (
                <Badge className="text-[9px] border-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="system" className="flex-1 rounded-lg text-xs gap-1.5">
            <Shield className="size-3.5" /> النظام
          </TabsTrigger>
        </TabsList>

        {/* ── All & System Tabs ─────────────────────────────────────────────── */}
        {(['all', 'system'] as const).map(tabKey => (
          <TabsContent key={tabKey} value={tabKey} className="mt-4 space-y-2">
            {currentList.length === 0 && tab === tabKey ? (
              <div className="text-center py-16">
                <Bell className="size-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm font-semibold text-muted-foreground">لا توجد إشعارات</p>
              </div>
            ) : tab === tabKey ? (
              <>
                {currentList.filter(n => !n.is_read).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-muted-foreground px-1">
                      جديد ({currentList.filter(n => !n.is_read).length})
                    </p>
                    {currentList.filter(n => !n.is_read).map(n =>
                      n.type === 'approval' ? (
                        <ApprovalCard key={n.id} notification={n}
                          onApprove={approveUser} onReject={rejectUser}
                          onDelete={deleteNotification} onMarkRead={markAsRead}
                          processing={processing}
                        />
                      ) : (
                        <NotifCard key={n.id} n={n} onMarkRead={markAsRead} onDelete={deleteNotification} />
                      )
                    )}
                  </div>
                )}
                {currentList.filter(n => n.is_read).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-muted-foreground px-1">
                      سابق ({currentList.filter(n => n.is_read).length})
                    </p>
                    {currentList.filter(n => n.is_read).map(n =>
                      n.type === 'approval' ? (
                        <ApprovalCard key={n.id} notification={n}
                          onApprove={approveUser} onReject={rejectUser}
                          onDelete={deleteNotification} onMarkRead={markAsRead}
                          processing={processing}
                        />
                      ) : (
                        <NotifCard key={n.id} n={n} onMarkRead={markAsRead} onDelete={deleteNotification} />
                      )
                    )}
                  </div>
                )}
              </>
            ) : null}
          </TabsContent>
        ))}

        {/* ── Approval Tab ──────────────────────────────────────────────────── */}
        {isAdmin && (
          <TabsContent value="approval" className="mt-4 space-y-2">
            {approvalNotifs.length === 0 ? (
              <div className="text-center py-16">
                <UserCheck className="size-12 text-emerald-400/30 mx-auto mb-3" />
                <p className="text-sm font-semibold text-muted-foreground">لا توجد طلبات موافقة</p>
                <p className="text-xs text-muted-foreground mt-1">جميع طلبات التسجيل تمت مراجعتها</p>
              </div>
            ) : (
              <>
                {/* Pending requests first */}
                {approvalNotifs.filter(n => !n.is_read && n.title.includes('طلب تسجيل')).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-muted-foreground px-1">
                      بانتظار المراجعة ({approvalNotifs.filter(n => !n.is_read && n.title.includes('طلب تسجيل')).length})
                    </p>
                    {approvalNotifs
                      .filter(n => !n.is_read && n.title.includes('طلب تسجيل'))
                      .map(n => (
                        <ApprovalCard key={n.id} notification={n}
                          onApprove={approveUser} onReject={rejectUser}
                          onDelete={deleteNotification} onMarkRead={markAsRead}
                          processing={processing}
                        />
                      ))
                    }
                  </div>
                )}

                {/* Already actioned */}
                {approvalNotifs.filter(n => n.is_read || !n.title.includes('طلب تسجيل')).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-muted-foreground px-1">
                      سابق ({approvalNotifs.filter(n => n.is_read || !n.title.includes('طلب تسجيل')).length})
                    </p>
                    {approvalNotifs
                      .filter(n => n.is_read || !n.title.includes('طلب تسجيل'))
                      .map(n => (
                        <ApprovalCard key={n.id} notification={n}
                          onApprove={approveUser} onReject={rejectUser}
                          onDelete={deleteNotification} onMarkRead={markAsRead}
                          processing={processing}
                        />
                      ))
                    }
                  </div>
                )}
              </>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
