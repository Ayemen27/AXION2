/**
 * PendingApprovalPage v2
 * المستخدم يبقى مسجّل دخول — تتحقق كل 30 ثانية من is_approved
 * عند الموافقة: تحديث الـ session وإعادة التوجيه للوحة التحكم
 * عند الرفض (is_active=false): تسجيل خروج وتوجيه للصفحة الرئيسية
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock, CheckCircle2, RefreshCw, LogOut,
  Mail, ShieldCheck, Loader2, Bell,
  ChevronRight, Info, AlertCircle,
} from 'lucide-react';
import axionLogo from '@/assets/axion-logo.png';

const CHECK_INTERVAL = 15;

export default function PendingApprovalPage() {
  const navigate   = useNavigate();

  const [email,       setEmail]       = useState('');
  const [userId,      setUserId]      = useState('');
  const [countdown,   setCountdown]   = useState(CHECK_INTERVAL);
  const [checking,    setChecking]    = useState(false);
  const [checkCount,  setCheckCount]  = useState(0);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [approved,    setApproved]    = useState(false);
  const [rejected,    setRejected]    = useState(false);
  const [error,       setError]       = useState('');
  const [sessionReady, setSessionReady] = useState(false);

  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load session on mount ─────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setEmail(session.user.email || '');
        setUserId(session.user.id);
        setSessionReady(true);
      } else {
        // No session — try localStorage email (user was signed out before arriving here)
        const pending = localStorage.getItem('axion_pending_email');
        if (pending) {
          setEmail(pending);
        }
        // No session and no email → back to register
        if (!pending) {
          navigate('/register');
        }
        setSessionReady(true);
      }
    });
  }, [navigate]);

  // ── Check approval status ─────────────────────────────────────────────────
  const checkApproval = useCallback(async (silent = false) => {
    if (!silent) setChecking(true);
    setError('');

    try {
      // Always get fresh session first
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        // Session expired — go to login
        navigate('/login');
        return;
      }

      const uid = session.user.id;

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('is_approved, is_active, role')
        .eq('id', uid)
        .single();

      setLastChecked(new Date());
      setCheckCount(c => c + 1);

      if (profileError) {
        console.warn('[pending] Profile check error:', profileError.message);
        if (!silent) setError('تعذّر التحقق من حالة الحساب. حاول مجدداً.');
        return;
      }

      if (!profile) {
        if (!silent) setError('لم يُعثر على ملف الحساب. تواصل مع المسؤول.');
        return;
      }

      console.log('[pending] profile:', profile);

      if (profile.is_approved === true && profile.is_active === true) {
        // ✅ Approved — refresh auth state then go to dashboard
        setApproved(true);
        localStorage.removeItem('axion_pending_email');
        // Force reload so AuthProvider re-reads profile with correct dbApproved=true
        setTimeout(() => { window.location.href = '/'; }, 1500);

      } else if (profile.is_active === false && profile.is_approved === false) {
        // ❌ Rejected
        setRejected(true);
        setTimeout(async () => {
          await supabase.auth.signOut();
          navigate('/login', { state: { message: 'تم رفض طلب تسجيلك. تواصل مع مسؤول النظام.' } });
        }, 2000);
      }
      // else still pending — do nothing, wait for next check
    } catch (e: any) {
      console.error('[pending] checkApproval error:', e);
      if (!silent) setError('حدث خطأ في الاتصال. تحقق من الإنترنت وحاول مجدداً.');
    } finally {
      if (!silent) setChecking(false);
    }
  }, [navigate]);

  // ── Auto-check ticker ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionReady) return;

    // Initial check
    checkApproval(true);

    tickerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          checkApproval(true);
          return CHECK_INTERVAL;
        }
        return c - 1;
      });
    }, 1000);

    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, [sessionReady, checkApproval]);

  // ── Manual refresh ────────────────────────────────────────────────────────
  const handleManualCheck = () => {
    setCountdown(CHECK_INTERVAL);
    checkApproval(false);
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    if (tickerRef.current) clearInterval(tickerRef.current);
    await supabase.auth.signOut();
    localStorage.removeItem('axion_pending_email');
    navigate('/login');
  };

  // ── Progress ring ─────────────────────────────────────────────────────────
  const radius       = 36;
  const circumference = 2 * Math.PI * radius;
  const progress      = ((CHECK_INTERVAL - countdown) / CHECK_INTERVAL) * circumference;

  // ── Status overlay content ────────────────────────────────────────────────
  const OverlayContent = () => {
    if (approved) return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm animate-in fade-in duration-500">
        <div className="size-24 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border-4 border-emerald-400 flex items-center justify-center mb-6">
          <CheckCircle2 className="size-12 text-emerald-500" />
        </div>
        <h2 className="text-xl font-black text-foreground mb-2">تمت الموافقة! 🎉</h2>
        <p className="text-sm text-muted-foreground mb-4">جاري الانتقال للنظام...</p>
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );

    if (rejected) return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm animate-in fade-in duration-500">
        <div className="size-24 rounded-full bg-red-50 dark:bg-red-500/10 border-4 border-red-400 flex items-center justify-center mb-6">
          <AlertCircle className="size-12 text-red-500" />
        </div>
        <h2 className="text-xl font-black text-foreground mb-2">تم رفض الطلب</h2>
        <p className="text-sm text-muted-foreground mb-4">جاري تسجيل الخروج...</p>
        <Loader2 className="size-6 animate-spin text-red-500" />
      </div>
    );

    return null;
  };

  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden"
      dir="rtl"
    >
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M30 0l30 30-30 30-30-30z\' fill=\'%232563eb\' fill-opacity=\'1\'/%3E%3C/svg%3E")',
          backgroundSize: '45px 45px',
        }}
      />

      <OverlayContent />

      <div className="w-full max-w-sm z-10 space-y-4">

        {/* Logo */}
        <div className="flex flex-col items-center gap-2 mb-2">
          <div className="size-14 rounded-2xl bg-white/50 dark:bg-white/5 backdrop-blur-sm border border-white/20 p-2.5 flex items-center justify-center">
            <img src={axionLogo} alt="AXION" className="w-full h-full object-contain" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-black text-foreground">
              <span className="text-primary">AXION</span>
            </h1>
            <p className="text-[9px] text-muted-foreground tracking-widest uppercase font-bold">Real Assets Management</p>
          </div>
        </div>

        {/* Main card */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">

          {/* Icon + title */}
          <div className="text-center space-y-3">
            {/* Animated clock ring */}
            <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" width="96" height="96" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-border" />
                <circle
                  cx="48" cy="48" r={radius} fill="none" stroke="currentColor" strokeWidth="4"
                  strokeDasharray={circumference} strokeDashoffset={circumference - progress}
                  strokeLinecap="round" className="text-amber-500 transition-all duration-1000"
                />
              </svg>
              <div className="size-16 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center border-2 border-amber-200 dark:border-amber-500/30">
                <Clock className="size-8 text-amber-500" />
              </div>
            </div>

            <div>
              <h2 className="text-base font-black text-foreground">في انتظار موافقة المسؤول</h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                تم إنشاء حسابك بنجاح! المسؤول سيراجع طلبك قريباً.
              </p>
            </div>
          </div>

          {/* Email badge */}
          {email && (
            <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-3">
              <Mail className="size-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground font-medium truncate flex-1">{email}</span>
              <Badge className="text-[9px] border-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
                معلّق
              </Badge>
            </div>
          )}

          {/* Auto-check status */}
          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400">
                <div className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span>يتحقق تلقائياً كل 30 ثانية</span>
              </div>
              <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                {countdown < 10 ? `0${countdown}` : countdown}ث
              </span>
            </div>

            {lastChecked && (
              <p className="text-[11px] text-blue-600/70 dark:text-blue-400/70">
                آخر فحص: {lastChecked.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                {checkCount > 0 && <span className="mr-2 opacity-60">({checkCount} {checkCount === 1 ? 'مرة' : 'مرات'})</span>}
              </p>
            )}

            {error && (
              <p className="text-[11px] text-red-500 flex items-center gap-1">
                <Info className="size-3 shrink-0" /> {error}
              </p>
            )}
          </div>

          {/* Progress steps */}
          <div className="space-y-2">
            {[
              { icon: CheckCircle2, label: 'تم إنشاء الحساب',        done: true  },
              { icon: Mail,          label: 'تم إرسال إشعار للمسؤول', done: true  },
              { icon: ShieldCheck,   label: 'مراجعة المسؤول',          done: false, active: true },
              { icon: ChevronRight,  label: 'الدخول للنظام',           done: false },
            ].map((s, i) => (
              <div key={i} className={`flex items-center gap-2.5 p-2.5 rounded-lg transition-colors ${
                s.done   ? 'bg-emerald-50 dark:bg-emerald-500/10' :
                s.active ? 'bg-amber-50  dark:bg-amber-500/10'   :
                           'bg-muted/30'
              }`}>
                <s.icon className={`size-4 shrink-0 ${
                  s.done   ? 'text-emerald-500' :
                  s.active ? 'text-amber-500'   :
                             'text-muted-foreground/40'
                }`} />
                <span className={`text-xs font-medium ${
                  s.done   ? 'text-emerald-700 dark:text-emerald-400' :
                  s.active ? 'text-amber-700   dark:text-amber-400'   :
                             'text-muted-foreground/50'
                }`}>
                  {s.label}
                </span>
                {s.active && (
                  <span className="mr-auto text-[10px] text-amber-500 font-mono animate-pulse">قيد الانتظار</span>
                )}
                {s.done && <CheckCircle2 className="mr-auto size-3.5 text-emerald-500" />}
              </div>
            ))}
          </div>

          {/* ── Action buttons ── */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* Manual check */}
            <Button
              onClick={handleManualCheck}
              disabled={checking}
              className="rounded-xl h-12 text-sm gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
            >
              {checking
                ? <Loader2 className="size-4 animate-spin" />
                : <RefreshCw className="size-4" />
              }
              {checking ? 'جاري الفحص...' : 'تحديث الحالة'}
            </Button>

            {/* Logout */}
            <Button
              onClick={handleLogout}
              variant="outline"
              className="rounded-xl h-12 text-sm gap-2 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 font-bold"
            >
              <LogOut className="size-4" />
              تسجيل الخروج
            </Button>
          </div>
        </div>

        {/* Info note */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground px-1">
          <Bell className="size-3.5 shrink-0 mt-0.5 text-amber-500" />
          <span>سيتم إعادة توجيهك تلقائياً فور موافقة المسؤول. لا حاجة لإغلاق هذه الصفحة.</span>
        </div>

        {/* Footer */}
        <p className="text-center text-[9px] text-muted-foreground/40 font-mono">
          AXION CORE v3.9.1 · © 2026 AXION OPERATIONS MANAGEMENT
        </p>
      </div>
    </div>
  );
}
