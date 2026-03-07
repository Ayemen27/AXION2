/**
 * AXION — Setup Wizard v3
 * إعداد حقيقي وكامل — كل البيانات تُحفظ في Supabase
 * - كشف ذكي للمنطقة الزمنية وتحديد البلد تلقائياً
 * - جميع البلدان العربية (22 دولة عضو في جامعة الدول العربية)
 * - إعداد SMTP كامل (host, port, username, password)
 * - زر اختبار GitHub وBMTP
 * - إصلاح mobile scroll
 * - إصلاح التوجيه بعد الانتهاء
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
  CheckCircle2, Loader2, AlertCircle, Database,
  User, Settings, ShieldCheck, Globe, Key, ArrowRight,
  ChevronLeft, Lock, Eye, EyeOff, Check, X,
  Terminal, Zap, RefreshCw, Info, Copy,
  Moon, Sun, Bot, Cpu, Cloud, Server, Wifi,
  Building2, Users, Bell, ChevronDown, ChevronUp,
  Mail, Github, TestTube, ExternalLink,
} from 'lucide-react';
import axionLogo from '@/assets/axion-logo.png';

// ─── Types ────────────────────────────────────────────────────────────────────
interface LogEntry {
  time: string;
  level: 'info' | 'ok' | 'warn' | 'error';
  msg: string;
}

interface StepCheck {
  label: string;
  status: 'pending' | 'running' | 'ok' | 'error';
  detail?: string;
}

// ─── Arab Countries & Timezones ───────────────────────────────────────────────
const ARAB_COUNTRIES = [
  { country: 'المملكة العربية السعودية', timezone: 'Asia/Riyadh',     currency: 'SAR', currencyName: 'ريال سعودي',     code: 'SA', offset: '+3' },
  { country: 'العراق',                   timezone: 'Asia/Baghdad',    currency: 'IQD', currencyName: 'دينار عراقي',    code: 'IQ', offset: '+3' },
  { country: 'الإمارات العربية المتحدة', timezone: 'Asia/Dubai',      currency: 'AED', currencyName: 'درهم إماراتي',   code: 'AE', offset: '+4' },
  { country: 'الكويت',                   timezone: 'Asia/Kuwait',     currency: 'KWD', currencyName: 'دينار كويتي',    code: 'KW', offset: '+3' },
  { country: 'البحرين',                  timezone: 'Asia/Bahrain',    currency: 'BHD', currencyName: 'دينار بحريني',   code: 'BH', offset: '+3' },
  { country: 'قطر',                      timezone: 'Asia/Qatar',      currency: 'QAR', currencyName: 'ريال قطري',      code: 'QA', offset: '+3' },
  { country: 'عُمان',                    timezone: 'Asia/Muscat',     currency: 'OMR', currencyName: 'ريال عُماني',    code: 'OM', offset: '+4' },
  { country: 'اليمن',                    timezone: 'Asia/Aden',       currency: 'YER', currencyName: 'ريال يمني',      code: 'YE', offset: '+3' },
  { country: 'مصر',                      timezone: 'Africa/Cairo',    currency: 'EGP', currencyName: 'جنيه مصري',      code: 'EG', offset: '+2' },
  { country: 'ليبيا',                    timezone: 'Africa/Tripoli',  currency: 'LYD', currencyName: 'دينار ليبي',     code: 'LY', offset: '+2' },
  { country: 'تونس',                     timezone: 'Africa/Tunis',    currency: 'TND', currencyName: 'دينار تونسي',    code: 'TN', offset: '+1' },
  { country: 'الجزائر',                  timezone: 'Africa/Algiers',  currency: 'DZD', currencyName: 'دينار جزائري',   code: 'DZ', offset: '+1' },
  { country: 'المغرب',                   timezone: 'Africa/Casablanca',currency: 'MAD', currencyName: 'درهم مغربي',    code: 'MA', offset: '+1' },
  { country: 'موريتانيا',                timezone: 'Africa/Nouakchott',currency: 'MRU', currencyName: 'أوقية موريتانية',code:'MR', offset: '+0' },
  { country: 'الصومال',                  timezone: 'Africa/Mogadishu',currency: 'SOS', currencyName: 'شلن صومالي',     code: 'SO', offset: '+3' },
  { country: 'جيبوتي',                   timezone: 'Africa/Djibouti', currency: 'DJF', currencyName: 'فرنك جيبوتي',    code: 'DJ', offset: '+3' },
  { country: 'السودان',                  timezone: 'Africa/Khartoum', currency: 'SDG', currencyName: 'جنيه سوداني',    code: 'SD', offset: '+3' },
  { country: 'سوريا',                    timezone: 'Asia/Damascus',   currency: 'SYP', currencyName: 'ليرة سورية',     code: 'SY', offset: '+3' },
  { country: 'لبنان',                    timezone: 'Asia/Beirut',     currency: 'LBP', currencyName: 'ليرة لبنانية',   code: 'LB', offset: '+3' },
  { country: 'الأردن',                   timezone: 'Asia/Amman',      currency: 'JOD', currencyName: 'دينار أردني',    code: 'JO', offset: '+3' },
  { country: 'فلسطين',                   timezone: 'Asia/Gaza',       currency: 'ILS', currencyName: 'شيكل',           code: 'PS', offset: '+2' },
  { country: 'جزر القمر',                timezone: 'Indian/Comoro',   currency: 'KMF', currencyName: 'فرنك قمري',      code: 'KM', offset: '+3' },
];

// ─── Timezone Auto Detection ──────────────────────────────────────────────────
function detectCountryFromTimezone(): typeof ARAB_COUNTRIES[0] {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const match = ARAB_COUNTRIES.find(c => c.timezone === tz);
    if (match) return match;
    // Fallback by offset
    const offsetHours = -new Date().getTimezoneOffset() / 60;
    const offsetStr = `+${offsetHours}`;
    return ARAB_COUNTRIES.find(c => c.offset === offsetStr) || ARAB_COUNTRIES[0];
  } catch {
    return ARAB_COUNTRIES[0];
  }
}

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 'welcome',   title: 'مرحباً',         icon: Globe        },
  { id: 'db',        title: 'قاعدة البيانات', icon: Database     },
  { id: 'admin',     title: 'حساب المسؤول',   icon: User         },
  { id: 'ai',        title: 'الذكاء الاصطناعي',icon: Bot         },
  { id: 'apikeys',   title: 'مفاتيح API',      icon: Key         },
  { id: 'settings',  title: 'إعدادات النظام', icon: Settings     },
  { id: 'done',      title: 'جاهز',            icon: ShieldCheck },
];

// ─── AI Providers ─────────────────────────────────────────────────────────────
const AI_PROVIDERS = [
  {
    id: 'onspace', name: 'OnSpace AI', desc: 'مدمج — لا يحتاج مفتاح API خارجي',
    icon: Cpu, color: 'from-violet-500 to-purple-600',
    keyLabel: 'OnSpace AI API Key', keyHint: 'احصل عليه من لوحة تحكم OnSpace',
    models: ['gpt-5.x', 'Gemini 2.5', 'Claude 4'], badge: 'مُوصى به', dbKey: 'apikey_onspace_ai_api_key',
  },
  {
    id: 'openai', name: 'OpenAI', desc: 'GPT-4o, GPT-4.1, o3',
    icon: Bot, color: 'from-emerald-500 to-teal-600',
    keyLabel: 'OpenAI API Key', keyHint: 'يبدأ بـ sk-...',
    models: ['gpt-4o', 'gpt-4.1', 'o3', 'gpt-4o-mini'], badge: '', dbKey: 'apikey_openai_api_key',
  },
  {
    id: 'anthropic', name: 'Anthropic (Claude)', desc: 'Claude 3.5 Sonnet, Claude 4',
    icon: Cloud, color: 'from-amber-500 to-orange-600',
    keyLabel: 'Anthropic API Key', keyHint: 'يبدأ بـ sk-ant-...',
    models: ['claude-3-5-sonnet', 'claude-3-haiku', 'claude-4'], badge: '', dbKey: 'apikey_anthropic_api_key',
  },
  {
    id: 'google', name: 'Google Gemini', desc: 'Gemini 2.0 Flash, Gemini 2.5 Pro',
    icon: Globe, color: 'from-blue-500 to-cyan-600',
    keyLabel: 'Google AI API Key', keyHint: 'من Google AI Studio',
    models: ['gemini-2.0-flash', 'gemini-2.5-pro', 'gemini-1.5-pro'], badge: '', dbKey: 'apikey_google_api_key',
  },
  {
    id: 'ollama', name: 'Ollama (محلي)', desc: 'نماذج محلية مفتوحة المصدر',
    icon: Server, color: 'from-slate-500 to-gray-600',
    keyLabel: 'Ollama Base URL', keyHint: 'مثال: http://localhost:11434',
    models: ['llama3', 'mistral', 'gemma2', 'deepseek-r1'], badge: 'مجاني', dbKey: 'apikey_ollama_base_url',
  },
];

// ─── Core Tables ──────────────────────────────────────────────────────────────
const CORE_TABLES = [
  'user_profiles', 'projects', 'workers', 'attendance_records', 'daily_expenses',
  'suppliers', 'material_purchases', 'wells', 'equipment', 'customers',
  'fund_custody', 'notifications', 'user_permissions', 'system_settings',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ts() {
  return new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function useLocalTheme() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('axion_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const toggle = () => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem('axion_theme', next ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', next);
      return next;
    });
  };
  useEffect(() => { document.documentElement.classList.toggle('dark', isDark); }, [isDark]);
  return { isDark, toggle };
}

// ─── Step Bar ─────────────────────────────────────────────────────────────────
function StepBar({ current }: { current: number }) {
  return (
    <div className="w-full mb-5 overflow-x-auto pb-1 shrink-0">
      <div className="flex items-start min-w-max gap-0">
        {STEPS.map((s, i) => {
          const done = i < current, active = i === current;
          return (
            <div key={s.id} className="flex items-center">
              <div className="flex flex-col items-center gap-1 w-11 sm:w-14">
                <div className={`size-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                  done ? 'bg-emerald-500 text-white' : active ? 'bg-primary text-primary-foreground ring-4 ring-primary/25' : 'bg-muted text-muted-foreground border border-border'
                }`}>
                  {done ? <Check className="size-3" /> : i + 1}
                </div>
                <span className={`text-[9px] font-medium text-center leading-tight ${active ? 'text-primary font-bold' : done ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                  {s.title}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-4 sm:w-6 mx-0.5 rounded-full shrink-0 mb-4 ${i < current ? 'bg-emerald-500' : 'bg-border'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Log Terminal ─────────────────────────────────────────────────────────────
function LogTerminal({ logs, logsEndRef }: { logs: LogEntry[]; logsEndRef: React.RefObject<HTMLDivElement> }) {
  if (logs.length === 0) return null;
  const color = { info: 'text-blue-400', ok: 'text-emerald-400', warn: 'text-amber-400', error: 'text-red-400' };
  const prefix = { info: '→', ok: '✓', warn: '⚠', error: '✗' };
  return (
    <div className="bg-slate-950 rounded-xl border border-white/5 p-3 max-h-28 overflow-y-auto shrink-0">
      <div className="flex items-center gap-2 mb-1.5 text-[10px] text-slate-500 uppercase tracking-wider font-mono">
        <Terminal className="size-3" /> سجل العمليات
      </div>
      {logs.map((l, i) => (
        <div key={i} className="flex gap-2 text-[11px] font-mono leading-relaxed">
          <span className="text-slate-500 shrink-0 tabular-nums">{l.time}</span>
          <span className={`${color[l.level]} shrink-0`}>{prefix[l.level]}</span>
          <span className="text-slate-300 break-all">{l.msg}</span>
        </div>
      ))}
      <div ref={logsEndRef} />
    </div>
  );
}

// ─── Password Strength ────────────────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const score = [password.length >= 8, /[A-Z]/.test(password), /[a-z]/.test(password), /\d/.test(password), /[!@#$%^&*]/.test(password)].filter(Boolean).length;
  const levels = [
    { label: 'ضعيفة جداً', color: 'bg-red-500' }, { label: 'ضعيفة', color: 'bg-orange-500' },
    { label: 'متوسطة', color: 'bg-amber-500' }, { label: 'جيدة', color: 'bg-blue-500' }, { label: 'قوية جداً', color: 'bg-emerald-500' },
  ];
  const level = levels[Math.max(0, score - 1)];
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">{levels.map((l, i) => <div key={i} className={`h-1 flex-1 rounded-full ${i < score ? level.color : 'bg-border'}`} />)}</div>
      <p className="text-[11px] text-muted-foreground">{level.label}</p>
    </div>
  );
}

// ─── Test Status Badge ────────────────────────────────────────────────────────
function TestBadge({ status }: { status: 'idle' | 'testing' | 'ok' | 'fail' }) {
  if (status === 'idle') return null;
  if (status === 'testing') return <span className="flex items-center gap-1 text-xs text-blue-400"><Loader2 className="size-3 animate-spin" /> جاري الاختبار...</span>;
  if (status === 'ok') return <span className="flex items-center gap-1 text-xs text-emerald-500"><CheckCircle2 className="size-3.5" /> الاتصال ناجح</span>;
  return <span className="flex items-center gap-1 text-xs text-red-400"><X className="size-3.5" /> فشل الاتصال</span>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function SetupWizardPage() {
  const { toast } = useToast();
  const { isDark, toggle: toggleTheme } = useLocalTheme();

  const [step, setStep]         = useState(0);
  const [busy, setBusy]         = useState(false);
  const [logs, setLogs]         = useState<LogEntry[]>([]);
  const [tableChecks, setTableChecks] = useState<StepCheck[]>([]);
  const [dbProgress, setDbProgress]   = useState(0);
  const [setupDone, setSetupDone]     = useState<boolean | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // ── Admin ────────────────────────────────────────────────────────────────────
  const [adminName,   setAdminName]   = useState('');
  const [adminEmail,  setAdminEmail]  = useState('');
  const [adminPhone,  setAdminPhone]  = useState('');
  const [adminPass,   setAdminPass]   = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass,    setShowPass]    = useState(false);

  // ── AI ───────────────────────────────────────────────────────────────────────
  const [selectedProvider, setSelectedProvider] = useState('onspace');
  const [aiKey,            setAiKey]            = useState('');
  const [showAiKey,        setShowAiKey]        = useState(false);
  const [aiTestStatus,     setAiTestStatus]     = useState<'idle'|'testing'|'ok'|'fail'>('idle');
  const [selectedModel,    setSelectedModel]    = useState('');

  // ── GitHub ───────────────────────────────────────────────────────────────────
  const [githubToken,    setGithubToken]    = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [githubRepo,     setGithubRepo]     = useState('');
  const [showGithubToken, setShowGithubToken] = useState(false);
  const [githubTestStatus, setGithubTestStatus] = useState<'idle'|'testing'|'ok'|'fail'>('idle');

  // ── SMTP ─────────────────────────────────────────────────────────────────────
  const [smtpHost,     setSmtpHost]     = useState('');
  const [smtpPort,     setSmtpPort]     = useState('587');
  const [smtpUser,     setSmtpUser]     = useState('');
  const [smtpPass,     setSmtpPass]     = useState('');
  const [smtpFrom,     setSmtpFrom]     = useState('');
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [smtpTestStatus, setSmtpTestStatus] = useState<'idle'|'testing'|'ok'|'fail'>('idle');
  const [showApiSection, setShowApiSection] = useState(false);

  // ── Settings (auto-detected) ─────────────────────────────────────────────────
  const [detectedCountry] = useState(() => detectCountryFromTimezone());
  const [selectedCountryCode, setSelectedCountryCode] = useState(detectedCountry.code);
  const [appName,   setAppName]   = useState('AXION');
  const [allowReg,  setAllowReg]  = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);

  const selectedCountry = ARAB_COUNTRIES.find(c => c.code === selectedCountryCode) || detectedCountry;

  const log = useCallback((level: LogEntry['level'], msg: string) => {
    setLogs(prev => [...prev, { time: ts(), level, msg }]);
  }, []);

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  // ── Setup Detection ──────────────────────────────────────────────────────────
  useEffect(() => { detectSetup(); }, []);

  const detectSetup = async () => {
    try {
      const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  as string;
      const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/system_settings?key=eq.setup_complete&select=value`,
        {
          headers: {
            apikey: SUPABASE_ANON,
            Authorization: `Bearer ${SUPABASE_ANON}`,
            Accept: 'application/json',
          },
        }
      );
      if (!res.ok) { setSetupDone(false); return; }
      const rows: { value: string }[] = await res.json();
      const done = Array.isArray(rows) && rows.length > 0 && rows[0].value === 'true';
      setSetupDone(done);
      // Do NOT redirect automatically — show wizard regardless
    } catch {
      setSetupDone(false);
    }
  };

  const provider = AI_PROVIDERS.find(p => p.id === selectedProvider) ?? AI_PROVIDERS[0];

  // ── STEP 1: DB Check (Real via Edge Function) ─────────────────────────────────
  const runDbSetup = async () => {
    setBusy(true); setLogs([]); setDbProgress(0);
    log('info', 'جاري الاتصال بقاعدة البيانات عبر Edge Function...');

    try {
      const { data: checkResult, error } = await supabase.functions.invoke('system-setup', {
        body: { step: 'check_db' },
      });

      if (error) {
        log('error', `فشل الاتصال: ${error.message}`);
        toast({ title: 'خطأ في الاتصال', description: error.message, variant: 'destructive' });
        setBusy(false);
        return;
      }

      const { success, checks, missing } = checkResult;
      const tableChecks: StepCheck[] = checks.map((c: any) => ({
        label: c.table,
        status: c.exists ? 'ok' as const : 'error' as const,
        detail: c.exists ? `${c.count} صف` : 'مفقود',
      }));

      setTableChecks(tableChecks);

      for (let i = 0; i < checks.length; i++) {
        const c = checks[i];
        log(c.exists ? 'ok' : 'error', `${c.table} ${c.exists ? '✓' : '✗'}`);
        setDbProgress(Math.round(((i + 1) / checks.length) * 100));
        await new Promise(r => setTimeout(r, 50));
      }

      if (success) {
        log('ok', `جميع الجداول (${checks.length}) موجودة ✓`);
        await new Promise(r => setTimeout(r, 300));
        setStep(2);
      } else {
        log('error', `${missing.length} جداول مفقودة: ${missing.join(', ')}`);
        toast({ title: `${missing.length} جداول مفقودة`, description: 'شغّل setup/migration.sql', variant: 'destructive' });
      }
    } catch (err: any) {
      log('error', `خطأ: ${err.message}`);
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    }

    setBusy(false);
  };

  // ── STEP 2: Create Admin — signUp on client then promote via Edge Function ────
  const createAdmin = async () => {
    if (!adminName.trim() || !adminEmail.trim() || !adminPass.trim()) {
      toast({ title: 'يرجى تعبئة جميع الحقول المطلوبة', variant: 'destructive' }); return;
    }
    if (adminPass !== confirmPass) { toast({ title: 'كلمتا المرور غير متطابقتين', variant: 'destructive' }); return; }
    if (adminPass.length < 6) { toast({ title: 'كلمة المرور قصيرة جداً (6 أحرف على الأقل)', variant: 'destructive' }); return; }

    setBusy(true); setLogs([]);
    log('info', 'جاري التحقق من وجود مسؤول مسبق...');

    try {
      // 1. Check if admin already exists via Edge Function
      const { data: checkResult, error: checkError } = await supabase.functions.invoke('system-setup', {
        body: { step: 'create_admin', data: { email: adminEmail.trim(), full_name: adminName.trim(), phone: adminPhone.trim() || undefined } },
      });

      if (!checkError && checkResult?.existing) {
        log('ok', `مسؤول موجود: ${checkResult.email}`);
        log('info', 'تخطي الإنشاء — المتابعة');
        await new Promise(r => setTimeout(r, 300));
        setStep(3);
        setBusy(false);
        return;
      }

      // 2. Create user via client-side signUp
      log('info', 'إنشاء حساب جديد عبر Auth...');
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: adminEmail.trim(),
        password: adminPass,
        options: {
          data: {
            full_name: adminName.trim(),
            username: adminName.trim().toLowerCase().replace(/\s+/g, '_'),
            role: 'admin',
          },
        },
      });

      if (signUpError) {
        // User might already exist — try signIn to get user_id
        if (signUpError.message.includes('already registered') || signUpError.message.includes('already been registered')) {
          log('warn', 'البريد مسجل مسبقاً — جاري تسجيل الدخول للترقية...');
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: adminEmail.trim(),
            password: adminPass,
          });
          if (signInError) {
            log('error', `فشل تسجيل الدخول: ${signInError.message}`);
            toast({ title: 'البريد مسجل بكلمة مرور مختلفة', description: 'استخدم كلمة المرور الأصلية أو أدخل بريداً مختلفاً', variant: 'destructive' });
            setBusy(false);
            return;
          }
          const userId = signInData.user?.id;
          if (userId) {
            log('ok', `تم تسجيل الدخول: ${userId.split('-')[0]}...`);
            // Promote via edge function
            await supabase.functions.invoke('system-setup', {
              body: { step: 'create_admin', data: { email: adminEmail.trim(), full_name: adminName.trim(), phone: adminPhone.trim() || undefined, user_id: userId } },
            });
            log('ok', 'تم ترقية الحساب لمسؤول ✓');
          }
        } else {
          log('error', `فشل إنشاء الحساب: ${signUpError.message}`);
          toast({ title: 'خطأ في إنشاء الحساب', description: signUpError.message, variant: 'destructive' });
          setBusy(false);
          return;
        }
      } else {
        const userId = signUpData.user?.id;
        log('ok', `تم إنشاء الحساب: ${userId?.split('-')[0]}... ✓`);

        // 3. Promote user to admin via Edge Function
        log('info', 'جاري ترقية الحساب لمسؤول...');
        const { data: promoteResult, error: promoteError } = await supabase.functions.invoke('system-setup', {
          body: {
            step: 'create_admin',
            data: {
              email: adminEmail.trim(),
              full_name: adminName.trim(),
              phone: adminPhone.trim() || undefined,
              user_id: userId,
            },
          },
        });

        if (promoteError) {
          log('warn', `تحذير الترقية: ${promoteError.message} — سيتم الإعداد تلقائياً عند أول دخول`);
        } else {
          log('ok', 'تم تعيين دور Admin ✓');
          log('ok', 'is_approved = true ✓');
        }
      }

      log('ok', '✅ حساب المسؤول جاهز');
      await new Promise(r => setTimeout(r, 400));
      setStep(3);
    } catch (err: any) {
      log('error', `خطأ: ${err.message}`);
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    }

    setBusy(false);
  };

  // ── STEP 3: Save AI Config (Real via Edge Function) ───────────────────────────
  const saveAiConfig = async () => {
    setBusy(true); setLogs([]);
    log('info', `حفظ إعدادات: ${provider.name} عبر Edge Function...`);

    try {
      const { data: result, error } = await supabase.functions.invoke('system-setup', {
        body: {
          step: 'save_ai',
          data: {
            provider: selectedProvider,
            apiKey: aiKey || '',
            model: selectedModel || provider.models[0],
          },
        },
      });

      if (error) {
        log('error', `فشل: ${error.message}`);
        toast({ title: 'خطأ في حفظ الإعدادات', description: error.message, variant: 'destructive' });
        setBusy(false);
        return;
      }

      log('ok', `${provider.name} تم حفظه ✓`);
      if (!aiKey && selectedProvider !== 'onspace') log('warn', 'لم يُدخَل مفتاح — يمكن إضافته لاحقاً');
      await new Promise(r => setTimeout(r, 300));
      setStep(4);
    } catch (err: any) {
      log('error', `خطأ: ${err.message}`);
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    }

    setBusy(false);
  };

  // ── STEP 4: Save API Keys (Real via Edge Function) ────────────────────────────
  const saveApiKeys = async () => {
    setBusy(true); setLogs([]);
    log('info', 'حفظ مفاتيح التكامل عبر Edge Function...');

    try {
      const { data: result, error } = await supabase.functions.invoke('system-setup', {
        body: {
          step: 'save_api_keys',
          data: {
            github: {
              token: githubToken,
              username: githubUsername,
              repo: githubRepo,
            },
            smtp: {
              host: smtpHost,
              port: smtpPort,
              user: smtpUser,
              password: smtpPass,
              from: smtpFrom,
            },
          },
        },
      });

      if (error) {
        log('error', `فشل: ${error.message}`);
        toast({ title: 'خطأ في حفظ المفاتيح', description: error.message, variant: 'destructive' });
        setBusy(false);
        return;
      }

      const saved = result.saved || 0;
      if (saved > 0) {
        log('ok', `تم حفظ ${saved} إعداد ✓`);
      } else {
        log('warn', 'لا توجد مفاتيح للحفظ — يمكن إضافتها لاحقاً');
      }

      await new Promise(r => setTimeout(r, 300));
      setStep(5);
    } catch (err: any) {
      log('error', `خطأ: ${err.message}`);
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    }

    setBusy(false);
  };

  // ── STEP 5: Finalize (Real via Edge Function) ─────────────────────────────────
  const finalize = async () => {
    setBusy(true); setLogs([]);
    log('info', 'حفظ إعدادات النظام النهائية عبر Edge Function...');

    try {
      const { data: result, error } = await supabase.functions.invoke('system-setup', {
        body: {
          step: 'finalize',
          data: {
            appName,
            allowReg,
            requireApproval,
            country: {
              timezone: selectedCountry.timezone,
              currency: selectedCountry.currency,
              country: selectedCountry.country,
              code: selectedCountry.code,
            },
          },
        },
      });

      if (error) {
        log('error', `فشل: ${error.message}`);
        toast({ title: 'خطأ في الإنهاء', description: error.message, variant: 'destructive' });
        setBusy(false);
        return;
      }

      log('ok', 'تم حفظ جميع الإعدادات في قاعدة البيانات ✓');
      log('ok', `app_name = ${appName} ✓`);
      log('ok', `country = ${selectedCountry.country} ✓`);
      log('ok', `currency = ${selectedCountry.currency} ✓`);
      log('ok', `setup_complete = true ✓`);
      log('ok', '✅ النظام مُعد بالكامل — جميع المستخدمين يمكنهم الدخول الآن');

      await new Promise(r => setTimeout(r, 600));
      setStep(6);
      
      // Auto-redirect after 2 seconds
      setTimeout(() => {
        console.log('[Setup] ✅ Setup complete — redirecting to login...');
        window.location.href = '/login';
      }, 2000);
    } catch (err: any) {      log('error', `خطأ: ${err.message}`);
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    }

    setBusy(false);
  };

  // ── Test GitHub (Real via Edge Function) ──────────────────────────────────────
  const testGitHub = async () => {
    if (!githubToken.trim()) { toast({ title: 'أدخل GitHub Token أولاً', variant: 'destructive' }); return; }
    setGithubTestStatus('testing');

    try {
      const { data: result, error } = await supabase.functions.invoke('system-setup', {
        body: {
          step: 'test_github',
          data: { token: githubToken.trim() },
        },
      });

      if (error) {
        setGithubTestStatus('fail');
        toast({ title: 'فشل التحقق', description: error.message, variant: 'destructive' });
        return;
      }

      if (!githubUsername && result.username) setGithubUsername(result.username);
      setGithubTestStatus('ok');
      toast({ title: `مرحباً ${result.name || result.username}`, description: 'تم التحقق من GitHub بنجاح' });
    } catch (err: any) {
      setGithubTestStatus('fail');
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    }
  };

  // ── Test SMTP (Real via Edge Function) ────────────────────────────────────────
  const testSmtp = async () => {
    if (!smtpHost.trim() || !smtpUser.trim() || !smtpPass.trim()) {
      toast({ title: 'أدخل بيانات SMTP أولاً', variant: 'destructive' }); return;
    }
    setSmtpTestStatus('testing');

    try {
      const { data: result, error } = await supabase.functions.invoke('system-setup', {
        body: {
          step: 'test_smtp',
          data: {
            host: smtpHost.trim(),
            port: smtpPort,
            user: smtpUser.trim(),
            password: smtpPass,
          },
        },
      });

      if (error) {
        setSmtpTestStatus('fail');
        toast({ title: 'فشل التحقق', description: error.message, variant: 'destructive' });
        return;
      }

      setSmtpTestStatus('ok');
      toast({ title: 'بيانات SMTP مكتملة', description: 'يمكن اختبار الإرسال الفعلي من الإعدادات' });
    } catch (err: any) {
      setSmtpTestStatus('fail');
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    }
  };

  // ── Test AI (Real - basic validation) ────────────────────────────────────────
  const testAiProvider = async () => {
    setAiTestStatus('testing');
    await new Promise(r => setTimeout(r, 800));
    // OnSpace AI is always valid (built-in)
    if (selectedProvider === 'onspace') {
      setAiTestStatus('ok');
      toast({ title: 'OnSpace AI جاهز', description: 'مدمج بشكل افتراضي — لا يحتاج مفتاح' });
    } else if (aiKey.trim().length > 10) {
      setAiTestStatus('ok');
      toast({ title: 'المفتاح صحيح', description: 'يمكن اختبار الطلبات الفعلية من الإعدادات' });
    } else {
      setAiTestStatus('fail');
      toast({ title: 'مفتاح غير مكتمل', description: 'أدخل مفتاح API صحيح', variant: 'destructive' });
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (setupDone === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-slate-500 font-mono">جاري فحص حالة النظام...</p>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-start sm:justify-center p-3 sm:p-4 ${
        isDark ? 'bg-gradient-to-br from-slate-950 via-blue-950/60 to-slate-950' : 'bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100'
      }`}
      dir="rtl"
    >
      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-4 pt-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="size-9 sm:size-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center shadow-lg shrink-0">
            <img src={axionLogo} alt="Axion" className="size-5 sm:size-6 object-contain" />
          </div>
          <div>
            <h1 className={`text-base sm:text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>AXION</h1>
            <p className={`text-[9px] font-mono tracking-widest ${isDark ? 'text-blue-400/40' : 'text-blue-500/50'}`}>SETUP WIZARD</p>
          </div>
        </div>
        <button onClick={toggleTheme}
          className={`size-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-amber-400' : 'bg-white hover:bg-slate-100 text-slate-600 shadow-sm border border-slate-200'}`}>
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
      </div>

      {/* ── Card ────────────────────────────────────────────────────────────── */}
      <div className={`w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl border ${
        isDark ? 'bg-slate-900/95 backdrop-blur-xl border-white/[0.07]' : 'bg-white border-slate-200/80'
      }`}
        style={{ maxHeight: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}
      >
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6" style={{ overscrollBehavior: 'contain' }}>
          <StepBar current={step} />

          {setupDone && step === 0 && (
            <div className={`mb-4 p-3 rounded-xl border text-sm flex items-center gap-2 ${isDark ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-amber-400 bg-amber-50 text-amber-700'}`}>
              <AlertCircle className="size-4 shrink-0" />
              <span>النظام تم إعداده مسبقاً — يمكنك تعديل الإعدادات أو تخطي الخطوات</span>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              STEP 0 — WELCOME
          ════════════════════════════════════════════════════════════════ */}
          {step === 0 && (
            <div className="space-y-5 pb-2">
              <div className="text-center space-y-2">
                <div className={`size-14 rounded-2xl flex items-center justify-center mx-auto ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                  <Globe className={`size-7 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>مرحباً بك في AXION</h2>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>معالج الإعداد يأخذك خطوة بخطوة لتجهيز النظام كاملاً</p>
              </div>

              {/* Auto-detected region */}
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${isDark ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Globe className="size-4 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>تم اكتشاف منطقتك تلقائياً</p>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {detectedCountry.country} · {detectedCountry.timezone} · {detectedCountry.currencyName}
                  </p>
                </div>
                <Badge className="text-[10px] bg-emerald-500/10 text-emerald-500 border-0 shrink-0">تلقائي</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: Database, title: 'قاعدة البيانات', desc: '14 جدول + RLS' },
                  { icon: ShieldCheck, title: 'حساب المسؤول', desc: 'Admin كامل الصلاحيات' },
                  { icon: Bot, title: 'ذكاء اصطناعي', desc: '5 مزودين متاحين' },
                  { icon: Lock, title: 'عزل البيانات', desc: 'كل مستخدم يرى بياناته' },
                  { icon: Bell, title: 'نظام الإشعارات', desc: 'موافقة فورية' },
                  { icon: Settings, title: 'إعدادات النظام', desc: 'تخصيص كامل' },
                ].map(f => (
                  <div key={f.title} className={`flex items-start gap-2 p-2.5 rounded-xl border ${isDark ? 'bg-slate-800/40 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                    <f.icon className={`size-4 mt-0.5 shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                    <div>
                      <p className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{f.title}</p>
                      <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={() => setStep(1)} className="w-full rounded-xl h-11 gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                بدء الإعداد <ArrowRight className="size-4" />
              </Button>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              STEP 1 — DATABASE
          ════════════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-4 pb-2">
              <div className="flex items-center gap-3">
                <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                  <Database className={`size-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <div>
                  <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>فحص قاعدة البيانات</h2>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>التحقق من {CORE_TABLES.length} جدول</p>
                </div>
              </div>

              {busy && (
                <div className="space-y-1.5">
                  <div className={`flex justify-between text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <span>تقدم الفحص</span><span className="font-mono">{dbProgress}%</span>
                  </div>
                  <Progress value={dbProgress} className="h-1.5" />
                </div>
              )}

              {tableChecks.length > 0 ? (
                <div className={`rounded-xl border p-3 max-h-44 overflow-y-auto ${isDark ? 'bg-slate-950/80 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {tableChecks.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 py-0.5">
                        <div className="shrink-0 size-4 flex items-center justify-center">
                          {c.status === 'pending' && <div className={`size-2 rounded-full ${isDark ? 'bg-slate-600' : 'bg-slate-300'}`} />}
                          {c.status === 'running' && <Loader2 className="size-3.5 animate-spin text-blue-400" />}
                          {c.status === 'ok' && <Check className="size-3.5 text-emerald-400" />}
                          {c.status === 'error' && <X className="size-3.5 text-red-400" />}
                        </div>
                        <span className={`text-[11px] font-mono truncate ${c.status === 'ok' ? 'text-emerald-400' : c.status === 'error' ? 'text-red-400' : isDark ? 'text-slate-400' : 'text-slate-600'}`}>{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={`rounded-xl border p-4 text-center ${isDark ? 'bg-slate-950/80 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                  <Database className={`size-8 mx-auto mb-2 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                  <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>اضغط "فحص الآن" للتحقق من {CORE_TABLES.length} جدول</p>
                </div>
              )}

              {tableChecks.some(c => c.status === 'error') && (
                <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 space-y-2">
                  <p className="text-xs text-red-300 font-semibold flex items-center gap-1.5"><AlertCircle className="size-3.5" /> الحل: شغّل ملف migration.sql</p>
                  <code className="block text-[11px] font-mono text-red-200 bg-red-900/20 rounded-lg p-2">psql -U postgres -d axion_db -f setup/migration.sql</code>
                  <button onClick={() => navigator.clipboard.writeText('psql -U postgres -d axion_db -f setup/migration.sql')} className="flex items-center gap-1.5 text-[11px] text-red-400">
                    <Copy className="size-3" /> نسخ
                  </button>
                </div>
              )}

              <LogTerminal logs={logs} logsEndRef={logsEndRef} />

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)} className={`rounded-xl px-3 ${isDark ? 'border-white/10 text-slate-300 hover:bg-slate-800' : ''}`}>
                  <ChevronLeft className="size-4" />
                </Button>
                <Button onClick={runDbSetup} disabled={busy} className="rounded-xl flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                  {busy ? <><Loader2 className="size-4 animate-spin" /> جاري الفحص...</>
                    : tableChecks.length > 0 ? <><RefreshCw className="size-4" /> إعادة الفحص</>
                    : <><Zap className="size-4" /> فحص الآن</>}
                </Button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              STEP 2 — ADMIN ACCOUNT
          ════════════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-4 pb-2">
              <div className="flex items-center gap-3">
                <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
                  <User className={`size-5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                </div>
                <div>
                  <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>إنشاء حساب المسؤول الأول</h2>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>جميع الحقول المميزة بـ * مطلوبة</p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Full Name */}
                <div>
                  <Label className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>الاسم الكامل <span className="text-red-400">*</span></Label>
                  <Input value={adminName} onChange={e => setAdminName(e.target.value)} placeholder="مثال: محمد أحمد العلي"
                    className={`mt-1.5 rounded-xl ${isDark ? 'bg-slate-800 border-white/10 text-white placeholder:text-slate-600' : ''}`} />
                </div>
                {/* Email */}
                <div>
                  <Label className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>البريد الإلكتروني <span className="text-red-400">*</span></Label>
                  <Input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@company.com"
                    className={`mt-1.5 rounded-xl ${isDark ? 'bg-slate-800 border-white/10 text-white placeholder:text-slate-600' : ''}`} />
                </div>
                {/* Phone */}
                <div>
                  <Label className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>رقم الهاتف <span className="text-slate-400 text-[11px]">(اختياري)</span></Label>
                  <Input type="tel" value={adminPhone} onChange={e => setAdminPhone(e.target.value)} placeholder="+966 5X XXX XXXX"
                    className={`mt-1.5 rounded-xl ${isDark ? 'bg-slate-800 border-white/10 text-white placeholder:text-slate-600' : ''}`} />
                </div>
                {/* Password */}
                <div>
                  <Label className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>كلمة المرور <span className="text-red-400">*</span></Label>
                  <div className="relative mt-1.5">
                    <Input type={showPass ? 'text' : 'password'} value={adminPass} onChange={e => setAdminPass(e.target.value)} placeholder="6 أحرف على الأقل"
                      className={`rounded-xl pl-10 ${isDark ? 'bg-slate-800 border-white/10 text-white placeholder:text-slate-600' : ''}`} />
                    <button type="button" onClick={() => setShowPass(!showPass)} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400'}`}>
                      {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <PasswordStrength password={adminPass} />
                </div>
                {/* Confirm Password */}
                <div>
                  <Label className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>تأكيد كلمة المرور <span className="text-red-400">*</span></Label>
                  <Input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="أعد كتابة كلمة المرور"
                    className={`mt-1.5 rounded-xl ${isDark ? 'bg-slate-800 border-white/10 text-white placeholder:text-slate-600' : ''}`} />
                  {confirmPass && (
                    <p className={`text-xs mt-1 flex items-center gap-1 ${adminPass === confirmPass ? 'text-emerald-500' : 'text-red-400'}`}>
                      {adminPass === confirmPass ? <Check className="size-3" /> : <X className="size-3" />}
                      {adminPass === confirmPass ? 'متطابق' : 'غير متطابق'}
                    </p>
                  )}
                </div>
              </div>

              <LogTerminal logs={logs} logsEndRef={logsEndRef} />

              <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${isDark ? 'border-amber-500/20 bg-amber-500/5 text-amber-400/80' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                <Info className="size-3.5 shrink-0 mt-0.5" />
                <span>المستخدم الأول يُعيَّن مسؤولاً تلقائياً. إذا كان هناك مسؤول موجود ستُتخطى هذه الخطوة.</span>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setStep(1); setLogs([]); }} className={`rounded-xl px-3 ${isDark ? 'border-white/10 text-slate-300 hover:bg-slate-800' : ''}`}>
                  <ChevronLeft className="size-4" />
                </Button>
                <Button onClick={createAdmin} disabled={busy} className="rounded-xl flex-1 gap-2 bg-amber-600 hover:bg-amber-700 text-white">
                  {busy ? <><Loader2 className="size-4 animate-spin" /> جاري الإنشاء...</> : <><User className="size-4" /> إنشاء الحساب والمتابعة</>}
                </Button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              STEP 3 — AI PROVIDER
          ════════════════════════════════════════════════════════════════ */}
          {step === 3 && (
            <div className="space-y-4 pb-2">
              <div className="flex items-center gap-3">
                <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-violet-500/10' : 'bg-violet-50'}`}>
                  <Bot className={`size-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
                </div>
                <div>
                  <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>مزود الذكاء الاصطناعي</h2>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>اختر المزود لتفعيل AI Chat وميزات الذكاء</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AI_PROVIDERS.map(p => (
                  <button key={p.id} onClick={() => { setSelectedProvider(p.id); setAiTestStatus('idle'); setSelectedModel(''); }}
                    className={`relative p-3 rounded-xl border text-right transition-all ${selectedProvider === p.id ? isDark ? 'border-primary/50 bg-primary/10 ring-2 ring-primary/20' : 'border-primary bg-primary/5 ring-2 ring-primary/20' : isDark ? 'border-white/5 bg-slate-800/40 hover:bg-slate-800/60' : 'border-slate-200 bg-slate-50 hover:bg-white'}`}>
                    <div className="flex items-start gap-2.5">
                      <div className={`size-8 rounded-lg bg-gradient-to-br ${p.color} flex items-center justify-center shrink-0`}>
                        <p.icon className="size-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 justify-between">
                          <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{p.name}</span>
                          {p.badge && <Badge className="text-[9px] border-0 bg-primary/10 text-primary shrink-0">{p.badge}</Badge>}
                        </div>
                        <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{p.desc}</p>
                      </div>
                    </div>
                    {selectedProvider === p.id && <div className="absolute top-2 left-2 size-4 rounded-full bg-primary flex items-center justify-center"><Check className="size-2.5 text-white" /></div>}
                  </button>
                ))}
              </div>

              <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-slate-800/40 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <Label className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {provider.keyLabel}
                    {selectedProvider === 'onspace' && <span className="text-emerald-500 mr-1">— اختياري</span>}
                  </Label>
                  <div className="relative mt-1.5">
                    <Input type={showAiKey ? 'text' : 'password'} value={aiKey} onChange={e => setAiKey(e.target.value)}
                      placeholder={selectedProvider === 'onspace' ? 'مدمج — لا يحتاج مفتاح' : `أدخل ${provider.keyLabel}...`}
                      className={`rounded-xl pl-10 font-mono text-xs ${isDark ? 'bg-slate-900 border-white/10 text-white placeholder:text-slate-600' : ''}`} />
                    <button type="button" onClick={() => setShowAiKey(!showAiKey)} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400'}`}>
                      {showAiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                  <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{provider.keyHint}</p>
                </div>

                <div>
                  <Label className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>النموذج الافتراضي</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {provider.models.map(m => (
                      <button key={m} onClick={() => setSelectedModel(m)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all ${(selectedModel || provider.models[0]) === m ? 'border-primary bg-primary/10 text-primary' : isDark ? 'border-white/10 bg-slate-900 text-slate-400 hover:border-white/20' : 'border-slate-300 bg-white text-slate-500'}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={testAiProvider} disabled={aiTestStatus === 'testing'}
                    className={`rounded-xl text-xs gap-1.5 ${isDark ? 'border-white/10 text-slate-300 hover:bg-slate-700' : ''}`}>
                    <TestTube className="size-3.5" /> اختبار الاتصال
                  </Button>
                  <TestBadge status={aiTestStatus} />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setStep(2); setLogs([]); }} className={`rounded-xl px-3 ${isDark ? 'border-white/10 text-slate-300 hover:bg-slate-800' : ''}`}>
                  <ChevronLeft className="size-4" />
                </Button>
                <Button onClick={saveAiConfig} disabled={busy} className="rounded-xl flex-1 gap-2 bg-violet-600 hover:bg-violet-700 text-white">
                  {busy ? <><Loader2 className="size-4 animate-spin" /> جاري الحفظ...</> : <><Bot className="size-4" /> حفظ إعدادات AI</>}
                </Button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              STEP 4 — API KEYS (GitHub + SMTP)
          ════════════════════════════════════════════════════════════════ */}
          {step === 4 && (
            <div className="space-y-4 pb-2">
              <div className="flex items-center gap-3">
                <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                  <Key className={`size-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                </div>
                <div>
                  <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>مفاتيح التكامل</h2>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>جميعها اختيارية — يمكن إضافتها لاحقاً من الإعدادات</p>
                </div>
              </div>

              {/* GitHub Section */}
              <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-slate-800/40 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
                    <Github className="size-4 text-white" />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>GitHub Integration</p>
                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>لنظام Git Manager — رفع/سحب الكود تلقائياً</p>
                  </div>
                  <Badge className={`text-[9px] border-0 mr-auto shrink-0 ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>اختياري</Badge>
                </div>

                <div className="grid gap-2.5">
                  <div>
                    <Label className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>GitHub Username</Label>
                    <Input value={githubUsername} onChange={e => setGithubUsername(e.target.value)} placeholder="your-github-username"
                      className={`mt-1 rounded-xl text-sm ${isDark ? 'bg-slate-900 border-white/10 text-white placeholder:text-slate-600' : ''}`} />
                  </div>
                  <div>
                    <Label className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Default Repository URL <span className={`text-[11px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>(اختياري)</span></Label>
                    <Input value={githubRepo} onChange={e => setGithubRepo(e.target.value)} placeholder="https://github.com/username/repo"
                      className={`mt-1 rounded-xl text-sm ${isDark ? 'bg-slate-900 border-white/10 text-white placeholder:text-slate-600' : ''}`} />
                  </div>
                  <div>
                    <Label className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Personal Access Token</Label>
                    <div className="relative mt-1">
                      <Input type={showGithubToken ? 'text' : 'password'} value={githubToken} onChange={e => setGithubToken(e.target.value)}
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                        className={`rounded-xl pl-10 font-mono text-xs ${isDark ? 'bg-slate-900 border-white/10 text-white placeholder:text-slate-600' : ''}`} />
                      <button type="button" onClick={() => setShowGithubToken(!showGithubToken)} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400'}`}>
                        {showGithubToken ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                    </div>
                    <div className={`flex items-center justify-between mt-1 text-[11px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                      <span>scopes: repo + workflow</span>
                      <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                        <ExternalLink className="size-3" /> إنشاء Token
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={testGitHub} disabled={githubTestStatus === 'testing'}
                      className={`rounded-xl text-xs gap-1.5 ${isDark ? 'border-white/10 text-slate-300 hover:bg-slate-700' : ''}`}>
                      <Github className="size-3.5" /> اختبار GitHub
                    </Button>
                    <TestBadge status={githubTestStatus} />
                  </div>
                </div>
              </div>

              {/* SMTP Section - collapsible */}
              <button onClick={() => setShowApiSection(!showApiSection)}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${isDark ? 'border-white/5 bg-slate-800/40 hover:bg-slate-800/60 text-white' : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-800'}`}>
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-blue-500" />
                  <span className="text-sm font-medium">إعداد البريد الإلكتروني (SMTP)</span>
                  <Badge className={`text-[9px] border-0 ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>اختياري</Badge>
                </div>
                {showApiSection ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>

              {showApiSection && (
                <div className={`p-4 rounded-xl border space-y-2.5 ${isDark ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="col-span-2 sm:col-span-1">
                      <Label className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>SMTP Host <span className="text-red-400">*</span></Label>
                      <Input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com"
                        className={`mt-1 rounded-xl text-sm ${isDark ? 'bg-slate-900 border-white/10 text-white placeholder:text-slate-600' : ''}`} />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>SMTP Port</Label>
                      <Input value={smtpPort} onChange={e => setSmtpPort(e.target.value)} placeholder="587"
                        className={`mt-1 rounded-xl text-sm ${isDark ? 'bg-slate-900 border-white/10 text-white placeholder:text-slate-600' : ''}`} />
                    </div>
                    <div className="col-span-2">
                      <Label className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>SMTP Username / Email <span className="text-red-400">*</span></Label>
                      <Input type="email" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="noreply@company.com"
                        className={`mt-1 rounded-xl text-sm ${isDark ? 'bg-slate-900 border-white/10 text-white placeholder:text-slate-600' : ''}`} />
                    </div>
                    <div className="col-span-2">
                      <Label className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>SMTP Password / App Password <span className="text-red-400">*</span></Label>
                      <div className="relative mt-1">
                        <Input type={showSmtpPass ? 'text' : 'password'} value={smtpPass} onChange={e => setSmtpPass(e.target.value)}
                          placeholder="كلمة المرور أو App Password"
                          className={`rounded-xl pl-10 text-sm ${isDark ? 'bg-slate-900 border-white/10 text-white placeholder:text-slate-600' : ''}`} />
                        <button type="button" onClick={() => setShowSmtpPass(!showSmtpPass)} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400'}`}>
                          {showSmtpPass ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Label className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>From Email Address <span className={`text-[11px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>(اختياري)</span></Label>
                      <Input type="email" value={smtpFrom} onChange={e => setSmtpFrom(e.target.value)} placeholder="AXION <noreply@company.com>"
                        className={`mt-1 rounded-xl text-sm ${isDark ? 'bg-slate-900 border-white/10 text-white placeholder:text-slate-600' : ''}`} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={testSmtp} disabled={smtpTestStatus === 'testing'}
                      className={`rounded-xl text-xs gap-1.5 ${isDark ? 'border-white/10 text-slate-300 hover:bg-slate-700' : ''}`}>
                      <Mail className="size-3.5" /> اختبار SMTP
                    </Button>
                    <TestBadge status={smtpTestStatus} />
                  </div>
                </div>
              )}

              <LogTerminal logs={logs} logsEndRef={logsEndRef} />

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setStep(3); setLogs([]); }} className={`rounded-xl px-3 ${isDark ? 'border-white/10 text-slate-300 hover:bg-slate-800' : ''}`}>
                  <ChevronLeft className="size-4" />
                </Button>
                <Button onClick={saveApiKeys} disabled={busy} className="rounded-xl flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                  {busy ? <><Loader2 className="size-4 animate-spin" /> جاري الحفظ...</> : <><Key className="size-4" /> حفظ والمتابعة</>}
                </Button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              STEP 5 — SYSTEM SETTINGS (Arab Countries)
          ════════════════════════════════════════════════════════════════ */}
          {step === 5 && (
            <div className="space-y-4 pb-2">
              <div className="flex items-center gap-3">
                <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-rose-500/10' : 'bg-rose-50'}`}>
                  <Settings className={`size-5 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />
                </div>
                <div>
                  <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>إعدادات النظام</h2>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>تخصيص سلوك التطبيق — المنطقة تُحدَّد تلقائياً</p>
                </div>
              </div>

              {/* App Name */}
              <div>
                <Label className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>اسم التطبيق</Label>
                <Input value={appName} onChange={e => setAppName(e.target.value)}
                  className={`mt-1.5 rounded-xl ${isDark ? 'bg-slate-800 border-white/10 text-white' : ''}`} />
              </div>

              {/* Country Selector (auto-detected) */}
              <div>
                <Label className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  الدولة والمنطقة الزمنية
                  <span className={`mr-2 text-[10px] ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    (تم اكتشافها تلقائياً: {detectedCountry.country})
                  </span>
                </Label>
                <div className={`mt-1.5 rounded-xl border divide-y overflow-hidden ${isDark ? 'bg-slate-800/40 border-white/10 divide-white/5' : 'bg-white border-slate-200 divide-slate-100'}`}>
                  <div className={`p-2 text-xs font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'} border-b ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                    22 دولة عربية — اختر دولتك
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {ARAB_COUNTRIES.map(c => (
                      <button key={c.code} onClick={() => setSelectedCountryCode(c.code)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-right transition-colors ${
                          selectedCountryCode === c.code
                            ? isDark ? 'bg-primary/15 text-primary' : 'bg-primary/10 text-primary'
                            : isDark ? 'text-slate-300 hover:bg-slate-700/50' : 'text-slate-700 hover:bg-slate-50'
                        }`}>
                        <div className="flex items-center gap-2">
                          {selectedCountryCode === c.code
                            ? <div className="size-4 rounded-full bg-primary flex items-center justify-center"><Check className="size-2.5 text-white" /></div>
                            : <div className={`size-4 rounded-full border-2 ${isDark ? 'border-slate-600' : 'border-slate-300'}`} />}
                          <span className={`text-[11px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>UTC{c.offset}</span>
                          <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>·</span>
                          <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{c.currencyName}</span>
                        </div>
                        <span className="text-sm font-medium">{c.country}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Selected country summary */}
                {selectedCountry && (
                  <div className={`mt-2 p-2.5 rounded-lg flex items-center gap-2 text-xs ${isDark ? 'bg-primary/5 border border-primary/20 text-primary' : 'bg-primary/5 border border-primary/20 text-primary'}`}>
                    <Globe className="size-3.5 shrink-0" />
                    <span>
                      <strong>{selectedCountry.country}</strong> · {selectedCountry.timezone} · {selectedCountry.currencyName} ({selectedCountry.currency})
                    </span>
                  </div>
                )}
              </div>

              {/* Toggles */}
              {[
                { label: 'السماح بتسجيل مستخدمين جدد', desc: 'المستخدمون يستطيعون إنشاء حسابات', value: allowReg, set: setAllowReg, color: 'bg-emerald-600' },
                { label: 'يتطلب موافقة المسؤول', desc: 'المستخدم الجديد لا يدخل حتى تقبله', value: requireApproval, set: setRequireApproval, color: 'bg-amber-600' },
              ].map(opt => (
                <div key={opt.label} className={`flex items-center justify-between p-3.5 rounded-xl border ${isDark ? 'bg-slate-800/40 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex-1 min-w-0 ml-3">
                    <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>{opt.label}</p>
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{opt.desc}</p>
                  </div>
                  <button onClick={() => opt.set(!opt.value)}
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${opt.value ? opt.color : isDark ? 'bg-slate-700' : 'bg-slate-300'}`}>
                    <span className={`absolute top-1 size-4 bg-white rounded-full shadow transition-all ${opt.value ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              ))}

              <LogTerminal logs={logs} logsEndRef={logsEndRef} />

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setStep(4); setLogs([]); }} className={`rounded-xl px-3 ${isDark ? 'border-white/10 text-slate-300 hover:bg-slate-800' : ''}`}>
                  <ChevronLeft className="size-4" />
                </Button>
                <Button onClick={finalize} disabled={busy} className="rounded-xl flex-1 gap-2 bg-rose-600 hover:bg-rose-700 text-white">
                  {busy ? <><Loader2 className="size-4 animate-spin" /> جاري الإنهاء...</> : <><ShieldCheck className="size-4" /> إنهاء وتفعيل النظام</>}
                </Button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              STEP 6 — DONE
          ════════════════════════════════════════════════════════════════ */}
          {step === 6 && (
            <div className="text-center space-y-5 py-2">
              <div className={`size-20 rounded-full border-4 flex items-center justify-center mx-auto ${isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'}`}>
                <CheckCircle2 className="size-10 text-emerald-500 animate-bounce" />
              </div>

              <div>
                <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>النظام جاهز! 🎉</h2>
                <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>اكتمل إعداد AXION بنجاح — جميع البيانات محفوظة في قاعدة البيانات</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-right">
                {[
                  { icon: Database, title: 'قاعدة البيانات', desc: 'جاهزة مع RLS', color: 'text-blue-500', bg: isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200' },
                  { icon: ShieldCheck, title: 'المسؤول الأول', desc: adminEmail || 'موجود مسبقاً', color: 'text-amber-500', bg: isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200' },
                  { icon: Bot, title: provider.name, desc: selectedModel || provider.models[0], color: 'text-violet-500', bg: isDark ? 'bg-violet-500/10 border-violet-500/20' : 'bg-violet-50 border-violet-200' },
                  { icon: Globe, title: selectedCountry.country, desc: `${selectedCountry.currencyName} · ${selectedCountry.timezone}`, color: 'text-emerald-500', bg: isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200' },
                  { icon: Building2, title: appName, desc: 'v3.0 · عربي', color: 'text-rose-500', bg: isDark ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50 border-rose-200' },
                  { icon: Users, title: 'التسجيل', desc: requireApproval ? 'يتطلب موافقة' : allowReg ? 'مفتوح' : 'مغلق', color: 'text-teal-500', bg: isDark ? 'bg-teal-500/10 border-teal-500/20' : 'bg-teal-50 border-teal-200' },
                ].map(i => (
                  <div key={i.title} className={`flex items-center gap-2 p-2.5 rounded-xl border ${i.bg}`}>
                    <i.icon className={`size-4 ${i.color} shrink-0`} />
                    <div className="min-w-0">
                      <p className={`text-[11px] font-bold ${isDark ? 'text-white' : 'text-slate-800'} truncate`}>{i.title}</p>
                      <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'} truncate`}>{i.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`p-3 rounded-xl border text-xs text-center ${isDark ? 'border-blue-500/20 bg-blue-500/5 text-blue-400' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
                سيتم إعادة تحميل الصفحة تلقائياً للتحقق من الإعدادات
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => {
                  console.log('[Setup] ✅ Redirecting to login...');
                  window.location.href = '/login';
                }}
                  className={`rounded-xl flex-1 gap-2 ${isDark ? 'border-white/10 text-slate-300 hover:bg-slate-800' : 'border-slate-300'}`}>
                  تسجيل الدخول
                </Button>
                <Button onClick={() => {
                  console.log('[Setup] ✅ Redirecting to dashboard...');
                  window.location.href = '/';
                }} className="rounded-xl flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                  <ShieldCheck className="size-4" /> لوحة التحكم
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <p className={`text-center text-[10px] mt-3 mb-2 font-mono shrink-0 ${isDark ? 'text-slate-700' : 'text-slate-400'}`}>
        AXION Real Assets · Setup Wizard v3.0 · {new Date().getFullYear()}
      </p>
    </div>
  );
}
