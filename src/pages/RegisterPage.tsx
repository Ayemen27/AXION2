import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  Eye, EyeOff, Loader2, ArrowLeft,
  Mail, Lock, KeyRound, CheckCircle2, Shield, Phone, MapPin, Calendar, ChevronDown, Smartphone, Activity, CheckCircle,
} from 'lucide-react';
import axionLogo from '@/assets/axion-logo.png';

type Step = 'info' | 'otp' | 'done';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { sendOtp, verifyOtpAndRegister } = useAuth();

  const [step, setStep] = useState<Step>('info');
  const [pendingApproval, setPendingApproval] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState({
    firstName: '', email: '', phone: '', password: '', confirm: '', birthDate: '', location: ''
  });

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    location: '',
    birthDate: '',
    email: '',
    password: '',
    confirm: '',
    otp: '',
  });

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const validateForm = (): boolean => {
    const newErrors = {
      firstName: '', email: '', phone: '', password: '', confirm: '', birthDate: '', location: ''
    };
    let isValid = true;

    if (!form.firstName.trim()) {
      newErrors.firstName = 'الاسم مطلوب';
      isValid = false;
    }

    if (!form.email.trim()) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = 'البريد الإلكتروني غير صحيح';
      isValid = false;
    }

    if (!form.password) {
      newErrors.password = 'كلمة المرور مطلوبة';
      isValid = false;
    } else if (form.password.length < 6) {
      newErrors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
      isValid = false;
    }

    if (!form.confirm) {
      newErrors.confirm = 'تأكيد كلمة المرور مطلوب';
      isValid = false;
    } else if (form.password !== form.confirm) {
      newErrors.confirm = 'كلمتا المرور غير متطابقتين';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({
      firstName: '', email: '', phone: '', password: '', confirm: '', birthDate: '', location: ''
    });

    if (!validateForm()) return;

    if (!agreed) {
      toast({ title: 'خطأ', description: 'يجب الموافقة على شروط الاستخدام', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      await sendOtp(form.email.trim());
      setStep('otp');
      startCooldown();
      toast({ title: 'تم الإرسال', description: `تم إرسال رمز التحقق إلى ${form.email}` });
    } catch (err: any) {
      toast({ title: 'خطأ', description: err?.message || 'فشل إرسال رمز التحقق', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.otp.trim().length < 4) {
      toast({ title: 'خطأ', description: 'يرجى إدخال رمز التحقق كاملاً', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const result = await verifyOtpAndRegister(
        form.email.trim(),
        form.otp.trim(),
        form.password,
        form.firstName.trim(),
        form.lastName.trim(),
      );
      // Clear pending email from localStorage
      localStorage.removeItem('axion_pending_email');

      if (result.pendingApproval) {
        // User is signed in but not yet approved — redirect to pending page
        localStorage.setItem('axion_pending_email', form.email.trim());
        navigate('/pending-approval');
      } else {
        // Approved immediately — go to dashboard
        navigate('/');
      }
    } catch (err: any) {
      const msg = err?.message || 'تأكد من الرمز المُرسل إلى بريدك وحاول مجدداً';
      toast({
        title: 'خطأ في التحقق',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    try {
      await sendOtp(form.email.trim());
      startCooldown();
      toast({ title: 'تم إعادة الإرسال', description: 'تحقق من بريدك مرة أخرى' });
    } catch (err: any) {
      toast({ title: 'خطأ', description: err?.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const startCooldown = () => {
    setResendCooldown(60);
    const iv = setInterval(() => {
      setResendCooldown(c => {
        if (c <= 1) { clearInterval(iv); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  return (
    <div className="h-screen w-full bg-background dark:bg-slate-950 flex flex-col items-center overflow-y-auto font-sans select-none relative transition-colors duration-500" dir="rtl">
      {/* Background Pattern - Diamond Pattern */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none z-0" 
           style={{ 
             backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M30 0l30 30-30 30-30-30z\' fill=\'%232563eb\' fill-opacity=\'1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
             backgroundSize: '45px 45px' 
           }}>
      </div>

      <div className="w-full max-w-[420px] z-10 flex flex-col p-4 pt-safe justify-center relative">
        {/* Header - Compact */}
        <div className="flex justify-between items-center mb-2 animate-in slide-in-from-top duration-500 fill-mode-both" dir="rtl">
          <div className="text-right flex flex-col items-end">
            <h2 className="text-[10px] font-black text-blue-600/50 dark:text-blue-400/50 uppercase tracking-widest leading-none">إنضم إلينا</h2>
            <span className="text-[8px] text-blue-600/30 dark:text-blue-400/30 font-bold uppercase">JOIN AXION OPS</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center shadow-md active:scale-95 group border-2 border-white dark:border-slate-800 hover:rotate-12 transition-transform"
            onClick={() => navigate('/login')}
          >
            <div className="flex gap-0.5">
              <div className="w-1 h-1 bg-white rounded-full" />
              <div className="w-1 h-1 bg-white rounded-full" />
              <div className="w-1 h-1 bg-white rounded-full" />
            </div>
          </Button>
        </div>

        {/* Logo Section - AXION Real Assets */}
        <div className="flex flex-col items-center justify-center mb-4 animate-in zoom-in duration-700 delay-150 fill-mode-both">
          <div className="relative mb-3 group cursor-pointer">
            <div className="w-20 h-20 flex items-center justify-center transition-all duration-500 hover:scale-105 active:scale-95 relative bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-2 border border-white/20">
              <img 
                src={axionLogo} 
                alt="AXION Logo" 
                className="w-full h-full object-contain"
              />
              <div className="absolute top-2 right-2 w-3.5 h-3.5 bg-blue-500 rounded-full border-[2.5px] border-white dark:border-[#1a1c1e] shadow-md ring-2 ring-blue-400/20 animate-pulse"></div>
            </div>
          </div>
          <div className="text-center relative">
            <div className="flex items-center justify-center gap-3 mb-1.5">
              <div className="bg-white/30 dark:bg-white/5 backdrop-blur-sm rounded-lg px-4 py-1 border border-white/10">
                <h1 className="text-xl font-bold">
                  <span className="text-gray-900 dark:text-white">أكسيون</span>
                  {' '}
                  <span className="text-blue-600 dark:text-blue-400">AXION</span>
                </h1>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="h-[1px] w-6 bg-gradient-to-r from-transparent to-blue-200 dark:to-blue-900"></span>
              <span className="text-slate-400 dark:text-slate-500 text-[9px] font-black tracking-[0.5em] uppercase">Real Assets Management</span>
              <span className="h-[1px] w-6 bg-gradient-to-l from-transparent to-blue-200 dark:to-blue-900"></span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom duration-700 delay-300 fill-mode-both">
          {step === 'info' && (
            <form onSubmit={handleSendOtp} className="space-y-2">

              {/* Full Name */}
              <div className={cn(
                "bg-card dark:bg-slate-900 rounded-xl border shadow-sm h-12 flex items-center px-4 transition-all focus-within:ring-2 focus-within:ring-blue-600/10",
                errors.firstName ? 'border-red-500' : 'border-border dark:border-slate-800'
              )}>
                <div className="flex-1 flex flex-col justify-center">
                  <span className="text-[9px] text-blue-600/50 dark:text-blue-400/50 font-black text-right uppercase tracking-tighter">Full Name / الاسم</span>
                  <Input
                    value={form.firstName}
                    onChange={e => { set('firstName')(e); setErrors(prev => ({ ...prev, firstName: '' })); }}
                    placeholder="اسمك الرباعي"
                    disabled={isLoading}
                    className="border-none p-0 h-5 text-sm font-bold text-foreground text-right focus-visible:ring-0 placeholder:text-muted-foreground/30 bg-transparent shadow-none"
                  />
                </div>
              </div>
              {errors.firstName && (
                <p className="text-xs text-red-500 mr-1 font-medium">{errors.firstName}</p>
              )}

              {/* Email */}
              <div className={cn(
                "bg-card dark:bg-slate-900 rounded-xl border shadow-sm h-12 flex items-center px-4 transition-all focus-within:ring-2 focus-within:ring-blue-600/10",
                errors.email ? 'border-red-500' : 'border-border dark:border-slate-800'
              )}>
                <div className="flex-1 flex flex-col justify-center">
                  <span className="text-[9px] text-blue-600/50 dark:text-blue-400/50 font-black text-right uppercase tracking-tighter">Identity / البريد</span>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={e => { set('email')(e); setErrors(prev => ({ ...prev, email: '' })); }}
                    placeholder="username@axion.system"
                    autoComplete="email"
                    disabled={isLoading}
                    className="border-none p-0 h-5 text-sm font-bold text-foreground text-right focus-visible:ring-0 placeholder:text-muted-foreground/30 bg-transparent shadow-none"
                  />
                </div>
                <Mail className="w-4 h-4 text-blue-600/30 dark:text-blue-400/30 ml-2" />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500 mr-1 font-medium">{errors.email}</p>
              )}

              {/* Phone with country code */}
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <button type="button" className="bg-card dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 shadow-sm h-12 flex items-center px-2 justify-between hover:bg-muted/50 transition-colors">
                  <ChevronDown className="w-3 h-3 text-blue-600/30" />
                  <span className="text-xs font-black text-foreground" dir="ltr">+967</span>
                  <span className="text-sm">🇾🇪</span>
                </button>

                <div className={cn(
                  "bg-card dark:bg-slate-900 rounded-xl border shadow-sm h-12 flex items-center px-4 transition-all focus-within:ring-2 focus-within:ring-blue-600/10",
                  'border-border dark:border-slate-800'
                )}>
                  <div className="flex-1 flex flex-col justify-center">
                    <span className="text-[9px] text-blue-600/50 dark:text-blue-400/50 font-black text-right uppercase tracking-tighter">Smartphone / الهاتف</span>
                    <Input
                      value={form.phone}
                      onChange={set('phone')}
                      placeholder="7xxxxxxxx"
                      disabled={isLoading}
                      className="border-none p-0 h-5 text-sm font-bold text-foreground text-right focus-visible:ring-0 placeholder:text-muted-foreground/30 bg-transparent shadow-none"
                    />
                  </div>
                  <Smartphone className="w-4 h-4 text-blue-600/30 dark:text-blue-400/30 ml-2" />
                </div>
              </div>

              {/* Password & Confirm in one row */}
              <div className="grid grid-cols-2 gap-2">
                {/* Password */}
                <div>
                  <div className={cn(
                    "bg-card dark:bg-slate-900 rounded-xl border shadow-sm h-12 flex items-center px-4 transition-all focus-within:ring-2 focus-within:ring-blue-600/10",
                    errors.password ? 'border-red-500' : 'border-border dark:border-slate-800'
                  )}>
                    <div className="flex-1 flex flex-col justify-center">
                      <span className="text-[9px] text-blue-600/50 dark:text-blue-400/50 font-black text-right uppercase tracking-tighter">Security / كلمة المرور</span>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={e => { set('password')(e); setErrors(prev => ({ ...prev, password: '' })); }}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        disabled={isLoading}
                        className="border-none p-0 h-5 text-sm font-bold text-foreground text-right focus-visible:ring-0 placeholder:text-muted-foreground/30 bg-transparent shadow-none"
                      />
                    </div>
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="flex items-center justify-center ml-2 transition-colors">
                      {showPassword ? <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" strokeWidth={2} /> : <EyeOff className="w-4 h-4 text-slate-400 dark:text-slate-600" strokeWidth={2} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-500 mr-1 font-medium mt-1">{errors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <div className={cn(
                    "bg-card dark:bg-slate-900 rounded-xl border shadow-sm h-12 flex items-center px-4 transition-all focus-within:ring-2 focus-within:ring-blue-600/10",
                    errors.confirm ? 'border-red-500' : 'border-border dark:border-slate-800'
                  )}>
                    <div className="flex-1 flex flex-col justify-center">
                      <span className="text-[9px] text-blue-600/50 dark:text-blue-400/50 font-black text-right uppercase tracking-tighter">Verify / تأكيد</span>
                      <Input
                        type={showConfirm ? 'text' : 'password'}
                        value={form.confirm}
                        onChange={e => { set('confirm')(e); setErrors(prev => ({ ...prev, confirm: '' })); }}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        disabled={isLoading}
                        className="border-none p-0 h-5 text-sm font-bold text-foreground text-right focus-visible:ring-0 placeholder:text-muted-foreground/30 bg-transparent shadow-none"
                      />
                    </div>
                    <button type="button" onClick={() => setShowConfirm(v => !v)} className="flex items-center justify-center ml-2 transition-colors">
                      {showConfirm ? <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" strokeWidth={2} /> : <EyeOff className="w-4 h-4 text-slate-400 dark:text-slate-600" strokeWidth={2} />}
                    </button>
                  </div>
                  {errors.confirm && (
                    <p className="text-xs text-red-500 mr-1 font-medium mt-1">{errors.confirm}</p>
                  )}
                </div>
              </div>

              {/* Location & Birth Date in one row */}
              <div className="grid grid-cols-2 gap-2">
                {/* Location */}
                <div className={cn(
                  "bg-card dark:bg-slate-900 rounded-xl border shadow-sm h-12 flex items-center px-4 transition-all focus-within:ring-2 focus-within:ring-blue-600/10",
                  'border-border dark:border-slate-800'
                )}>
                  <div className="flex-1 flex flex-col justify-center">
                    <span className="text-[9px] text-blue-600/50 dark:text-blue-400/50 font-black text-right uppercase tracking-tighter">Location / المدينة</span>
                    <Input
                      value={form.location}
                      onChange={set('location')}
                      placeholder="المدينة"
                      disabled={isLoading}
                      className="border-none p-0 h-5 text-sm font-bold text-foreground text-right focus-visible:ring-0 placeholder:text-muted-foreground/30 bg-transparent shadow-none"
                    />
                  </div>
                  <MapPin className="w-4 h-4 text-blue-600/30 dark:text-blue-400/30 ml-2" />
                </div>

                {/* Birth Date */}
                <div className={cn(
                  "bg-card dark:bg-slate-900 rounded-xl border shadow-sm h-12 flex items-center px-4 transition-all focus-within:ring-2 focus-within:ring-blue-600/10",
                  'border-border dark:border-slate-800'
                )}>
                  <div className="flex-1 flex flex-col justify-center">
                    <span className="text-[9px] text-blue-600/50 dark:text-blue-400/50 font-black text-right uppercase tracking-tighter">Birth Date / تاريخ</span>
                    <Input
                      type="date"
                      value={form.birthDate}
                      onChange={set('birthDate')}
                      disabled={isLoading}
                      className="border-none p-0 h-5 text-sm font-bold text-foreground text-right focus-visible:ring-0 bg-transparent shadow-none"
                    />
                  </div>
                  <Calendar className="w-4 h-4 text-blue-600/30 dark:text-blue-400/30 ml-2" />
                </div>
              </div>

              {/* Terms */}
              <div className="flex items-center gap-2 pt-1">
                <Checkbox 
                  id="terms" 
                  checked={agreed} 
                  onCheckedChange={(checked) => setAgreed(checked === true)}
                  className="border-gray-300 dark:border-slate-600"
                />
                <label htmlFor="terms" className="text-xs text-gray-600 dark:text-slate-400">
                  أوافق على <Link to="#" className="text-blue-600 dark:text-blue-400 hover:underline">شروط الاستخدام و سياسة الخصوصية</Link>
                </label>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-blue-600 dark:bg-blue-400 hover:bg-blue-700 dark:hover:bg-blue-300 text-white dark:text-slate-950 text-sm font-black rounded-xl shadow-lg transition-all active:scale-[0.98] border-none"
                >
                  {isLoading ? <Loader2 className="size-5 animate-spin" /> : 'إنشاء الحساب الآن'}
                </Button>

                <p className="text-center text-xs text-gray-600 dark:text-slate-500">
                  لديك حساب بالفعل؟{' '}
                  <Link to="/login" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                    تسجيل الدخول
                  </Link>
                </p>
              </div>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerify} className="space-y-4 text-center pt-8">
              <div>
                <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="size-10 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">رمز التحقق</h3>
                <p className="text-xs text-muted-foreground">
                  تم إرسال رمز إلى <span className="text-blue-600 dark:text-blue-400 font-medium">{form.email}</span>
                </p>
              </div>

              <Input
                value={form.otp}
                onChange={set('otp')}
                placeholder="0000"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                disabled={isLoading}
                className="h-16 rounded-xl text-center text-2xl font-mono tracking-[0.6em] bg-card dark:bg-slate-900 border-border dark:border-slate-800 text-foreground"
              />

              <Button
                type="submit"
                disabled={isLoading || form.otp.trim().length < 4}
                className="w-full h-12 rounded-xl font-bold text-sm bg-blue-600 dark:bg-blue-400 hover:bg-blue-700 dark:hover:bg-blue-300 text-white dark:text-slate-950 shadow-lg"
              >
                {isLoading ? <Loader2 className="size-5 animate-spin" /> : 'تفعيل الحساب'}
              </Button>

              <button type="button" onClick={handleResend} disabled={resendCooldown > 0} className={`text-xs ${resendCooldown > 0 ? 'text-muted-foreground' : 'text-blue-600 dark:text-blue-400 hover:underline'}`}>
                {resendCooldown > 0 ? `إعادة الإرسال (${resendCooldown}ث)` : 'إعادة إرسال الرمز'}
              </button>
            </form>
          )}

          {step === 'done' && (
            <div className="text-center space-y-6 py-8">
              {pendingApproval ? (
                // Pending approval flow
                <>
                  <div className="size-24 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center mx-auto">
                    <Shield className="size-12 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground mb-2">تم إنشاء الحساب!</h2>
                    <p className="text-xs text-muted-foreground">
                      مرحباً <span className="font-semibold text-foreground">{form.firstName}</span>،
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 leading-relaxed">
                      حسابك بانتظار موافقة المسؤول. ستُوجَّه لصفحة الانتظار حيث يتم الفحص التلقائي كل 30 ثانية.
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate('/pending-approval')}
                    className="w-full h-12 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-600 text-white shadow-lg"
                  >
                    <span className="flex items-center gap-2">متابعة صفحة الانتظار <ArrowLeft className="size-4" /></span>
                  </Button>
                </>
              ) : (
                // Normal approval flow
                <>
                  <div className="size-24 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="size-12 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground mb-2">تم إنشاء الحساب بنجاح!</h2>
                    <p className="text-xs text-muted-foreground">
                      مرحباً <span className="font-semibold text-foreground">{form.firstName}</span>، حسابك جاهز الآن.
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate('/login')}
                    className="w-full h-12 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                  >
                    <span className="flex items-center gap-2">تسجيل الدخول <ArrowLeft className="size-4" /></span>
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pb-4 text-center">
          <div className="flex items-center gap-4 w-full justify-center mb-2">
            <div className="flex-1 max-w-[100px] h-[1px] bg-blue-100 dark:bg-blue-900/30"></div>
            <span className="text-[8px] font-black text-blue-400 dark:text-blue-700 tracking-[0.2em] uppercase">Axion Security v2.0</span>
            <div className="flex-1 max-w-[100px] h-[1px] bg-blue-100 dark:bg-blue-900/30"></div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 tracking-wider">AXION CORE v3.9.1 - SECURE</span>
          </div>
          <span className="text-[8px] text-gray-300 dark:text-slate-700">© 2026 AXION OPERATIONS MANAGEMENT</span>
        </div>
      </div>
    </div>
  );
}
