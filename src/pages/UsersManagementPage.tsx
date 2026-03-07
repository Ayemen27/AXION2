/**
 * صفحة إدارة المستخدمين — مع نظام موافقة المسؤول
 * Admin Only — يجلب المستخدمين الحقيقيين من user_profiles
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import {
  Search, Users, ShieldCheck, Edit,
  User, Crown, CheckCircle, Mail,
  Shield, RefreshCw, Loader2, Clock,
  UserCheck, UserX, AlertCircle, Bell,
  ThumbsUp, ThumbsDown, XCircle,
} from 'lucide-react';

interface AppUser {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  role: 'admin' | 'manager' | 'user';
  is_active: boolean;
  is_approved: boolean;
  last_login?: string;
}

export default function UsersManagementPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const [users,       setUsers]       = useState<AppUser[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editRole,    setEditRole]    = useState<AppUser['role']>('user');
  const [saving,      setSaving]      = useState(false);
  const [approving,   setApproving]   = useState<string | null>(null);
  const [tab,         setTab]         = useState<'approved' | 'pending'>('approved');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('email', { ascending: true });
    if (error) {
      toast({ title: 'خطأ', description: 'فشل تحميل المستخدمين', variant: 'destructive' });
    } else {
      setUsers((data ?? []) as AppUser[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const approvedUsers = useMemo(() => users.filter(u => u.is_approved !== false), [users]);
  const pendingUsers  = useMemo(() => users.filter(u => u.is_approved === false), [users]);

  const filtered = useMemo(() => {
    const list = tab === 'pending' ? pendingUsers : approvedUsers;
    return list.filter(u =>
      !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [users, search, tab, approvedUsers, pendingUsers]);

  // ── Approve User ───────────────────────────────────────────────────────────
  const approveUser = async (u: AppUser) => {
    setApproving(u.id);
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_approved: true, is_active: true })
      .eq('id', u.id);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      // 1. Send in-app notification
      await supabase.from('notifications').insert({
        user_id: u.id,
        title:   'تمت الموافقة على حسابك ✓',
        body:    'تهانينا! تمت الموافقة على حسابك في AXION. يمكنك الآن تسجيل الدخول والبدء باستخدام النظام.',
        type:    'approval',
        link:    '/login',
      });

      // 2. Send email notification
      supabase.functions.invoke('send-email', {
        body: {
          type:     'approval',
          to:       u.email,
          userName: u.full_name || u.username || u.email.split('@')[0],
        },
      }).then(({ data }) => {
        if (data?.sent) console.log('[users] Approval email sent to', u.email);
        else console.log('[users] Email not sent (no provider configured):', data?.message);
      });

      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_approved: true, is_active: true } : x));
      toast({ title: '✓ تمت الموافقة', description: `تم قبول حساب ${u.email}` });
    }
    setApproving(null);
  };

  // ── Reject / Deactivate User ───────────────────────────────────────────────
  const rejectUser = async (u: AppUser) => {
    setApproving(u.id + '-reject');

    // 1. Send in-app notification first
    await supabase.from('notifications').insert({
      user_id: u.id,
      title:   'تم رفض طلب التسجيل',
      body:    'نأسف، تم رفض طلب تسجيلك في AXION. للاستفسار تواصل مع مسؤول النظام.',
      type:    'approval',
    });

    // 2. Send email notification
    supabase.functions.invoke('send-email', {
      body: {
        type:     'rejection',
        to:       u.email,
        userName: u.full_name || u.username || u.email.split('@')[0],
      },
    }).then(({ data }) => {
      if (data?.sent) console.log('[users] Rejection email sent to', u.email);
    });

    // 3. Deactivate account
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active: false, is_approved: false })
      .eq('id', u.id);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: false, is_approved: false } : x));
      toast({ title: 'تم الرفض', description: `تم رفض وتعطيل حساب ${u.email}`, variant: 'destructive' });
    }
    setApproving(null);
  };

  // ── Deactivate Active User ─────────────────────────────────────────────────
  const toggleActive = async (u: AppUser) => {
    const newVal = !u.is_active;
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active: newVal })
      .eq('id', u.id);
    if (!error) {
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: newVal } : x));
      toast({ title: newVal ? 'تم التفعيل' : 'تم التعطيل', description: u.email });
    }
  };

  // ── Open Edit Dialog ───────────────────────────────────────────────────────
  const openEdit = (u: AppUser) => {
    setEditingUser(u);
    setEditUsername(u.username || u.full_name || '');
    setEditRole(u.role);
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setSaving(true);
    const { error } = await supabase
      .from('user_profiles')
      .update({ username: editUsername, full_name: editUsername, role: editRole })
      .eq('id', editingUser.id);
    setSaving(false);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم الحفظ', description: 'تم تحديث بيانات المستخدم' });
      setUsers(prev => prev.map(u =>
        u.id === editingUser.id ? { ...u, username: editUsername, full_name: editUsername, role: editRole } : u
      ));
      setEditingUser(null);
    }
  };

  const roleBadge = (role: string) => ({
    admin:   { label: 'مسؤول',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    manager: { label: 'مدير',   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    user:    { label: 'مستخدم', cls: 'bg-muted text-muted-foreground' },
  }[role] ?? { label: role, cls: 'bg-muted text-muted-foreground' });

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Users className="size-5 text-primary" /> إدارة المستخدمين
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {approvedUsers.length} مفعّل
            {pendingUsers.length > 0 && <span className="text-amber-600 dark:text-amber-400 font-semibold"> · {pendingUsers.length} بانتظار الموافقة</span>}
          </p>
        </div>
        <Button onClick={fetchUsers} variant="outline" className="rounded-xl gap-2" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          تحديث
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي المستخدمين',    value: users.length,          icon: Users,       color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
          { label: 'بانتظار الموافقة',      value: pendingUsers.length,   icon: Clock,       color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-900/20',  alert: pendingUsers.length > 0 },
          { label: 'مفعّلون',               value: approvedUsers.filter(u => u.is_active).length, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'معطّلون',               value: users.filter(u => !u.is_active).length,        icon: UserX,     color: 'text-rose-600',    bg: 'bg-rose-50 dark:bg-rose-900/20' },
        ].map(c => (
          <Card key={c.label} className={`border-0 shadow-sm ${c.alert ? 'ring-2 ring-amber-400/50' : ''}`}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`size-9 rounded-lg ${c.bg} flex items-center justify-center shrink-0 relative`}>
                <c.icon className={`size-4 ${c.color}`} />
                {c.alert && <span className="absolute -top-1 -right-1 size-2.5 bg-amber-500 rounded-full animate-pulse" />}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">{c.label}</p>
                <p className={`text-lg font-black ${c.color}`}>{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending Alert Banner */}
      {pendingUsers.length > 0 && (
        <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 flex items-center gap-3">
          <Bell className="size-5 text-amber-500 shrink-0 animate-pulse" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
              {pendingUsers.length} مستخدم بانتظار موافقتك
            </p>
            <p className="text-xs text-amber-600/80 dark:text-amber-500/80">
              المستخدمون المعلّقون لا يستطيعون الوصول للنظام حتى تقبلهم
            </p>
          </div>
          <Button size="sm" onClick={() => setTab('pending')}
            className="rounded-xl h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white shrink-0">
            مراجعة الطلبات
          </Button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو البريد الإلكتروني..."
          className="pr-9 rounded-xl"
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={v => setTab(v as any)}>
        <TabsList className="w-full rounded-xl h-10">
          <TabsTrigger value="approved" className="flex-1 rounded-lg text-xs gap-1.5">
            <UserCheck className="size-3.5" /> المفعّلون
            <Badge className="text-[9px] border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              {approvedUsers.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex-1 rounded-lg text-xs gap-1.5 relative">
            <Clock className="size-3.5" /> بانتظار الموافقة
            {pendingUsers.length > 0 && (
              <Badge className="text-[9px] border-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                {pendingUsers.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Approved Users Tab ──────────────────────────────────────────── */}
        <TabsContent value="approved" className="mt-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(user => {
                const rb = roleBadge(user.role);
                const isSelf = user.id === currentUser?.id;
                return (
                  <Card key={user.id}
                    className={`border-0 shadow-sm hover:shadow-md transition-all ${isSelf ? 'ring-2 ring-primary/30' : ''} ${!user.is_active ? 'opacity-60' : ''}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className={`size-11 rounded-xl flex items-center justify-center shrink-0 text-lg font-black ${
                          isSelf                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                          user.role === 'admin'   ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                          user.role === 'manager' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                                                    'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                        }`}>
                          {(user.username || user.full_name || user.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-sm font-bold truncate">
                              {user.username || user.full_name || user.email.split('@')[0]}
                            </h3>
                            {isSelf && (
                              <Badge className="text-[9px] border-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                <Crown className="size-2.5 ml-1" /> أنت
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <Badge className={`text-[9px] border-0 ${rb.cls}`}>{rb.label}</Badge>
                            {user.is_active
                              ? <Badge className="text-[9px] border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"><CheckCircle className="size-2.5 ml-1" />مفعّل</Badge>
                              : <Badge className="text-[9px] border-0 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"><XCircle className="size-2.5 ml-1" />معطّل</Badge>
                            }
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Mail className="size-3 shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Shield className="size-3 shrink-0" />
                          <span className="font-mono text-[10px] truncate">{user.id.split('-')[0]}…</span>
                        </div>
                      </div>

                      {!isSelf && (
                        <div className="flex gap-1.5 pt-1 border-t border-border">
                          <Button variant="outline" size="sm" onClick={() => openEdit(user)}
                            className="flex-1 text-xs rounded-lg h-8 gap-1">
                            <Edit className="size-3" /> تعديل
                          </Button>
                          <Button variant="outline" size="sm"
                            onClick={() => toggleActive(user)}
                            className={`flex-1 text-xs rounded-lg h-8 gap-1 ${user.is_active ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20' : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}>
                            {user.is_active ? <><UserX className="size-3" /> تعطيل</> : <><UserCheck className="size-3" /> تفعيل</>}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-16">
              <Users className="size-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">لا توجد نتائج</p>
            </div>
          )}
        </TabsContent>

        {/* ── Pending Users Tab ───────────────────────────────────────────── */}
        <TabsContent value="pending" className="mt-4">
          {pendingUsers.length === 0 && !loading ? (
            <div className="text-center py-16">
              <CheckCircle className="size-12 text-emerald-400/40 mx-auto mb-3" />
              <p className="text-base font-semibold text-muted-foreground">لا توجد طلبات معلّقة</p>
              <p className="text-sm text-muted-foreground mt-1">جميع المستخدمين تمت الموافقة عليهم</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Info */}
              <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/10 flex items-start gap-2.5 text-xs text-blue-300">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>
                  هذه الحسابات سجّلت ولكن لم تتم الموافقة عليها بعد. المستخدمون <strong>لا يستطيعون</strong> استخدام النظام حتى تقبلهم.
                </span>
              </div>

              {filtered.map(user => (
                <Card key={user.id} className="border-0 shadow-sm border-amber-200 dark:border-amber-900/40 ring-1 ring-amber-300/40">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="size-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-lg font-black text-amber-700 dark:text-amber-400 shrink-0">
                        {(user.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">
                          {user.username || user.full_name || user.email.split('@')[0]}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        <Badge className="text-[9px] border-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 mt-1">
                          <Clock className="size-2.5 ml-1" /> بانتظار الموافقة
                        </Badge>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => approveUser(user)}
                          disabled={approving === user.id}
                          className="rounded-xl h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3"
                        >
                          {approving === user.id
                            ? <Loader2 className="size-3.5 animate-spin" />
                            : <ThumbsUp className="size-3.5" />
                          }
                          قبول
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectUser(user)}
                          disabled={approving === user.id + '-reject'}
                          className="rounded-xl h-9 text-xs gap-1.5 border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400 dark:hover:bg-rose-900/20 px-3"
                        >
                          {approving === user.id + '-reject'
                            ? <Loader2 className="size-3.5 animate-spin" />
                            : <ThumbsDown className="size-3.5" />
                          }
                          رفض
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={open => { if (!open) setEditingUser(null); }}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="size-4 text-primary" /> تعديل بيانات المستخدم
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">البريد الإلكتروني</Label>
              <Input value={editingUser?.email || ''} disabled className="rounded-xl bg-accent mt-1.5" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">الاسم</Label>
              <Input
                value={editUsername}
                onChange={e => setEditUsername(e.target.value)}
                placeholder="أدخل الاسم"
                className="rounded-xl mt-1.5"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">الدور</Label>
              <Select value={editRole} onValueChange={(v: AppUser['role']) => setEditRole(v)}>
                <SelectTrigger className="rounded-xl mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">مستخدم عادي</SelectItem>
                  <SelectItem value="manager">مدير</SelectItem>
                  <SelectItem value="admin">مسؤول (Admin)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)} className="rounded-xl">إلغاء</Button>
            <Button onClick={handleSave} disabled={saving} className="rounded-xl">
              {saving ? <Loader2 className="size-4 animate-spin" /> : 'حفظ التغييرات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
