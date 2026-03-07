import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Loader2, Smartphone, Scan, Fingerprint, Headphones, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import axionLogo from '@/assets/axion-logo.png';

type LoginMode = 'cloud' | 'offline';

export default function LoginPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();

  const [mode, setMode] = useState<LoginMode>('cloud');
  const [showPassword, setShowPassword] = useState(false);
  const [showAccountMessage, setShowAccountMessage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });

  const validateForm = (): boolean => {
    const newErrors = { email: '', password: '' };
    let isValid = true;

    if (!email.trim()) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'البريد الإلكتروني غير صحيح';
      isValid = false;
    }

    if (!password) {
      newErrors.password = 'كلمة المرور مطلوبة';
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({ email: '', password: '' });

    if (!validateForm()) return;

    if (mode === 'offline') {
      toast({
        title: 'غير متاح حالياً',
        description: 'وضع عدم الاتصال قيد التطوير',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(email.trim(), password);
      
      // Pending admin approval
      if (result && (result as any).pendingApproval) {
        setIsLoading(false);
        navigate('/pending-approval');
        return;
      }

      // Needs email verification
      if (result && (result as any).needsVerification) {
        setIsLoading(false);
        toast({
          title: 'البريد الإلكتروني غير محقق',
          description: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني',
        });
        navigate('/verify-email', { state: { email: email.trim() } });
        return;
      }
      
      // Login successful
      // Don't call setIsLoading(false) here - let navigation happen
      navigate('/');
    } catch (err: any) {
      const errorMsg = err?.message || '';
      if (errorMsg.includes('Invalid login credentials')) {
        setErrors({ email: 'البريد الإلكتروني أو كلمة المرور غير صحيحة', password: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
      } else {
        toast({
          title: 'فشل تسجيل الدخول',
          description: errorMsg || 'حدث خطأ أثناء تسجيل الدخول',
          variant: 'destructive',
        });
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-background dark:bg-slate-950 flex flex-col items-center overflow-hidden font-sans select-none relative transition-colors duration-500" dir="rtl">
      {/* Background Pattern - Diamond Pattern */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none z-0" 
           style={{ 
             backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M30 0l30 30-30 30-30-30z\' fill=\'%230f172a\' fill-opacity=\'1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
             backgroundSize: '45px 45px' 
           }}>
      </div>

      <div className="w-full max-w-[400px] h-full z-10 flex flex-col p-4 pt-safe justify-between">
        <div className="flex flex-col flex-1 gap-1">
          {/* Header - Compact */}
          <div className="flex justify-between items-center mb-1 animate-in slide-in-from-top duration-500 fill-mode-both" dir="rtl">
            <div className="text-right flex flex-col items-end">
              <h2 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">مرحباً بعودتك</h2>
              <span className="text-[8px] text-gray-300 dark:text-slate-600 font-bold">WELCOME BACK</span>
            </div>
            <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full bg-blue-600 dark:bg-slate-100 flex items-center justify-center shadow-md active:scale-95 group border-2 border-white dark:border-slate-800 hover:rotate-12 transition-transform">
              <div className="flex gap-0.5">
                <div className="w-1 h-1 bg-white dark:bg-slate-900 rounded-full" />
                <div className="w-1 h-1 bg-white dark:bg-slate-900 rounded-full" />
                <div className="w-1 h-1 bg-white dark:bg-slate-900 rounded-full" />
              </div>
            </Button>
          </div>

          {/* Logo Section - AXION Real Assets */}
          <div className="flex flex-col items-center justify-center mb-6 animate-in zoom-in duration-700 delay-150 fill-mode-both">
            <div className="relative mb-4 group cursor-pointer">
              {/* Outer Glow / Halo */}
              <div className="absolute -inset-1.5 bg-blue-500/10 rounded-[24px] blur-md opacity-0 group-hover:opacity-100 transition duration-500"></div>
              
              <div className="w-24 h-24 flex items-center justify-center transition-all duration-500 hover:scale-105 active:scale-95 relative bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-2 border border-white/20">
                <img 
                  src={axionLogo} 
                  alt="AXION Logo" 
                  className="w-full h-full object-contain"
                />
                {/* Status Indicator / Pulse Point - Matching the Image */}
                <div className="absolute top-2 right-2 w-3.5 h-3.5 bg-blue-500 rounded-full border-[2.5px] border-white dark:border-[#1a1c1e] shadow-md ring-2 ring-blue-400/20 animate-pulse"></div>
              </div>
            </div>
            <div className="text-center relative">
              <div className="flex items-center justify-center gap-3 mb-1.5">
                <div className="bg-white/30 dark:bg-white/5 backdrop-blur-sm rounded-lg px-4 py-1 border border-white/10">
                  <h1 className="text-2xl font-bold">
                    <span className="text-gray-900 dark:text-white">أكسيون</span>
                    {' '}
                    <span className="text-blue-600 dark:text-blue-400">AXION</span>
                  </h1>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="h-[1px] w-6 bg-gradient-to-r from-transparent to-blue-200 dark:to-blue-900"></span>
                <span className="text-slate-400 dark:text-slate-500 text-[9px] font-black tracking-[0.5em] uppercase">Real Assets Management</span>
                <span className="h-[1px] w-6 bg-gradient-to-l from-transparent to-blue-200 dark:to-blue-900"></span>
              </div>
            </div>
          </div>

          {/* Mode Switcher - Compact */}
          <div className="grid grid-cols-2 gap-2 mb-2 animate-in slide-in-from-bottom duration-500 delay-300 fill-mode-both">
            <button 
              type="button"
              onClick={() => setMode('offline')}
              className={`flex items-center justify-between p-2 rounded-xl border transition-all h-14 shadow-sm active:scale-95 ${mode === 'offline' ? 'bg-blue-600 dark:bg-white text-white dark:text-slate-900 border-blue-600 dark:border-white ring-2 ring-blue-600/10' : 'bg-card dark:bg-slate-900 border-border dark:border-slate-800 text-gray-500'}`}
            >
              <div className="flex flex-col items-start leading-none text-right w-full">
                <span className={`text-[8px] font-bold ${mode === 'offline' ? 'text-slate-300 dark:text-slate-600' : 'text-gray-400'}`}>الدخول</span>
                <span className="text-[11px] font-black">وضع الأوفلاين</span>
              </div>
              <div className={`p-1.5 rounded-lg ${mode === 'offline' ? 'bg-white/10 dark:bg-slate-900/10 text-white dark:text-slate-900' : 'bg-gray-50 dark:bg-slate-800 text-gray-400'}`}>
                <Scan className="w-4 h-4" />
              </div>
            </button>

            <button 
              type="button"
              onClick={() => setMode('cloud')}
              className={`flex items-center justify-between p-2 rounded-xl border transition-all h-14 shadow-sm active:scale-95 ${mode === 'cloud' ? 'bg-blue-600 dark:bg-white text-white dark:text-slate-900 border-blue-600 dark:border-white ring-2 ring-blue-600/10' : 'bg-card dark:bg-slate-900 border-border dark:border-slate-800 text-gray-500'}`}
            >
              <div className="flex flex-col items-start leading-none text-right w-full">
                <span className={`text-[8px] font-bold ${mode === 'cloud' ? 'text-slate-300 dark:text-slate-600' : 'text-gray-400'}`}>الدخول</span>
                <span className="text-[11px] font-black">وضع السحابي</span>
              </div>
              <div className={`p-1.5 rounded-lg ${mode === 'cloud' ? 'bg-white/10 dark:bg-slate-900/10 text-white dark:text-slate-900' : 'bg-gray-50 dark:bg-slate-800 text-gray-400'}`}>
                <Smartphone className="w-4 h-4" />
              </div>
            </button>
          </div>

          {/* Form - Slim Fields */}
          <form onSubmit={handleSubmit} className="space-y-2 animate-in fade-in slide-in-from-bottom duration-700 delay-500 fill-mode-both">
            {/* Email */}
            <div className={cn(
              "bg-card dark:bg-slate-900 rounded-xl border shadow-sm h-16 flex items-center px-4 group transition-all focus-within:ring-2 focus-within:ring-slate-900/5 dark:focus-within:ring-white/5",
              errors.email ? 'border-red-500' : 'border-border dark:border-slate-800'
            )}>
              <div className="flex-1 flex flex-col justify-center">
                <span className="text-[9px] text-gray-400 dark:text-slate-500 font-black text-right uppercase tracking-tighter">Identity / البريد</span>
                <Input 
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: '' })); }}
                  placeholder="username@axion.system"
                  autoComplete="email"
                  disabled={isLoading}
                  className="border-none p-0 h-6 text-base font-black text-foreground focus-visible:ring-0 placeholder:text-muted-foreground/30 text-right bg-transparent shadow-none"
                />
              </div>
              <button 
                type="button" 
                onClick={() => setShowAccountMessage(true)} 
                className="flex items-center justify-center ml-2 text-slate-300 dark:text-slate-700 hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
              >
                <Users className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
            {errors.email && <p className="text-xs text-red-500 mr-1 font-medium">{errors.email}</p>}

            {/* Password */}
            <div className={cn(
              "bg-card dark:bg-slate-900 rounded-xl border shadow-sm h-16 flex items-center px-4 group transition-all focus-within:ring-2 focus-within:ring-slate-900/5 dark:focus-within:ring-white/5",
              errors.password ? 'border-red-500' : 'border-border dark:border-slate-800'
            )}>
              <div className="flex-1 flex flex-col justify-center">
                <span className="text-[9px] text-gray-400 dark:text-slate-500 font-black text-right uppercase tracking-tighter">Security / كلمة المرور</span>
                <Input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: '' })); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="border-none p-0 h-6 text-base font-black text-foreground text-right focus-visible:ring-0 placeholder:text-muted-foreground/30 bg-transparent shadow-none"
                />
              </div>
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="flex items-center justify-center ml-2 transition-colors"
              >
                {showPassword ? (
                  <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={2} />
                ) : (
                  <EyeOff className="w-5 h-5 text-slate-400 dark:text-slate-600" strokeWidth={2} />
                )}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500 mr-1 font-medium">{errors.password}</p>}

            <div className="flex justify-between px-1">
              <Link to="/forgot-password" className="text-[10px] font-bold text-slate-400 dark:text-slate-600 hover:text-slate-900 dark:hover:text-white transition-colors">
                استعادة الوصول؟
              </Link>
              <button type="button" className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                طلب مساعدة
              </button>
            </div>

            <div className="space-y-2 pt-2">
              <Button 
                type="submit" 
                className="w-full h-12 bg-blue-600 dark:bg-blue-400 hover:bg-blue-700 dark:hover:bg-blue-300 text-white dark:text-slate-950 text-base font-black rounded-xl shadow-lg transition-all active:scale-[0.98] border-none"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "دخول النظام"}
              </Button>

              <Button 
                type="button"
                variant="ghost"
                className="w-full h-10 text-blue-600/70 dark:text-blue-400/70 text-sm font-bold rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20"
                onClick={() => navigate('/register')}
              >
                ليس لديك حساب؟ اطلب صلاحية
              </Button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex flex-col items-center gap-3 pb-12 relative animate-in fade-in duration-1000 delay-700 fill-mode-both">
          <div className="flex items-center gap-4 w-full">
            <div className="flex-1 h-[1px] bg-blue-100 dark:bg-blue-900/30"></div>
            <span className="text-[8px] font-black text-blue-400 dark:text-blue-700 tracking-[0.2em] uppercase">Axion Security v2.0</span>
            <div className="flex-1 h-[1px] bg-blue-100 dark:bg-blue-900/30"></div>
          </div>
        
          <div className="flex gap-4 mb-4">
            {[
              { Icon: Fingerprint, label: 'Biometric' },
              { Icon: Scan, label: 'QR Scan' },
              { Icon: Headphones, label: 'Support' }
            ].map(({ Icon, label }, idx) => (
              <button 
                key={idx} 
                type="button"
                onClick={() => {
                  // Feature coming soon on Axion Mobile
                  console.log(`${label} feature coming soon`);
                }}
                className="w-12 h-12 bg-card dark:bg-slate-900 rounded-2xl shadow-sm border border-border dark:border-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:shadow-md transition-all active:scale-90"
              >
                <Icon className="w-5 h-5" strokeWidth={1.5} />
              </button>
            ))}
          </div>

          <div className="w-full flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 tracking-wider">AXION CORE v3.9.1 - SECURE</span>
            </div>
            <span className="text-[8px] text-gray-300 dark:text-slate-700">© 2026 AXION OPERATIONS MANAGEMENT</span>
          </div>

          {/* Notification Overlay */}
          {showAccountMessage && (
            <div className="absolute bottom-16 left-0 right-0 px-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-blue-600 dark:bg-white h-12 rounded-xl flex items-center justify-between px-4 shadow-2xl border border-white/10 dark:border-black/5">
                <span className="text-white dark:text-slate-900 text-[11px] font-medium text-right w-full ml-4">
                  لا توجد لديك حسابات نشطة أخرى حالياً
                </span>
                <button 
                  onClick={() => setShowAccountMessage(false)}
                  className="w-6 h-6 bg-white/10 dark:bg-slate-900/10 rounded-lg flex items-center justify-center hover:bg-white/20 dark:hover:bg-slate-900/20 transition-colors"
                >
                  <X className="w-4 h-4 text-white dark:text-slate-900" strokeWidth={2} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
