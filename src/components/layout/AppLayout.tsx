import { useState, useEffect, useRef, useCallback } from 'react';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useHaptic } from '@/hooks/useHaptic';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { ADMIN_ONLY_ROUTES } from '@/components/layout/ProtectedRoute';

const ADMIN_NAV_PATHS = new Set(ADMIN_ONLY_ROUTES);
const MANAGER_NAV_PATHS = new Set(['/reports']);
import { useSelectedProject } from '@/hooks/useSelectedProject';
import { useProjects } from '@/hooks/useCloudData';
import { ConnectionIndicator } from '@/components/ui/connection-indicator';
import { OfflineQueue } from '@/components/ui/offline-queue';
import { PullToRefreshIndicator } from '@/components/ui/pull-to-refresh-indicator';
import {
  LayoutDashboard,
  Building2,
  Users,
  Receipt,
  Bell,
  Settings,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  ChevronLeft,
  Truck,
  ShieldCheck,
  ShoppingCart,
  ClipboardCheck,
  Wallet,
  CheckCircle,
  XCircle,
  Droplets,
  Wrench,
  BarChart3,
  UserCheck,
  Sparkles,
  Archive,
  Brain,
  Radar,
  Users2,
  GitBranch,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import axionLogo from '@/assets/axion-logo.png';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'لوحة التحكم' },
  { path: '/projects', icon: Building2, label: 'المشاريع' },
  { path: '/workers', icon: Users, label: 'العمال' },
  { path: '/expenses', icon: Receipt, label: 'المصروفات' },
  { path: '/purchases', icon: ShoppingCart, label: 'شراء المواد' },
  { path: '/suppliers', icon: Truck, label: 'الموردين' },
  { path: '/attendance', icon: ClipboardCheck, label: 'الحضور' },
  { path: '/worker-accounts', icon: Wallet, label: 'حسابات العمال' },
  { path: '/wells', icon: Droplets, label: 'الآبار' },
  { path: '/equipment', icon: Wrench, label: 'المعدات' },
  { path: '/customers', icon: UserCheck, label: 'الزبائن' },
  { path: '/reports', icon: BarChart3, label: 'التقارير' },
  { path: '/analytics', icon: TrendingUp, label: 'التحليلات', submenu: [
    { path: '/analytics', label: 'نظرة عامة' },
    { path: '/analytics/realtime', label: 'الزوار الحاليين' },
    { path: '/analytics/behavior', label: 'سلوك المستخدم' },
  ]},
  { path: '/git-manager', icon: GitBranch, label: 'Git Manager' },
  { path: '/autocomplete-admin', icon: Sparkles, label: 'الإكمال التلقائي' },
  { path: '/backup-manager', icon: Archive, label: 'النسخ الاحتياطي' },
  { path: '/ai-chat', icon: Brain, label: 'المساعد الذكي' },
  { path: '/sync-comparison', icon: Radar, label: 'مقارنة البيانات' },
  { path: '/users-management', icon: Users2, label: 'المستخدمون' },
  { path: '/permissions', icon: ShieldCheck, label: 'الصلاحيات' },
  { path: '/setup', icon: Settings, label: 'معالج الإعداد' },
  { path: '/settings', icon: Settings, label: 'الإعدادات' },
  { path: '/notifications', icon: Bell, label: 'الإشعارات' },
];

const bottomNavItems = [navItems[0], navItems[3], navItems[6], navItems[4], navItems[11]];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { user, logout, dbRole } = useAuth();
  const isAdmin   = dbRole === 'admin';
  const isManager = dbRole === 'admin' || dbRole === 'manager';

  // Filter nav items based on role
  const visibleNavItems = navItems.filter(item => {
    if (ADMIN_NAV_PATHS.has(item.path)) return isAdmin;
    if (MANAGER_NAV_PATHS.has(item.path)) return isManager;
    return true;
  });
  const { isDark, toggle } = useTheme();
  const { selectedProjectId, selectProject } = useSelectedProject();
  const { projects } = useProjects();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { selection, vibrate, notification } = useHaptic();

  // ─── Pull-to-refresh on .layout-main (the real scroller) ───────────────
  const [ptrPullDist, setPtrPullDist]   = useState(0);
  const [ptrRefreshing, setPtrRefreshing] = useState(false);
  const ptrIsPulling   = useRef(false);
  const ptrIsRefreshing = useRef(false);
  const ptrTouchStartY = useRef(0);
  const PTR_THRESHOLD  = 80;

  const ptrProgress = Math.min((ptrPullDist / PTR_THRESHOLD) * 100, 100);

  const isModalOpen = useCallback(() =>
    document.body.hasAttribute('data-drawer-open') ||
    !!document.querySelector('[role="dialog"][data-state="open"]'), []);

  useEffect(() => {
    const scrollEl = document.querySelector('.layout-main') as HTMLElement | null;
    if (!scrollEl) return;

    const onTouchStart = (e: TouchEvent) => {
      ptrTouchStartY.current = e.touches[0].clientY;
      ptrIsPulling.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (ptrIsRefreshing.current || isModalOpen()) return;
      const deltaY = e.touches[0].clientY - ptrTouchStartY.current;
      const atTop  = scrollEl.scrollTop <= 0;
      if (deltaY > 0 && atTop) {
        ptrIsPulling.current = true;
        e.preventDefault();
        const damped = Math.min(deltaY * 0.45, PTR_THRESHOLD * 1.5);
        setPtrPullDist(damped);
      } else {
        if (ptrIsPulling.current) { ptrIsPulling.current = false; setPtrPullDist(0); }
      }
    };

    const onTouchEnd = async () => {
      if (!ptrIsPulling.current) return;
      const dist = ptrIsPulling.current ? ptrPullDistRef.current : 0;
      ptrIsPulling.current = false;
      if (dist >= PTR_THRESHOLD && !ptrIsRefreshing.current) {
        ptrIsRefreshing.current = true;
        setPtrRefreshing(true);
        setPtrPullDist(PTR_THRESHOLD);
        vibrate('medium');
        window.dispatchEvent(new CustomEvent('ptr-refresh'));
        await new Promise<void>(resolve => setTimeout(resolve, 800));
        ptrIsRefreshing.current = false;
        setPtrRefreshing(false);
        setPtrPullDist(0);
        notification('success');
      } else {
        setPtrPullDist(0);
      }
    };

    scrollEl.addEventListener('touchstart', onTouchStart, { passive: true });
    scrollEl.addEventListener('touchmove',  onTouchMove,  { passive: false });
    scrollEl.addEventListener('touchend',   onTouchEnd,   { passive: true });
    return () => {
      scrollEl.removeEventListener('touchstart', onTouchStart);
      scrollEl.removeEventListener('touchmove',  onTouchMove);
      scrollEl.removeEventListener('touchend',   onTouchEnd);
    };
  }, [isModalOpen, vibrate, notification]);

  const ptrPullDistRef = useRef(0);
  useEffect(() => { ptrPullDistRef.current = ptrPullDist; }, [ptrPullDist]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(r => console.log('✓ Service Worker registered:', r))
        .catch(e => console.error('✗ Service Worker failed:', e));
    }
  }, []);

  const swipeRef = useSwipeGesture({
    onSwipeRight: () => {
      if (window.innerWidth < 1024 && !sidebarOpen) { selection(); setSidebarOpen(true); }
    },
    onSwipeLeft: () => {
      if (window.innerWidth < 1024 && sidebarOpen) { selection(); setSidebarOpen(false); }
    },
    threshold: 80,
  });

  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch real unread notification count from DB
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (!cancelled) setUnreadCount(count ?? 0);
    };

    fetchUnread();
    // Re-fetch every 30 seconds (polling)
    const interval = setInterval(fetchUnread, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user?.id]);
  const activeProjects = projects.filter(p => p.status === 'active');

  // Current page label from navItems
  const currentPageLabel = navItems.find(item => item.path === pathname)?.label ?? '';

  return (
    <div className="layout-shell h-full">
      {/* Header */}
      <header className="layout-header flex items-center justify-between px-4 h-[60px] bg-gradient-to-r from-slate-950/95 via-blue-950/90 to-indigo-950/95 border-b border-white/[0.06]" style={{ backdropFilter: 'blur(20px)' }}>
        {/* Left: Logo + page title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors text-white/80 hover:text-white shrink-0"
            aria-label="القائمة"
          >
            <Menu className="size-5" />
          </button>
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="relative size-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 p-[1px] shadow-lg shadow-blue-500/20">
              <div className="w-full h-full rounded-[10px] bg-slate-950/80 flex items-center justify-center overflow-hidden">
                <img src={axionLogo} alt="Axion" className="size-5 object-contain" />
              </div>
            </div>
            <div className="hidden lg:block">
              <span className="font-bold text-sm text-white">AXION</span>
              <span className="text-[10px] text-blue-300/60 block leading-none font-mono tracking-wider">REAL ASSETS</span>
            </div>
          </Link>
          {currentPageLabel && (
            <>
              <div className="h-5 w-px bg-white/10 shrink-0" />
              <span className="text-sm font-semibold truncate text-white/90">{currentPageLabel}</span>
            </>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <ConnectionIndicator />
          <OfflineQueue />

          {/* Compact Project Selector — icon only */}
          <Select value={selectedProjectId || '__all__'} onValueChange={(value) => {
            selectProject(value === '__all__' ? null : value);
            if (value && value !== '__all__') {
              const project = projects.find(p => p.id === value);
              toast({
                title: '✓ تم تحديد المشروع',
                description: `سيتم ربط جميع العمليات الجديدة بـ ${project?.name}`,
                duration: 2000,
              });
            }
          }}>
            <SelectTrigger className="size-9 rounded-xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all shadow-sm p-0 flex items-center justify-center [&>svg:last-child]:hidden">
              <div className="relative flex items-center justify-center">
                <Building2 className="size-4 text-primary" />
                {!selectedProjectId && (
                  <span className="absolute -top-1 -right-1 size-2 bg-amber-500 rounded-full animate-pulse" />
                )}
                {selectedProjectId && (
                  <span className="absolute -top-1 -right-1 size-2 bg-emerald-500 rounded-full" />
                )}
              </div>
            </SelectTrigger>
            <SelectContent className="max-w-[260px]">
              <SelectItem value="__all__" className="text-xs">
                <div className="flex items-center gap-2">
                  <Building2 className="size-3.5 text-muted-foreground" />
                  <span className="font-medium">جميع المشاريع</span>
                </div>
              </SelectItem>
              {activeProjects.length > 0 && <div className="h-px bg-border my-1" />}
              {activeProjects.map(p => {
                const isSelected = p.id === selectedProjectId;
                return (
                  <SelectItem key={p.id} value={p.id} className="text-xs py-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className={`size-3 shrink-0 ${isSelected ? 'text-emerald-500' : 'text-muted-foreground/40'}`} />
                      <span className="truncate max-w-[180px]">{p.name}</span>
                    </div>
                  </SelectItem>
                );
              })}
              {activeProjects.length === 0 && (
                <div className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">لا توجد مشاريع نشطة</p>
                </div>
              )}
            </SelectContent>
          </Select>

          <Link to="/notifications" className="relative p-2 rounded-lg hover:bg-white/10 transition-colors">
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-0.5 -right-0.5 size-4 flex items-center justify-center p-0 text-[9px] bg-destructive text-destructive-foreground">
                {unreadCount}
              </Badge>
            )}
          </Link>
          <button
            onClick={toggle}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/80 hover:text-white"
            aria-label="تبديل السمة"
          >
            {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
          <div className="hidden sm:flex items-center gap-2 mr-1 pr-2 border-r border-white/[0.08]">
            <div className="size-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <ShieldCheck className="size-4 text-blue-400" />
            </div>
            <div className="text-right hidden md:block">
              <p className="text-xs font-semibold leading-none text-white/90">{user?.full_name}</p>
              <p className="text-[10px] text-blue-300/50 font-mono">{dbRole === 'admin' ? 'مدير النظام' : dbRole === 'manager' ? 'مدير' : 'مستخدم'}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-[var(--sidebar-width)] border-l border-border bg-card shrink-0">
          {/* User Profile Section */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
              <div className="size-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="size-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{user?.full_name}</p>
                <p className="text-[10px] text-muted-foreground">{user?.email}</p>
                <Badge variant="outline" className="text-[9px] h-4 mt-1 border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400">
                  {dbRole === 'admin' ? 'مدير النظام' : dbRole === 'manager' ? 'مدير' : 'مستخدم'}
                </Badge>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {visibleNavItems.filter(i => i.path !== '/settings' && i.path !== '/notifications').map(item => {
              const active = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  <item.icon className="size-5 shrink-0" />
                  <span>{item.label}</span>
                  {active && <ChevronLeft className="size-4 mr-auto" />}
                </Link>
              );
            })}
          </nav>
          <div className="p-3 border-t border-border space-y-1">
            <Link
              to="/settings"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                pathname === '/settings' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <Settings className="size-5 shrink-0" />
              <span>الإعدادات</span>
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all w-full group"
            >
              <LogOut className="size-5 shrink-0 group-hover:scale-110 transition-transform" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            <aside className="fixed right-0 top-0 h-screen w-72 bg-card z-50 shadow-2xl lg:hidden flex flex-col animate-in slide-in-from-right duration-200">
              <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                  <img src={axionLogo} alt="Axion" className="size-8 rounded-lg" />
                  <span className="font-bold">AXION</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-accent">
                  <X className="size-5" />
                </button>
              </div>

              {/* Mobile User Profile Section */}
              <div className="p-4 border-b border-border shrink-0">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                  <div className="size-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="size-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{user?.full_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                    <Badge variant="outline" className="text-[9px] h-4 mt-1 border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400">
                      {dbRole === 'admin' ? 'مدير النظام' : dbRole === 'manager' ? 'مدير' : 'مستخدم'}
                    </Badge>
                  </div>
                </div>
              </div>
              <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 min-h-0">
                {visibleNavItems.filter(i => i.path !== '/settings' && i.path !== '/notifications').map(item => {
                  const active = pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      <item.icon className="size-5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="p-3 border-t border-border space-y-1 shrink-0 bg-card">
                <Link
                  to="/settings"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                    pathname === '/settings' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
                  }`}
                >
                  <Settings className="size-5 shrink-0" />
                  <span>الإعدادات</span>
                </Link>
                <button
                  onClick={() => { logout(); setSidebarOpen(false); }}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all w-full group"
                >
                  <LogOut className="size-5 shrink-0 group-hover:scale-110 transition-transform" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </aside>
          </>
        )}

        {/* Main Content */}
        <main className="layout-main flex-1 min-w-0 relative" ref={swipeRef}>
          <div className="sticky top-0 left-0 right-0 h-0 z-50 pointer-events-none overflow-visible">
            <PullToRefreshIndicator
              pullDistance={ptrPullDist}
              isRefreshing={ptrRefreshing}
              progress={ptrProgress}
            />
          </div>
          <div className="p-4 lg:p-6">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="layout-nav lg:hidden flex items-center justify-around px-2 pb-safe">
        {bottomNavItems.map(item => {
          const active = pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl min-w-[56px] transition-all ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon className={`size-5 ${active ? 'text-primary' : ''}`} />
              <span className={`text-[10px] font-medium ${active ? 'text-primary' : ''}`}>{item.label}</span>
              {active && <div className="w-4 h-0.5 bg-primary rounded-full mt-0.5" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
