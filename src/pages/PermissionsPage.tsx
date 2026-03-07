/**
 * AXION — إدارة الصلاحيات v2.0
 * نظام صلاحيات على مستوى المشاريع — عزل كامل بين المستخدمين
 * Admin Only
 *
 * المستخدم العادي: يرى مشاريعه فقط (التي أنشأها)
 * المدير: يرى جميع المشاريع، قراءة/كتابة فقط، لا حذف
 * المسؤول: صلاحيات كاملة + يمنح وصولاً لمشاريع محددة لمستخدمين محددين
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import {
  Shield, User, Search, Eye, Edit, Trash2,
  CheckCircle2, XCircle, Loader2, RefreshCw,
  Lock, Unlock, AlertCircle, Users, ChevronDown, ChevronRight,
  Building2, Plus, Minus, Crown, Info, UserCheck, Settings,
  ShieldCheck, ShieldOff, Key, Globe,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface AppUser {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  role: 'admin' | 'manager' | 'user';
  is_active: boolean;
}

interface ProjectPermission {
  id?: string;
  project_id: string;
  user_id: string;
  granted_by?: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  created_at?: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
  created_by?: string;
  location?: string;
}

// ─── Permission Toggle Button ──────────────────────────────────────────────────
function PermBtn({
  value, onChange, icon: Icon, label, color, disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      title={label}
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 transition-all ${
        disabled
          ? 'opacity-30 cursor-not-allowed border-border bg-muted'
          : value
            ? `${color} border-current shadow-sm`
            : 'border-border bg-muted/30 text-muted-foreground hover:bg-accent hover:border-border'
      }`}
    >
      <Icon className={`size-4 ${value && !disabled ? '' : 'opacity-60'}`} />
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}

// ─── Project Permission Row ────────────────────────────────────────────────────
function ProjectPermRow({
  project,
  permission,
  onUpdate,
  onRevoke,
  saving,
  ownerName,
}: {
  project: Project;
  permission?: ProjectPermission;
  onUpdate: (projectId: string, field: keyof Omit<ProjectPermission, 'id' | 'project_id' | 'user_id' | 'granted_by' | 'created_at'>, value: boolean) => void;
  onRevoke: (projectId: string) => void;
  saving: boolean;
  ownerName?: string;
}) {
  const hasAccess = !!permission;
  const perm = permission || { can_read: false, can_write: false, can_delete: false };

  return (
    <div className={`rounded-xl border transition-all ${
      hasAccess
        ? 'border-primary/30 bg-primary/5'
        : 'border-border bg-card'
    }`}>
      {/* Project header */}
      <div className="flex items-center gap-3 p-3">
        <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${
          hasAccess ? 'bg-primary/10' : 'bg-muted'
        }`}>
          <Building2 className={`size-4 ${hasAccess ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold truncate">{project.name}</span>
            <Badge className={`text-[9px] border-0 ${
              project.status === 'active'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-muted text-muted-foreground'
            }`}>
              {project.status === 'active' ? 'نشط' : project.status === 'completed' ? 'مكتمل' : 'معلق'}
            </Badge>
          </div>
          {ownerName && (
            <p className="text-[10px] text-muted-foreground mt-0.5">المالك: {ownerName}</p>
          )}
          {project.location && (
            <p className="text-[10px] text-muted-foreground">📍 {project.location}</p>
          )}
        </div>

        {saving ? (
          <Loader2 className="size-4 animate-spin text-primary shrink-0" />
        ) : hasAccess ? (
          <button
            onClick={() => onRevoke(project.id)}
            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
            title="سحب الوصول"
          >
            <Minus className="size-4" />
          </button>
        ) : null}
      </div>

      {/* Permission controls */}
      {hasAccess && (
        <div className="px-3 pb-3">
          <div className="flex gap-2">
            <PermBtn
              value={perm.can_read}
              onChange={v => onUpdate(project.id, 'can_read', v)}
              icon={Eye}
              label="قراءة"
              color="bg-blue-50 text-blue-600 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700"
              disabled={saving}
            />
            <PermBtn
              value={perm.can_write}
              onChange={v => onUpdate(project.id, 'can_write', v)}
              icon={Edit}
              label="كتابة"
              color="bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700"
              disabled={saving}
            />
            <PermBtn
              value={perm.can_delete}
              onChange={v => onUpdate(project.id, 'can_delete', v)}
              icon={Trash2}
              label="حذف"
              color="bg-red-50 text-red-600 border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700"
              disabled={saving}
            />
          </div>
        </div>
      )}

      {/* Grant access button (if no access) */}
      {!hasAccess && (
        <div className="px-3 pb-3">
          <button
            onClick={() => onUpdate(project.id, 'can_read', true)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all"
          >
            <Plus className="size-3.5" /> منح وصول لهذا المشروع
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function PermissionsPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [users,          setUsers]          = useState<AppUser[]>([]);
  const [projects,       setProjects]       = useState<Project[]>([]);
  const [permissions,    setPermissions]    = useState<ProjectPermission[]>([]);
  const [userProfiles,   setUserProfiles]   = useState<Record<string, { username?: string; full_name?: string; email: string }>>({});
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState<string | null>(null); // `${userId}-${projectId}`
  const [search,         setSearch]         = useState('');
  const [projectSearch,  setProjectSearch]  = useState('');
  const [expandedUser,   setExpandedUser]   = useState<string | null>(null);
  const [activeTab,      setActiveTab]      = useState<'by-user' | 'by-project'>('by-user');
  const [roleDialog,     setRoleDialog]     = useState<AppUser | null>(null);
  const [newRole,        setNewRole]        = useState<'admin' | 'manager' | 'user'>('user');
  const [savingRole,     setSavingRole]     = useState(false);

  // ── Fetch all data ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [usersRes, projectsRes, permsRes] = await Promise.all([
      supabase.from('user_profiles').select('id,email,username,full_name,role,is_active').order('email'),
      supabase.from('projects').select('id,name,status,created_by,location').order('created_at', { ascending: false }),
      supabase.from('project_permissions').select('*'),
    ]);

    const usersData  = (usersRes.data  || []) as AppUser[];
    const profileMap: Record<string, { username?: string; full_name?: string; email: string }> = {};
    usersData.forEach(u => { profileMap[u.id] = { username: u.username, full_name: u.full_name, email: u.email }; });

    setUsers(usersData);
    setProjects((projectsRes.data || []) as Project[]);
    setPermissions((permsRes.data || []) as ProjectPermission[]);
    setUserProfiles(profileMap);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Permission helpers ──────────────────────────────────────────────────────
  const getUserPermissions = (userId: string) =>
    permissions.filter(p => p.user_id === userId);

  const getProjectPermissions = (projectId: string) =>
    permissions.filter(p => p.project_id === projectId);

  const getPermission = (userId: string, projectId: string) =>
    permissions.find(p => p.user_id === userId && p.project_id === projectId);

  // ── Send permission notification helper ────────────────────────────────────
  const sendPermissionNotif = async (
    userId: string,
    projectName: string,
    projectId: string,
    action: 'grant' | 'revoke',
    perms?: { can_read: boolean; can_write: boolean; can_delete: boolean },
  ) => {
    const permLabels = perms
      ? [
          perms.can_read   ? 'قراءة'  : null,
          perms.can_write  ? 'كتابة' : null,
          perms.can_delete ? 'حذف'   : null,
        ].filter(Boolean).join('، ')
      : '';

    const title = action === 'grant'
      ? `✅ تم منحك وصولاً لمشروع`
      : `🚫 تم سحب وصولك من مشروع`;

    const body = action === 'grant'
      ? `منحك المسؤول صلاحيات (${permLabels}) على مشروع: ${projectName}`
      : `تم سحب صلاحياتك من مشروع: ${projectName}`;

    await supabase.from('notifications').insert({
      user_id: userId,
      title,
      body,
      type:    'system',
      is_read: false,
      link:    `/projects`,
    });
  };

  // ── Update / Grant permission ───────────────────────────────────────────────
  const updatePermission = async (
    userId: string,
    projectId: string,
    field: 'can_read' | 'can_write' | 'can_delete',
    value: boolean,
  ) => {
    const key = `${userId}-${projectId}`;
    setSaving(key);

    const existing = getPermission(userId, projectId);
    const isNewGrant = !existing; // First time granting access
    const updated: ProjectPermission = {
      ...(existing || { can_read: false, can_write: false, can_delete: false }),
      project_id: projectId,
      user_id:    userId,
      granted_by: currentUser?.id,
      [field]: value,
    };

    // Auto-enable can_read when granting write or delete
    if ((field === 'can_write' || field === 'can_delete') && value) {
      updated.can_read = true;
    }

    const { data, error } = await supabase
      .from('project_permissions')
      .upsert({ ...updated, updated_at: new Date().toISOString() }, { onConflict: 'project_id,user_id' })
      .select()
      .single();

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      const newPerm = data as ProjectPermission;
      setPermissions(prev => {
        const idx = prev.findIndex(p => p.user_id === userId && p.project_id === projectId);
        return idx >= 0 ? prev.map((p, i) => i === idx ? newPerm : p) : [...prev, newPerm];
      });

      // Send notification only when first granting OR when toggling a permission ON
      if (isNewGrant || value === true) {
        const project = projects.find(p => p.id === projectId);
        if (project) {
          await sendPermissionNotif(userId, project.name, projectId, 'grant', {
            can_read:   newPerm.can_read,
            can_write:  newPerm.can_write,
            can_delete: newPerm.can_delete,
          });
        }
      }
    }
    setSaving(null);
  };

  // ── Revoke permission ───────────────────────────────────────────────────────
  const revokePermission = async (userId: string, projectId: string) => {
    const key = `${userId}-${projectId}`;
    setSaving(key);

    const project = projects.find(p => p.id === projectId);

    const { error } = await supabase
      .from('project_permissions')
      .delete()
      .eq('user_id', userId)
      .eq('project_id', projectId);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      setPermissions(prev => prev.filter(p => !(p.user_id === userId && p.project_id === projectId)));
      // Send revoke notification
      if (project) {
        await sendPermissionNotif(userId, project.name, projectId, 'revoke');
      }
      toast({ title: 'تم سحب الوصول' });
    }
    setSaving(null);
  };

  // ── Grant all projects read access ─────────────────────────────────────────
  const grantAllProjects = async (userId: string, level: 'read' | 'write') => {
    setSaving(`all-${userId}`);
    const rows = projects.map(p => ({
      project_id: p.id,
      user_id:    userId,
      granted_by: currentUser?.id,
      can_read:   true,
      can_write:  level === 'write',
      can_delete: false,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('project_permissions')
      .upsert(rows, { onConflict: 'project_id,user_id' });

    if (!error) {
      await fetchAll();
      const levelLabel = level === 'write' ? 'قراءة وكتابة' : 'قراءة';
      toast({ title: `✓ تم منح وصول ${levelLabel} لجميع المشاريع` });
      // Send single summary notification
      await supabase.from('notifications').insert({
        user_id: userId,
        title:   `✅ تم منحك وصولاً لجميع المشاريع`,
        body:    `منحك المسؤول صلاحيات ${levelLabel} على جميع المشاريع (${projects.length} مشروع)`,
        type:    'system',
        is_read: false,
        link:    '/projects',
      });
    }
    setSaving(null);
  };

  // ── Revoke all ─────────────────────────────────────────────────────────────
  const revokeAll = async (userId: string) => {
    setSaving(`revoke-${userId}`);
    const count = permissions.filter(p => p.user_id === userId).length;
    await supabase.from('project_permissions').delete().eq('user_id', userId);
    setPermissions(prev => prev.filter(p => p.user_id !== userId));
    // Send single revoke-all notification
    if (count > 0) {
      await supabase.from('notifications').insert({
        user_id: userId,
        title:   '🚫 تم سحب جميع صلاحياتك',
        body:    `قام المسؤول بسحب صلاحياتك من جميع المشاريع (${count} مشروع)`,
        type:    'system',
        is_read: false,
        link:    '/projects',
      });
    }
    toast({ title: '✓ تم سحب جميع صلاحيات المشاريع' });
    setSaving(null);
  };

  // ── Change role ─────────────────────────────────────────────────────────────
  const changeRole = async () => {
    if (!roleDialog) return;
    setSavingRole(true);
    const { error } = await supabase
      .from('user_profiles')
      .update({ role: newRole })
      .eq('id', roleDialog.id);
    if (!error) {
      setUsers(prev => prev.map(u => u.id === roleDialog.id ? { ...u, role: newRole } : u));
      toast({ title: `✓ تم تغيير الدور إلى "${newRole}"` });
      setRoleDialog(null);
    }
    setSavingRole(false);
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const roleBadge = (role: string) => ({
    admin:   { label: 'مسؤول',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', Icon: Crown },
    manager: { label: 'مدير',   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',   Icon: ShieldCheck },
    user:    { label: 'مستخدم', cls: 'bg-muted text-muted-foreground',                                       Icon: User },
  }[role] || { label: role, cls: 'bg-muted text-muted-foreground', Icon: User });

  const displayName = (u: AppUser) =>
    u.full_name || u.username || u.email.split('@')[0];

  const getOwnerName = (project: Project) => {
    if (!project.created_by) return undefined;
    const profile = userProfiles[project.created_by];
    return profile ? (profile.full_name || profile.username || profile.email.split('@')[0]) : undefined;
  };

  // ── Filtered lists ──────────────────────────────────────────────────────────
  const filteredUsers = useMemo(() =>
    users.filter(u =>
      u.role !== 'admin' && // Don't show admins (they have full access)
      (!search ||
        displayName(u).toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()))
    ), [users, search]);

  const filteredProjects = useMemo(() =>
    projects.filter(p =>
      !projectSearch ||
      p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      (p.location || '').toLowerCase().includes(projectSearch.toLowerCase())
    ), [projects, projectSearch]);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5" dir="rtl">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Shield className="size-5 text-primary" /> إدارة الصلاحيات
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {filteredUsers.length} مستخدم · {projects.length} مشروع · نظام عزل كامل
          </p>
        </div>
        <Button onClick={fetchAll} variant="outline" className="rounded-xl gap-2" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          تحديث
        </Button>
      </div>

      {/* ── Security Model Info ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[
          {
            icon: Crown,
            title: 'المسؤول',
            desc: 'وصول كامل لكل المشاريع والبيانات — غير قابل للتقييد',
            color: 'border-amber-300/50 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-700/30',
            textColor: 'text-amber-700 dark:text-amber-400',
          },
          {
            icon: ShieldCheck,
            title: 'المدير',
            desc: 'يرى ويعدّل جميع المشاريع — بدون حذف ولا إدارة نظام',
            color: 'border-blue-300/50 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-700/30',
            textColor: 'text-blue-700 dark:text-blue-400',
          },
          {
            icon: User,
            title: 'المستخدم',
            desc: 'يرى مشاريعه فقط (التي أنشأها) + مشاريع مفوّضة له بالصلاحيات',
            color: 'border-slate-300/50 bg-slate-50/50 dark:bg-slate-900/10 dark:border-slate-700/30',
            textColor: 'text-slate-700 dark:text-slate-400',
          },
        ].map(({ icon: Icon, title, desc, color, textColor }) => (
          <div key={title} className={`rounded-xl border p-3 flex items-start gap-2.5 ${color}`}>
            <Icon className={`size-4 shrink-0 mt-0.5 ${textColor}`} />
            <div>
              <p className={`text-xs font-bold ${textColor}`}>{title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
        <TabsList className="w-full rounded-xl h-10">
          <TabsTrigger value="by-user" className="flex-1 rounded-lg text-xs gap-1.5">
            <Users className="size-3.5" /> حسب المستخدم
          </TabsTrigger>
          <TabsTrigger value="by-project" className="flex-1 rounded-lg text-xs gap-1.5">
            <Building2 className="size-3.5" /> حسب المشروع
          </TabsTrigger>
        </TabsList>

        {/* ══ Tab 1: By User ════════════════════════════════════════════════════ */}
        <TabsContent value="by-user" className="mt-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو البريد..." className="pr-9 rounded-xl" />
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <Users className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">لا توجد مستخدمون</p>
                </div>
              )}

              {filteredUsers.map(user => {
                const rb = roleBadge(user.role);
                const RoleIcon = rb.Icon;
                const expanded = expandedUser === user.id;
                const isSelf = user.id === currentUser?.id;
                const userPerms = getUserPermissions(user.id);
                const accessibleCount = userPerms.length;
                const isManager = user.role === 'manager';

                return (
                  <div key={user.id} className={`rounded-xl border bg-card overflow-hidden transition-all ${
                    isSelf ? 'border-primary/30' : 'border-border'
                  }`}>
                    {/* User row */}
                    <div className="flex items-center gap-3 p-3">
                      <div className={`size-11 rounded-xl flex items-center justify-center shrink-0 text-base font-black ${
                        user.role === 'manager'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          : 'bg-accent text-muted-foreground'
                      }`}>
                        {displayName(user).charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold truncate">{displayName(user)}</span>
                          {isSelf && <Badge className="text-[9px] border-0 bg-primary/10 text-primary">أنت</Badge>}
                          <Badge className={`text-[9px] border-0 ${rb.cls} flex items-center gap-0.5`}>
                            <RoleIcon className="size-2.5" /> {rb.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {isManager ? (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">يرى جميع المشاريع تلقائياً</span>
                          ) : (
                            <span>
                              {accessibleCount > 0
                                ? <><span className="text-emerald-600 dark:text-emerald-400 font-semibold">{accessibleCount}</span> مشروع مفوّض</>
                                : <span className="text-muted-foreground">لا توجد صلاحيات مشاريع — يرى مشاريعه فقط</span>
                              }
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => { setRoleDialog(user); setNewRole(user.role); }}
                          className="rounded-lg h-8 text-xs gap-1 px-2">
                          <Settings className="size-3" /> الدور
                        </Button>
                        {!isManager && (
                          <button
                            onClick={() => setExpandedUser(expanded ? null : user.id)}
                            className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
                          >
                            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Manager info */}
                    {isManager && (
                      <div className="border-t border-border px-4 py-3 bg-blue-50/50 dark:bg-blue-900/10 flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400">
                        <Globe className="size-3.5 shrink-0" />
                        المدير يرى جميع المشاريع تلقائياً دون الحاجة لصلاحيات محددة. لتقييد وصوله، غيّر دوره إلى «مستخدم».
                      </div>
                    )}

                    {/* Expanded: project permissions */}
                    {expanded && !isManager && (
                      <div className="border-t border-border">
                        {/* Bulk actions */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-accent/20 border-b border-border/50 flex-wrap">
                          <span className="text-[11px] font-semibold text-muted-foreground flex-1">
                            صلاحيات المشاريع ({accessibleCount}/{projects.length})
                          </span>
                          <Button size="sm" variant="outline"
                            onClick={() => grantAllProjects(user.id, 'read')}
                            disabled={saving === `all-${user.id}`}
                            className="rounded-lg h-7 text-[11px] gap-1 px-2">
                            <Eye className="size-3" /> قراءة الكل
                          </Button>
                          <Button size="sm" variant="outline"
                            onClick={() => grantAllProjects(user.id, 'write')}
                            disabled={saving === `all-${user.id}`}
                            className="rounded-lg h-7 text-[11px] gap-1 px-2">
                            <Unlock className="size-3" /> كتابة الكل
                          </Button>
                          <Button size="sm" variant="outline"
                            onClick={() => revokeAll(user.id)}
                            disabled={saving === `revoke-${user.id}`}
                            className="rounded-lg h-7 text-[11px] gap-1 px-2 text-destructive hover:text-destructive">
                            <Lock className="size-3" /> سحب الكل
                          </Button>
                        </div>

                        {/* Project search */}
                        <div className="px-3 py-2">
                          <div className="relative">
                            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                            <Input
                              value={projectSearch}
                              onChange={e => setProjectSearch(e.target.value)}
                              placeholder="بحث في المشاريع..."
                              className="pr-8 rounded-lg h-8 text-xs"
                            />
                          </div>
                        </div>

                        {/* Projects list */}
                        <div className="px-3 pb-3 space-y-2 max-h-96 overflow-y-auto">
                          {filteredProjects.length === 0 && (
                            <p className="text-center text-xs text-muted-foreground py-4">لا توجد مشاريع</p>
                          )}
                          {filteredProjects.map(project => (
                            <ProjectPermRow
                              key={project.id}
                              project={project}
                              permission={getPermission(user.id, project.id)}
                              onUpdate={(pid, field, val) => updatePermission(user.id, pid, field, val)}
                              onRevoke={(pid) => revokePermission(user.id, pid)}
                              saving={saving === `${user.id}-${project.id}`}
                              ownerName={getOwnerName(project)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ══ Tab 2: By Project ═════════════════════════════════════════════════ */}
        <TabsContent value="by-project" className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={projectSearch} onChange={e => setProjectSearch(e.target.value)}
              placeholder="بحث في المشاريع..." className="pr-9 rounded-xl" />
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProjects.map(project => {
                const projectPerms = getProjectPermissions(project.id);
                const accessCount = projectPerms.length;
                const ownerName = getOwnerName(project);
                const expandedKey = `proj-${project.id}`;
                const expanded = expandedUser === expandedKey;

                return (
                  <div key={project.id} className="rounded-xl border bg-card overflow-hidden">
                    <div className="flex items-center gap-3 p-3">
                      <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="size-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold truncate">{project.name}</span>
                          <Badge className={`text-[9px] border-0 ${
                            project.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {project.status === 'active' ? 'نشط' : project.status === 'completed' ? 'مكتمل' : 'معلق'}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {ownerName && <span>المالك: {ownerName} · </span>}
                          {accessCount > 0
                            ? <span className="text-emerald-600 dark:text-emerald-400 font-medium">{accessCount} مستخدم لديه وصول</span>
                            : <span>لا أحد مفوّض — المالك فقط يصله</span>
                          }
                        </p>
                      </div>
                      <button
                        onClick={() => setExpandedUser(expanded ? null : expandedKey)}
                        className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
                      >
                        {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      </button>
                    </div>

                    {expanded && (
                      <div className="border-t border-border">
                        <div className="px-3 py-2 bg-accent/20 border-b border-border/50">
                          <p className="text-[11px] font-semibold text-muted-foreground">
                            المستخدمون الذين لديهم وصول لهذا المشروع
                          </p>
                        </div>
                        <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
                          {/* Users with access */}
                          {users
                            .filter(u => u.role === 'user')
                            .map(user => {
                              const perm = getPermission(user.id, project.id);
                              const savKey = `${user.id}-${project.id}`;

                              return (
                                <div key={user.id} className={`rounded-xl border p-3 transition-all ${
                                  perm ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'
                                }`}>
                                  <div className="flex items-center gap-2.5">
                                    <div className="size-8 rounded-lg bg-accent flex items-center justify-center text-xs font-bold shrink-0">
                                      {displayName(user).charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold truncate">{displayName(user)}</p>
                                      <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                                    </div>

                                    {saving === savKey ? (
                                      <Loader2 className="size-4 animate-spin text-primary shrink-0" />
                                    ) : perm ? (
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {/* Quick perm pills */}
                                        <button
                                          onClick={() => updatePermission(user.id, project.id, 'can_read', !perm.can_read)}
                                          className={`size-6 rounded flex items-center justify-center transition-colors ${perm.can_read ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-muted text-muted-foreground'}`}
                                          title="قراءة"
                                        >
                                          <Eye className="size-3.5" />
                                        </button>
                                        <button
                                          onClick={() => updatePermission(user.id, project.id, 'can_write', !perm.can_write)}
                                          className={`size-6 rounded flex items-center justify-center transition-colors ${perm.can_write ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-muted text-muted-foreground'}`}
                                          title="كتابة"
                                        >
                                          <Edit className="size-3.5" />
                                        </button>
                                        <button
                                          onClick={() => updatePermission(user.id, project.id, 'can_delete', !perm.can_delete)}
                                          className={`size-6 rounded flex items-center justify-center transition-colors ${perm.can_delete ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-muted text-muted-foreground'}`}
                                          title="حذف"
                                        >
                                          <Trash2 className="size-3.5" />
                                        </button>
                                        <button
                                          onClick={() => revokePermission(user.id, project.id)}
                                          className="size-6 rounded flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                          title="سحب الوصول"
                                        >
                                          <XCircle className="size-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => updatePermission(user.id, project.id, 'can_read', true)}
                                        className="flex items-center gap-1 text-[11px] text-primary hover:underline px-2 py-1 rounded-lg hover:bg-primary/5 transition-colors"
                                      >
                                        <Plus className="size-3" /> منح وصول
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Role Change Dialog ── */}
      <Dialog open={!!roleDialog} onOpenChange={o => { if (!o) setRoleDialog(null); }}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="size-5 text-primary" /> تغيير دور المستخدم
            </DialogTitle>
          </DialogHeader>
          {roleDialog && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-accent flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary">
                  {displayName(roleDialog).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold">{displayName(roleDialog)}</p>
                  <p className="text-xs text-muted-foreground">{roleDialog.email}</p>
                </div>
              </div>
              <div className="space-y-2">
                {([
                  { role: 'user',    label: 'مستخدم عادي',  desc: 'يرى مشاريعه فقط + ما تمنحه بالصلاحيات أدناه',         icon: User,        color: 'border-slate-300 dark:border-slate-600' },
                  { role: 'manager', label: 'مدير',          desc: 'يرى ويعدّل جميع المشاريع — بدون صلاحية الحذف أو إدارة النظام', icon: ShieldCheck, color: 'border-blue-400 dark:border-blue-600' },
                  { role: 'admin',   label: 'مسؤول كامل',   desc: 'يتحكم في كل شيء بما فيها المستخدمون والنظام',         icon: Crown,       color: 'border-amber-400 dark:border-amber-600' },
                ] as const).map(({ role, label, desc, icon: RoleIcon, color }) => (
                  <button key={role} onClick={() => setNewRole(role as any)}
                    className={`w-full text-right p-3 rounded-xl border-2 transition-all flex items-start gap-2.5 ${
                      newRole === role ? `${color} bg-accent` : 'border-border hover:bg-accent/50'
                    }`}>
                    <RoleIcon className={`size-4 mt-0.5 shrink-0 ${newRole === role ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="text-sm font-semibold">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    {newRole === role && <CheckCircle2 className="size-4 text-primary mr-auto shrink-0 mt-0.5" />}
                  </button>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialog(null)} className="rounded-xl">إلغاء</Button>
            <Button onClick={changeRole} disabled={savingRole} className="rounded-xl gap-2">
              {savingRole ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              حفظ الدور
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
