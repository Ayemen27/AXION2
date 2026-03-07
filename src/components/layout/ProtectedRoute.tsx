import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, Lock } from 'lucide-react';

// Pages that require admin role
export const ADMIN_ONLY_ROUTES = [
  '/users-management',
  '/permissions',
  '/backup-manager',
  '/git-manager',
  '/git-terminal',
  '/github-settings',
  '/sync-comparison',
  '/autocomplete-admin',
];

// Pages that require manager OR admin role
export const MANAGER_ROUTES = [
  '/reports',
];

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, dbRole, dbApproved, profileChecked } = useAuth();
  const { pathname } = useLocation();

  // Loading spinner — wait for auth + DB profile
  if (isLoading || (isAuthenticated && !profileChecked)) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">جاري تحميل البيانات...</span>
        </div>
      </div>
    );
  }

  // Not authenticated → login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Account pending approval — redirect to dedicated page
  if (profileChecked && isAuthenticated && dbApproved === false) {
    return <Navigate to="/pending-approval" replace />;
  }

  // Role-based checks for restricted routes (use DB role — single source of truth)
  const isAdminRoute   = ADMIN_ONLY_ROUTES.some(r => pathname.startsWith(r));
  const isManagerRoute = MANAGER_ROUTES.some(r => pathname.startsWith(r));

  if (isAdminRoute && dbRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4" dir="rtl">
        <div className="size-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <Lock className="size-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold">صلاحيات غير كافية</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          هذه الصفحة متاحة للمسؤول (Admin) فقط.
        </p>
        <p className="text-xs text-muted-foreground">تواصل مع مسؤول النظام لمنحك الصلاحيات اللازمة</p>
      </div>
    );
  }

  if (isManagerRoute && dbRole === 'user') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4" dir="rtl">
        <div className="size-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <Lock className="size-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold">صلاحيات غير كافية</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          هذه الصفحة متاحة للمدراء والمسؤولين فقط.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
