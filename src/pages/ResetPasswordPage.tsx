import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, Loader2, Key, CheckCircle2 } from 'lucide-react';
import axionLogo from '@/assets/axion-logo.png';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({ password: '', confirm: '' });

  const validateForm = (): boolean => {
    const newErrors = { password: '', confirm: '' };
    let isValid = true;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({ password: '', confirm: '' });

    if (!validateForm()) return;
    setIsLoading(true);
    
    // First check if user has an active session (came from email link)
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      setIsLoading(false);
      toast({
        title: 'جلسة منتهية',
        description: 'يرجى استخدام رابط استعادة كلمة المرور الجديد من بريدك الإلكتروني',
        variant: 'destructive',
      });
      setTimeout(() => navigate('/forgot-password'), 1500);
      return;
    }
    
    const { error } = await supabase.auth.updateUser({ password: form.password });
    setIsLoading(false);
    if (error) {
      toast({
        title: 'فشل التغيير',
        description: error.message || 'تعذّر تحديث كلمة المرور. يرجى المحاولة مجدداً.',
        variant: 'destructive',
      });
      return;
    }
    setSuccess(true);
    toast({ title: 'تم بنجاح', description: 'تم تغيير كلمة المرور. سيتم توجيهك للدخول.' });
    
    // Sign out to force fresh login with new password
    await supabase.auth.signOut();
    setTimeout(() => navigate('/login'), 2500);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950" dir="rtl">
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.015]" 
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, currentColor 35px, currentColor 36px), repeating-linear-gradient(-45deg, transparent, transparent 35px, currentColor 35px, currentColor 36px)' }} 
      />

      <div className="relative z-10 w-full max-w-[440px]">
        <p className="text-right text-xs text-gray-400 dark:text-blue-300/70 mb-6 tracking-wide">إعادة تعيين<br /><span className="text-[10px] opacity-60">RESET PASSWORD</span></p>

        <div className="flex justify-center mb-8">
          <div className="w-32 h-32 rounded-3xl bg-white dark:bg-white/5 shadow-lg dark:shadow-blue-500/10 flex items-center justify-center border border-gray-100 dark:border-white/10">
            <img src={axionLogo} alt="AXION" className="w-20 h-20 object-contain" />
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-blue-500/5">
            <span className="text-lg font-bold text-gray-900 dark:text-white">أكسيون</span>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">AXION</span>
          </div>
        </div>

        <div className="bg-white dark:bg-white/5 rounded-3xl p-8 border border-gray-200 dark:border-white/10 shadow-lg dark:shadow-blue-500/5">
          {success ? (
            <div className="text-center space-y-6 py-3">
              <div className="size-24 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="size-12 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">تم تغيير كلمة المرور</h2>
                <p className="text-xs text-gray-600 dark:text-slate-400">يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="text-center mb-6">
                <Key className="size-12 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-gray-900 dark:text-white">كلمة مرور جديدة</h3>
              </div>

              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setErrors(prev => ({ ...prev, password: '' })); }}
                  placeholder="••••••••"
                  disabled={isLoading}
                  className={cn(
                    "h-12 rounded-2xl bg-white dark:bg-white/5 text-gray-900 dark:text-white text-right pr-4 pl-14",
                    errors.password
                      ? "border-2 border-red-500 dark:border-red-500"
                      : "border-gray-200 dark:border-white/10"
                  )}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
                {errors.password && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1 mr-1 font-medium">{errors.password}</p>
                )}
              </div>

              <div className="relative">
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={e => { setForm(f => ({ ...f, confirm: e.target.value })); setErrors(prev => ({ ...prev, confirm: '' })); }}
                  placeholder="تأكيد كلمة المرور"
                  disabled={isLoading}
                  className={cn(
                    "h-12 rounded-2xl bg-white dark:bg-white/5 text-gray-900 dark:text-white text-right pr-4 pl-14",
                    errors.confirm
                      ? "border-2 border-red-500 dark:border-red-500"
                      : "border-gray-200 dark:border-white/10"
                  )}
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
                {errors.confirm && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1 mr-1 font-medium">{errors.confirm}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 rounded-2xl font-bold text-base bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20"
              >
                {isLoading ? <Loader2 className="size-5 animate-spin" /> : 'تغيير كلمة المرور'}
              </Button>

              <div className="text-center">
                <Link to="/login" className="text-xs text-gray-600 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400">
                  العودة لتسجيل الدخول
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
