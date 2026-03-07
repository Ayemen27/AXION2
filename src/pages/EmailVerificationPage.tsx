
/**
 * Email Verification Page
 * صفحة التحقق من البريد الإلكتروني عبر OTP
 * - إرسال OTP تلقائياً عند تحميل الصفحة
 * - إدخال 6 أرقام مع auto-focus
 * - عداد تنازلي (60 ثانية) قبل إعادة الإرسال
 * - رسائل خطأ واضحة
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';
import {
  Mail, Loader2, CheckCircle2, ArrowRight,
  AlertCircle, RefreshCw, ShieldCheck, Clock, Moon, Sun,
} from 'lucide-react';
import axionLogo from '@/assets/axion-logo.png';

export default function EmailVerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isDark, toggle: toggleTheme } = useTheme();

  const email = location.state?.email || localStorage.getItem('axion_pending_email');

  // ✅ OTP length = 4 (matches backend configuration)
  const [otp, setOtp] = useState(['', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect إذا لم يكن هناك بريد
  useEffect(() => {
    if (!email) {
      toast({
        title: 'خطأ',
        description: 'لم يتم العثور على البريد الإلكتروني',
        variant: 'destructive',
      });
      navigate('/login', { replace: true });
    }
  }, [email, navigate, toast]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const sendOTP = useCallback(async (isInitial = false) => {
    if (!email) return;

    if (!isInitial) setIsResending(true);
    setError('');

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false, // المستخدم موجود بالفعل
          data: {
            app_name: 'AXION',
            email_type: 'email_verification',
          },
        },
      });

      if (otpError) {
        throw otpError;
      }

      if (!isInitial) {
        toast({
          title: 'تم إرسال الكود',
          description: `تحقق من صندوق الوارد في ${email}`,
        });
      }

      setCountdown(60);
      setCanResend(false);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || 'فشل إرسال رمز التحقق');
      toast({
        title: 'خطأ في الإرسال',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      if (!isInitial) setIsResending(false);
    }
  }, [email, toast]);

  // Auto-send OTP on mount
  useEffect(() => {
    if (email && !isResending) {
      sendOTP(true);
    }
  }, [email, isResending, sendOTP]); // Added dependencies for correctness

  const verifyOTP = useCallback(async (code: string) => {
    if (!email) return;

    setIsVerifying(true);
    setError('');

    try {
      // التحقق من OTP
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      });

      if (verifyError) {
        throw verifyError;
      }

      if (!data.user) {
        throw new Error('فشل التحقق — لم يتم العثور على المستخدم');
      }

      // نجح التحقق
      toast({
        title: 'تم التحقق بنجاح! ✓',
        description: 'يمكنك الآن تسجيل الدخول',
      });

      // مسح البريد المؤقت
      localStorage.removeItem('axion_pending_email');

      // توجيه لصفحة تسجيل الدخول
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1500);
    } catch (err: any) {
      const errorMsg = err.message || 'رمز التحقق غير صحيح';
      setError(
        errorMsg.includes('expired') || errorMsg.includes('invalid')
          ? 'رمز التحقق منتهي أو غير صحيح'
          : errorMsg
      );
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      toast({
        title: 'فشل التحقق',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  }, [email, navigate, toast]);

  const handleOtpChange = (index: number, value: string) => {
    // السماح بأرقام فقط
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // آخر رقم فقط
    setOtp(newOtp);
    setError('');

    // Auto-focus على الحقل التالي
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // تحقق تلقائي عند إكمال الـ 4 أرقام
    if (newOtp.every(d => d !== '') && index === 3) {
      verifyOTP(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    const newOtp = pastedData.split('').concat(Array(4 - pastedData.length).fill(''));
    setOtp(newOtp as string[]);
    if (pastedData.length === 4) {
      verifyOTP(pastedData);
    }
  };

  const handleResend = () => {
    if (canResend && !isResending) {
      sendOTP(false);
    }
  };

  if (!email) return null;

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 ${
      isDark ? 'bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950' : 'bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100'
    }`} dir="rtl">
      {/* Background - adaptive */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute top-[-10%] right-[20%] w-[500px] h-[500px] rounded-full blur-[120px] animate-pulse ${
          isDark ? 'bg-blue-600/20' : 'bg-blue-400/10'
        }`} style={{ animationDuration: '4s' }} />
        <div className={`absolute bottom-[-5%] left-[15%] w-[400px] h-[400px] rounded-full blur-[100px] animate-pulse ${
          isDark ? 'bg-indigo-600/20' : 'bg-indigo-400/10'
        }`} style={{ animationDuration: '6s' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent to-transparent ${
          isDark ? 'via-blue-400/40' : 'via-blue-300/30'
        }`} />
      </div>

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Theme Toggle */}
        <div className="flex justify-end mb-4">
          <button
            onClick={toggleTheme}
            className={`size-10 rounded-xl flex items-center justify-center transition-all ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-amber-400' : 'bg-white hover:bg-slate-100 text-slate-600 shadow-sm border border-slate-200'
            }`}
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>

        {/* Logo */}
        <div className="flex flex-col items-center mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="relative mb-4">
            <div className={`absolute inset-0 rounded-3xl blur-2xl scale-125 ${
              isDark ? 'bg-blue-500/25' : 'bg-blue-400/20'
            }`} />
            <div className="relative size-20 rounded-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 p-[1.5px] shadow-2xl shadow-blue-500/30">
              <div className={`w-full h-full rounded-[22px] backdrop-blur-xl flex items-center justify-center overflow-hidden ${
                isDark ? 'bg-slate-950/80' : 'bg-white/80'
              }`}>
                <img src={axionLogo} alt="AXION" className="object-contain" style={{ width: '52px', height: '52px' }} />
              </div>
            </div>
          </div>
          <h1 className={`text-xl font-bold tracking-tight ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>التحقق من البريد الإلكتروني</h1>
          <p className={`text-[10px] font-mono tracking-[0.15em] mt-0.5 ${
            isDark ? 'text-blue-300/60' : 'text-blue-600/50'
          }`}>AXION · EMAIL VERIFICATION</p>
        </div>

        {/* Card */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '150ms' }}>
          <div className="relative rounded-3xl overflow-hidden">
            <div className={`absolute inset-0 backdrop-blur-2xl border ${
              isDark ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-white/90 border-slate-200'
            }`} />
            <div className={`absolute inset-0 bg-gradient-to-b ${
              isDark ? 'from-white/[0.05] to-transparent' : 'from-blue-50/50 to-transparent'
            }`} />
            <div className="relative p-8">
              {/* Email info */}
              <div className={`flex items-center gap-3 p-3 rounded-2xl border mb-6 ${
                isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'
              }`}>
                <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isDark ? 'bg-blue-500/20' : 'bg-blue-100'
                }`}>
                  <Mail className={`size-5 ${
                    isDark ? 'text-blue-400' : 'text-blue-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] ${
                    isDark ? 'text-slate-500' : 'text-slate-600'
                  }`}>تم إرسال الكود إلى</p>
                  <p className={`text-xs font-bold truncate ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>{email}</p>
                </div>
              </div>

              {/* OTP Input */}
              <div className="mb-6">
                <label className={`block text-xs font-medium mb-3 ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  أدخل رمز التحقق (4 أرقام)
                </label>
                <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                  {otp.map((digit, i) => (
                    <Input
                      key={i}
                      ref={el => (inputRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleKeyDown(i, e)}
                      disabled={isVerifying}
                      className={`size-12 text-center text-lg font-bold rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all ${
                        isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                      autoFocus={i === 0}
                    />
                  ))}
                </div>
                {error && (
                  <div className={`flex items-center gap-2 mt-3 p-2.5 rounded-xl border ${
                    isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'
                  }`}>
                    <AlertCircle className={`size-4 shrink-0 ${
                      isDark ? 'text-red-400' : 'text-red-600'
                    }`} />
                    <p className={`text-xs ${
                      isDark ? 'text-red-400' : 'text-red-700'
                    }`}>{error}</p>
                  </div>
                )}
              </div>

              {/* Verify Button */}
              <Button
                onClick={() => verifyOTP(otp.join(''))}
                disabled={otp.some(d => !d) || isVerifying}
                className="w-full rounded-2xl font-bold text-sm shadow-2xl shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ height: '52px', background: otp.every(d => d) ? 'linear-gradient(135deg, #2563eb, #4f46e5)' : '#1e293b' }}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="size-4 ml-2 animate-spin" />
                    جاري التحقق...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4 ml-2" />
                    تحقق من الكود
                  </>
                )}
              </Button>

              {/* Resend */}
              <div className="mt-4 text-center">
                {canResend ? (
                  <Button
                    variant="ghost"
                    onClick={handleResend}
                    disabled={isResending}
                    className={`rounded-xl text-xs ${
                      isDark ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/10' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                    }`}
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="size-3 ml-1 animate-spin" />
                        جاري الإرسال...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="size-3 ml-1" />
                        إعادة إرسال الكود
                      </>
                    )}
                  </Button>
                ) : (
                  <div className={`flex items-center justify-center gap-1.5 text-xs ${
                    isDark ? 'text-slate-500' : 'text-slate-600'
                  }`}>
                    <Clock className="size-3" />
                    <span>إعادة الإرسال بعد {countdown} ثانية</span>
                  </div>
                )}
              </div>

              {/* Back to login */}
              <button
                onClick={() => {
                  localStorage.removeItem('axion_pending_email');
                  navigate('/login', { replace: true });
                }}
                className={`flex items-center justify-center gap-1 text-sm transition-colors mt-4 w-full ${
                  isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowRight className="size-3" />
                العودة لتسجيل الدخول
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <ShieldCheck className={`size-3.5 ${
            isDark ? 'text-emerald-500/70' : 'text-emerald-600/70'
          }`} />
          <span className={`text-[9px] font-mono tracking-widest ${
            isDark ? 'text-slate-600' : 'text-slate-500'
          }`}>AXION SECURITY · ONSPACE CLOUD</span>
        </div>
      </div>
    </div>
  );
}
