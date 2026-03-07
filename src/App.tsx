import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/hooks/useTheme';
import { SelectedProjectProvider } from '@/hooks/useSelectedProject';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { lazy, Suspense, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { trackPageView } from '@/services/analyticsService';

import LoginPage from '@/pages/LoginPage';

const DashboardPage         = lazy(() => import('@/pages/DashboardPage'));
const ProjectsPage          = lazy(() => import('@/pages/ProjectsPage'));
const WorkersPage           = lazy(() => import('@/pages/WorkersPage'));
const ExpensesPage          = lazy(() => import('@/pages/ExpensesPage'));
const SuppliersPage         = lazy(() => import('@/pages/SuppliersPage'));
const PurchasesPage         = lazy(() => import('@/pages/PurchasesPage'));
const NotificationsPage     = lazy(() => import('@/pages/NotificationsPage'));
const SettingsPage          = lazy(() => import('@/pages/SettingsPage'));
const AttendancePage        = lazy(() => import('@/pages/AttendancePage'));
const WorkerAccountsPage    = lazy(() => import('@/pages/WorkerAccountsPage'));
const WellsPage             = lazy(() => import('@/pages/WellsPage'));
const EquipmentPage         = lazy(() => import('@/pages/EquipmentPage'));
const ReportsPage           = lazy(() => import('@/pages/ReportsPage'));
const CustomersPage         = lazy(() => import('@/pages/CustomersPage'));
const AutocompleteAdminPage = lazy(() => import('@/pages/AutocompleteAdminPage'));
const BackupManagerPage     = lazy(() => import('@/pages/BackupManagerPage'));
const AIChatPage            = lazy(() => import('@/pages/AIChatPage'));
const GitManagerPage        = lazy(() => import('@/pages/GitManagerPage'));
const GitHubSettingsPage    = lazy(() => import('@/pages/GitHubSettingsPage'));
const GitTerminalPage       = lazy(() => import('@/pages/GitTerminalPage'));
const SetupWizardPage       = lazy(() => import('@/pages/SetupWizardPage'));
const PermissionsPage       = lazy(() => import('@/pages/PermissionsPage'));
const SyncComparisonPage    = lazy(() => import('@/pages/SyncComparisonPage'));
const AnalyticsPage         = lazy(() => import('@/pages/AnalyticsPage'));
const RealTimeAnalyticsPage = lazy(() => import('@/pages/RealTimeAnalyticsPage'));
const UserBehaviorPage      = lazy(() => import('@/pages/UserBehaviorPage'));
const UsersManagementPage   = lazy(() => import('@/pages/UsersManagementPage'));
const ResetPasswordPage     = lazy(() => import('@/pages/ResetPasswordPage'));
const EmailVerificationPage = lazy(() => import('@/pages/EmailVerificationPage'));
const SetupDebugPage        = lazy(() => import('@/pages/SetupDebugPage'));
const NotFoundPage          = lazy(() => import('@/pages/NotFoundPage'));
const PendingApprovalPage   = lazy(() => import('@/pages/PendingApprovalPage'));

import RegisterPage      from '@/pages/RegisterPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';

// ─── Page Loader ───────────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-7 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">جاري تحميل البيانات...</span>
      </div>
    </div>
  );
}

// ─── Full-screen loader used while checking setup status ───────────────────────
function SplashLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-950">
      <div className="size-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center shadow-xl shadow-blue-500/30">
        <Loader2 className="size-6 animate-spin text-white" />
      </div>
      <p className="text-sm text-slate-500 font-mono">جاري تشغيل النظام...</p>
    </div>
  );
}

// ─── Setup Guard — checks if setup_complete before rendering app ───────────────
/**
 * ✅ FIXED v3: Robust detection handles:
 * 1. Table doesn't exist (fresh remix) → HTTP 404/400 → needs-setup
 * 2. Table exists but setup_complete != 'true' → needs-setup
 * 3. setup_complete = 'true' → ready
 * 4. Network failure after retries → needs-setup (safe fallback)
 */
function SetupGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'needs-setup'>('loading');

  useEffect(() => {
    let cancelled = false;

    async function checkSetup() {
      const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  as string;
      const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

      // Validate env vars exist
      if (!SUPABASE_URL || !SUPABASE_ANON) {
        console.error('[SetupGuard] Missing Supabase env vars → needs-setup');
        if (!cancelled) setStatus('needs-setup');
        return;
      }

      const MAX_RETRIES = 3;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        console.log(`[SetupGuard] Attempt ${attempt}/${MAX_RETRIES}`);
        try {
          const res = await fetch(
            `${SUPABASE_URL}/rest/v1/system_settings?key=eq.setup_complete&select=value`,
            {
              headers: {
                apikey:        SUPABASE_ANON,
                Authorization: `Bearer ${SUPABASE_ANON}`,
                Accept:        'application/json',
                'Content-Type': 'application/json',
              },
              signal: AbortSignal.timeout(8000),
            }
          );

          if (cancelled) return;

          // 400/404/406 = table missing or schema issue → needs setup
          if (res.status === 400 || res.status === 404 || res.status === 406) {
            console.log(`[SetupGuard] HTTP ${res.status} → table missing → needs-setup`);
            setStatus('needs-setup');
            return;
          }

          // Other non-ok responses → retry
          if (!res.ok) {
            console.warn(`[SetupGuard] HTTP ${res.status}`);
            if (attempt < MAX_RETRIES) { await new Promise(r => setTimeout(r, 1200 * attempt)); continue; }
            setStatus('needs-setup');
            return;
          }

          const rows: { value: string }[] = await res.json();
          console.log('[SetupGuard] rows:', rows);

          if (cancelled) return;

          // Empty rows = setup_complete key not set OR table empty
          const isComplete = Array.isArray(rows) && rows.length > 0 && rows[0].value === 'true';
          console.log(`[SetupGuard] isComplete → ${isComplete}`);
          setStatus(isComplete ? 'ready' : 'needs-setup');
          return;

        } catch (err: any) {
          console.warn(`[SetupGuard] Error attempt ${attempt}:`, err.message);
          if (attempt < MAX_RETRIES) {
            await new Promise(r => setTimeout(r, 1200 * attempt));
          } else if (!cancelled) {
            // After all retries fail, show setup (safe fallback)
            setStatus('needs-setup');
          }
        }
      }
    }

    checkSetup();
    return () => { cancelled = true; };
  }, []);

  if (status === 'loading') {
    return <SplashLoader />;
  }

  if (status === 'needs-setup') {
    return (
      <>
        <Routes>
          <Route
            path="/setup"
            element={
              <Suspense fallback={<SplashLoader />}>
                <SetupWizardPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/setup" replace />} />
        </Routes>
        <Toaster />
      </>
    );
  }

  return <>{children}</>;
}

// ─── Main App Routes ───────────────────────────────────────────────────────────
function AppRoutes() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // تتبع زيارات الصفحات تلقائياً
  useEffect(() => {
    const pagePath = location.pathname;
    const pageTitle = document.title;
    trackPageView(pagePath, pageTitle);
  }, [location.pathname]);

  return (
    <Routes>
      {/* Public / auth routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />}
      />
      <Route
        path="/forgot-password"
        element={isAuthenticated ? <Navigate to="/" replace /> : <ForgotPasswordPage />}
      />
      <Route
        path="/reset-password"
        element={isAuthenticated ? <Navigate to="/" replace /> : <ResetPasswordPage />}
      />
      <Route
        path="/verify-email"
        element={isAuthenticated ? <Navigate to="/" replace /> : <EmailVerificationPage />}
      />
      <Route
        path="/pending-approval"
        element={
          <Suspense fallback={<SplashLoader />}>
            <PendingApprovalPage />
          </Suspense>
        }
      />

      {/* Setup Wizard — accessible even when logged in (admin may revisit) */}
      <Route
        path="/setup"
        element={
          <Suspense fallback={<SplashLoader />}>
            <SetupWizardPage />
          </Suspense>
        }
      />
      
      {/* Debug page for troubleshooting setup issues */}
      <Route
        path="/setup-debug"
        element={
          <Suspense fallback={<SplashLoader />}>
            <SetupDebugPage />
          </Suspense>
        }
      />

      {/* Protected app routes */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/"                   element={<DashboardPage />} />
                  <Route path="/projects"           element={<ProjectsPage />} />
                  <Route path="/workers"            element={<WorkersPage />} />
                  <Route path="/expenses"           element={<ExpensesPage />} />
                  <Route path="/suppliers"          element={<SuppliersPage />} />
                  <Route path="/purchases"          element={<PurchasesPage />} />
                  <Route path="/attendance"         element={<AttendancePage />} />
                  <Route path="/worker-accounts"    element={<WorkerAccountsPage />} />
                  <Route path="/notifications"      element={<NotificationsPage />} />
                  <Route path="/settings"           element={<SettingsPage />} />
                  <Route path="/wells"              element={<WellsPage />} />
                  <Route path="/equipment"          element={<EquipmentPage />} />
                  <Route path="/reports"            element={<ReportsPage />} />
                  <Route path="/customers"          element={<CustomersPage />} />
                  <Route path="/autocomplete-admin" element={<AutocompleteAdminPage />} />
                  <Route path="/backup-manager"     element={<BackupManagerPage />} />
                  <Route path="/ai-chat"            element={<AIChatPage />} />
                  <Route path="/git-manager"        element={<GitManagerPage />} />
                  <Route path="/github-settings"    element={<GitHubSettingsPage />} />
                  <Route path="/git-terminal"       element={<GitTerminalPage />} />
                  <Route path="/sync-comparison"    element={<SyncComparisonPage />} />
                  <Route path="/users-management"   element={<UsersManagementPage />} />
                  <Route path="/permissions"        element={<PermissionsPage />} />
                  <Route path="/analytics"          element={<AnalyticsPage />} />
                  <Route path="/analytics/realtime" element={<RealTimeAnalyticsPage />} />
                  <Route path="/analytics/behavior" element={<UserBehaviorPage />} />
                  <Route path="*"                   element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <SetupGuard>
        <ThemeProvider>
          <AuthProvider>
            <SelectedProjectProvider>
              <TooltipProvider>
                <AppRoutes />
                <Toaster />
              </TooltipProvider>
            </SelectedProjectProvider>
          </AuthProvider>
        </ThemeProvider>
      </SetupGuard>
    </BrowserRouter>
  );
}
