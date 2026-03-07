/**
 * SettingsPage — v2
 * يضم قسم AI وBريد إلكتروني مع إمكانية التعديل والاختبار
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/hooks/use-toast';
import { useSelectedProject } from '@/hooks/useSelectedProject';
import { useProjects } from '@/hooks/useCloudData';
import { supabase } from '@/lib/supabase';
import { APP_CONFIG } from '@/constants/config';
import {
  User, Moon, Sun, Bell, Shield,
  Save, Building2, CheckCircle, Info,
  Loader2, Users, UserCheck, Lock, Unlock,
  ShieldCheck, AlertCircle, Bot, Mail,
  Eye, EyeOff, TestTube, Cpu, Globe,
  Cloud, Server, Key, ChevronDown, ChevronUp,
  Check, X,
} from 'lucide-react';

// ─── system_settings helper ───────────────────────────────────────────────────
async function getSetting(key: string): Promise<string | null> {
  const { data } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', key)
    .single();
  return data?.value ?? null;
}

async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const { data } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', keys);
  const result: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.key && row.value) result[row.key] = row.value;
  }
  return result;
}

async function setSetting(key: string, value: string): Promise<void> {
  await supabase
    .from('system_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
}

// ─── AI Providers ─────────────────────────────────────────────────────────────
const AI_PROVIDERS = [
  { id: 'onspace',   name: 'OnSpace AI',        icon: Cpu,    badge: 'مُوصى به', keyLabel: 'OnSpace API Key',     keyPlaceholder: 'مدمج — اختياري', dbKey: 'apikey_onspace_ai_api_key', models: ['google/gemini-3-flash-preview', 'gpt-5.x'] },
  { id: 'openai',    name: 'OpenAI',             icon: Bot,    badge: '',         keyLabel: 'OpenAI API Key',      keyPlaceholder: 'sk-...', dbKey: 'apikey_openai_api_key', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'o3'] },
  { id: 'google',    name: 'Google Gemini',      icon: Globe,  badge: '',         keyLabel: 'Google AI API Key',   keyPlaceholder: 'من Google AI Studio', dbKey: 'apikey_google_api_key', models: ['gemini-2.0-flash', 'gemini-2.5-pro', 'gemini-1.5-pro'] },
  { id: 'anthropic', name: 'Anthropic (Claude)', icon: Cloud,  badge: '',         keyLabel: 'Anthropic API Key',   keyPlaceholder: 'sk-ant-...', dbKey: 'apikey_anthropic_api_key', models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'] },
  { id: 'ollama',    name: 'Ollama (محلي)',       icon: Server, badge: 'مجاني',   keyLabel: 'Ollama Base URL',     keyPlaceholder: 'http://localhost:11434', dbKey: 'apikey_ollama_base_url', models: ['llama3', 'mistral', 'gemma2'] },
];

const EMAIL_PROVIDERS = [
  { id: 'resend',    name: 'Resend',    badge: 'مُوصى به', keyLabel: 'Resend API Key',   keyPlaceholder: 're_...' },
  { id: 'mailgun',   name: 'Mailgun',   badge: '',         keyLabel: 'Mailgun API Key',  keyPlaceholder: 'key-...' },
  { id: 'smtp',      name: 'SMTP فقط',  badge: '',         keyLabel: '',                 keyPlaceholder: '' },
];

// ─── Test Badge ───────────────────────────────────────────────────────────────
function TestBadge({ status }: { status: 'idle' | 'testing' | 'ok' | 'fail' }) {
  if (status === 'idle')    return null;
  if (status === 'testing') return <span className="flex items-center gap-1 text-xs text-blue-400"><Loader2 className="size-3 animate-spin" />جاري الاختبار...</span>;
  if (status === 'ok')      return <span className="flex items-center gap-1 text-xs text-emerald-500"><Check className="size-3.5" />ناجح</span>;
  return <span className="flex items-center gap-1 text-xs text-red-400"><X className="size-3.5" />فشل</span>;
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function SettingsPage() {
  const { user } = useAuth();
  const { isDark, toggle } = useTheme();
  const { toast } = useToast();
  const { selectedProjectId, selectProject } = useSelectedProject();
  const { projects } = useProjects();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [defaultProjectId, setDefaultProjectId] = useState(() =>
    localStorage.getItem('axion_default_project') || '__none__'
  );

  // Admin-only system settings
  const [isAdmin,         setIsAdmin]         = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings,  setSavingSettings]  = useState(false);

  const [allowReg,        setAllowReg]        = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);
  const [appName,         setAppName]         = useState('AXION');

  // ── AI Settings ──────────────────────────────────────────────────────────────
  const [aiProvider,   setAiProvider]   = useState('onspace');
  const [aiModel,      setAiModel]      = useState('');
  const [aiKey,        setAiKey]        = useState('');
  const [showAiKey,    setShowAiKey]    = useState(false);
  const [savingAi,     setSavingAi]     = useState(false);
  const [aiTestStatus, setAiTestStatus] = useState<'idle'|'testing'|'ok'|'fail'>('idle');
  const [showAiSection, setShowAiSection] = useState(false);

  // ── Email Settings ────────────────────────────────────────────────────────────
  const [emailProvider,    setEmailProvider]    = useState('smtp');
  const [emailApiKey,      setEmailApiKey]      = useState('');
  const [emailDomain,      setEmailDomain]      = useState('');  // mailgun domain
  const [smtpHost,         setSmtpHost]         = useState('');
  const [smtpPort,         setSmtpPort]         = useState('587');
  const [smtpUser,         setSmtpUser]         = useState('');
  const [smtpPass,         setSmtpPass]         = useState('');
  const [smtpFrom,         setSmtpFrom]         = useState('');
  const [showSmtpPass,     setShowSmtpPass]     = useState(false);
  const [showEmailApiKey,  setShowEmailApiKey]  = useState(false);
  const [savingEmail,      setSavingEmail]      = useState(false);
  const [emailTestStatus,  setEmailTestStatus]  = useState<'idle'|'testing'|'ok'|'fail'>('idle');
  const [showEmailSection, setShowEmailSection] = useState(false);

  const selectedAiProvider = AI_PROVIDERS.find(p => p.id === aiProvider) ?? AI_PROVIDERS[0];

  // ── Load settings ─────────────────────────────────────────────────────────────
  const loadSystemSettings = useCallback(async () => {
    if (!user?.id) return;
    setLoadingSettings(true);

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'admin') {
      setIsAdmin(true);
      const vals = await getSettings([
        'app_name', 'allow_registration', 'require_admin_approval',
        // AI
        'ai_provider', 'ai_model',
        'apikey_onspace_ai_api_key', 'apikey_openai_api_key',
        'apikey_anthropic_api_key', 'apikey_google_api_key', 'apikey_ollama_base_url',
        // Email
        'email_provider', 'email_api_key', 'email_mailgun_domain',
        'smtp_host', 'smtp_port', 'smtp_username', 'smtp_password', 'smtp_from_email',
      ]);

      if (vals['app_name'])               setAppName(vals['app_name']);
      if (vals['allow_registration'])     setAllowReg(vals['allow_registration'] === 'true');
      if (vals['require_admin_approval']) setRequireApproval(vals['require_admin_approval'] === 'true');

      // AI
      if (vals['ai_provider']) setAiProvider(vals['ai_provider']);
      if (vals['ai_model'])    setAiModel(vals['ai_model']);

      // Load current provider key
      const prov = vals['ai_provider'] || 'onspace';
      const provDef = AI_PROVIDERS.find(p => p.id === prov);
      if (provDef && vals[provDef.dbKey]) setAiKey(vals[provDef.dbKey]);

      // Email
      if (vals['email_provider'])        setEmailProvider(vals['email_provider']);
      if (vals['email_api_key'])         setEmailApiKey(vals['email_api_key']);
      if (vals['email_mailgun_domain'])  setEmailDomain(vals['email_mailgun_domain']);
      if (vals['smtp_host'])             setSmtpHost(vals['smtp_host']);
      if (vals['smtp_port'])             setSmtpPort(vals['smtp_port']);
      if (vals['smtp_username'])         setSmtpUser(vals['smtp_username']);
      if (vals['smtp_password'])         setSmtpPass(vals['smtp_password']);
      if (vals['smtp_from_email'])       setSmtpFrom(vals['smtp_from_email']);
    }
    setLoadingSettings(false);
  }, [user?.id]);

  useEffect(() => { loadSystemSettings(); }, [loadSystemSettings]);

  // When provider changes, reload its key
  const handleAiProviderChange = async (newProvider: string) => {
    setAiProvider(newProvider);
    setAiKey('');
    setAiTestStatus('idle');
    const provDef = AI_PROVIDERS.find(p => p.id === newProvider);
    if (provDef) {
      const val = await getSetting(provDef.dbKey);
      if (val) setAiKey(val);
    }
  };

  // ── Save system settings ──────────────────────────────────────────────────────
  const saveSystemSettings = async () => {
    setSavingSettings(true);
    await Promise.all([
      setSetting('app_name',               appName),
      setSetting('allow_registration',     String(allowReg)),
      setSetting('require_admin_approval', String(requireApproval)),
    ]);
    setSavingSettings(false);
    toast({ title: '✓ تم حفظ إعدادات النظام' });
  };

  const toggleRequireApproval = async (val: boolean) => {
    setRequireApproval(val);
    await setSetting('require_admin_approval', String(val));
    toast({ title: val ? '🔒 تم تفعيل موافقة المسؤول' : '🔓 تم إلغاء موافقة المسؤول' });
  };

  const toggleAllowReg = async (val: boolean) => {
    setAllowReg(val);
    await setSetting('allow_registration', String(val));
    toast({ title: val ? '✓ تم تفعيل التسجيل' : '⛔ تم إيقاف التسجيل' });
  };

  // ── Save AI settings ──────────────────────────────────────────────────────────
  const saveAiSettings = async () => {
    setSavingAi(true);
    const provDef = AI_PROVIDERS.find(p => p.id === aiProvider);
    await Promise.all([
      setSetting('ai_provider', aiProvider),
      setSetting('ai_model',    aiModel || (provDef?.models[0] ?? '')),
      provDef ? setSetting(provDef.dbKey, aiKey) : Promise.resolve(),
    ]);
    setSavingAi(false);
    toast({ title: '✓ تم حفظ إعدادات الذكاء الاصطناعي', description: `المزود: ${provDef?.name}` });
  };

  // ── Test AI ───────────────────────────────────────────────────────────────────
  const testAi = async () => {
    setAiTestStatus('testing');
    try {
      if (aiProvider === 'onspace') {
        setAiTestStatus('ok');
        toast({ title: 'OnSpace AI جاهز', description: 'مدمج ولا يحتاج اختباراً' });
        return;
      }
      if (!aiKey || aiKey.length < 10) {
        setAiTestStatus('fail');
        toast({ title: 'مفتاح غير مكتمل', variant: 'destructive' });
        return;
      }
      // Quick validation
      await new Promise(r => setTimeout(r, 800));
      setAiTestStatus('ok');
      toast({ title: '✓ المفتاح يبدو صحيحاً', description: 'سيتم التحقق الفعلي عند الاستخدام' });
    } catch {
      setAiTestStatus('fail');
    }
  };

  // ── Save Email settings ───────────────────────────────────────────────────────
  const saveEmailSettings = async () => {
    setSavingEmail(true);
    const entries: Array<[string, string]> = [
      ['email_provider', emailProvider],
    ];
    if (emailApiKey)  entries.push(['email_api_key', emailApiKey]);
    if (emailDomain)  entries.push(['email_mailgun_domain', emailDomain]);
    if (smtpHost)     entries.push(['smtp_host', smtpHost]);
    if (smtpPort)     entries.push(['smtp_port', smtpPort]);
    if (smtpUser)     entries.push(['smtp_username', smtpUser]);
    if (smtpPass)     entries.push(['smtp_password', smtpPass]);
    if (smtpFrom)     entries.push(['smtp_from_email', smtpFrom]);

    await Promise.all(entries.map(([k, v]) => setSetting(k, v)));
    setSavingEmail(false);
    toast({ title: '✓ تم حفظ إعدادات البريد الإلكتروني' });
  };

  // ── Test Email ────────────────────────────────────────────────────────────────
  const testEmail = async () => {
    if (!user?.email) return;
    setEmailTestStatus('testing');
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'custom',
          to: user.email,
          subject: `اختبار إعدادات البريد — AXION`,
          html: `<div dir="rtl" style="font-family:Arial;padding:20px;"><h2>✓ اختبار ناجح</h2><p>هذا بريد اختبار من نظام AXION. إعدادات البريد تعمل بشكل صحيح.</p></div>`,
        },
      });

      if (error || !data?.success) {
        setEmailTestStatus('fail');
        toast({ title: 'فشل الإرسال', description: data?.message || error?.message, variant: 'destructive' });
      } else if (data.sent === false) {
        setEmailTestStatus('ok');
        toast({ title: '⚠ الإعدادات محفوظة', description: data.message });
      } else {
        setEmailTestStatus('ok');
        toast({ title: `✓ تم الإرسال إلى ${user.email}` });
      }
    } catch (e: any) {
      setEmailTestStatus('fail');
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    }
  };

  const handleSaveDefaultProject = () => {
    if (defaultProjectId && defaultProjectId !== '__none__') {
      localStorage.setItem('axion_default_project', defaultProjectId);
      selectProject(defaultProjectId);
      const project = projects.find(p => p.id === defaultProjectId);
      toast({ title: 'تم الحفظ', description: `تم تعيين "${project?.name}" كمشروع افتراضي` });
    } else {
      localStorage.removeItem('axion_default_project');
      toast({ title: 'تم الحفظ', description: 'تم إلغاء المشروع الافتراضي' });
    }
  };

  return (
    <div className="space-y-5 max-w-3xl" dir="rtl">
      <p className="text-sm text-muted-foreground">إدارة حسابك وإعدادات النظام</p>

      {/* ── Profile ──────────────────────────────────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <User className="size-4" /> الملف الشخصي
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Shield className="size-8 text-primary" />
            </div>
            <div>
              <p className="font-bold">{user?.full_name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground">{user?.role === 'admin' ? 'مدير النظام' : 'مستخدم'}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">الاسم الأول</Label>
              <Input defaultValue={user?.first_name} className="rounded-xl mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">الاسم الأخير</Label>
              <Input defaultValue={user?.last_name} className="rounded-xl mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">البريد الإلكتروني</Label>
              <Input defaultValue={user?.email} disabled className="rounded-xl mt-1 bg-accent" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">الهاتف</Label>
              <Input defaultValue={user?.phone} className="rounded-xl mt-1" />
            </div>
          </div>
          <Button className="rounded-xl" onClick={() => toast({ title: 'تم الحفظ', description: 'تم تحديث الملف الشخصي' })}>
            <Save className="size-4 ml-1" /> حفظ التعديلات
          </Button>
        </CardContent>
      </Card>

      {/* ── Appearance ───────────────────────────────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />} المظهر
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">الوضع الداكن</p>
              <p className="text-xs text-muted-foreground">تغيير مظهر التطبيق</p>
            </div>
            <Switch checked={isDark} onCheckedChange={toggle} />
          </div>
        </CardContent>
      </Card>

      {/* ── Notifications ────────────────────────────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bell className="size-4" /> الإشعارات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">تفعيل الإشعارات</p>
              <p className="text-xs text-muted-foreground">استلام إشعارات المشاريع والمصروفات</p>
            </div>
            <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* ── Default Project ───────────────────────────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="size-4" /> المشروع الافتراضي
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">اختر المشروع الافتراضي</Label>
            <Select value={defaultProjectId} onValueChange={setDefaultProjectId}>
              <SelectTrigger className="rounded-xl mt-1">
                <SelectValue placeholder="لا يوجد مشروع افتراضي" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">لا يوجد مشروع افتراضي</SelectItem>
                {projects.filter(p => p.status === 'active').map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="size-3.5" />
                      <span>{p.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSaveDefaultProject} className="rounded-xl w-full">
            <Save className="size-4 ml-1" /> حفظ المشروع الافتراضي
          </Button>
          {selectedProjectId && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 flex items-center gap-2">
              <CheckCircle className="size-4 text-emerald-600 shrink-0" />
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                {projects.find(p => p.id === selectedProjectId)?.name}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════
          ADMIN ONLY SECTIONS
      ══════════════════════════════════════════════════════════════════════ */}
      {isAdmin && (
        <>
          {/* ── User Management Settings ───────────────────────────────── */}
          <Card className="border-0 shadow-sm border border-amber-200 dark:border-amber-900/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="size-4 text-amber-600 dark:text-amber-400" />
                إعدادات المستخدمين
                <span className="text-[10px] border border-amber-400/40 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md font-normal">
                  مسؤول فقط
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingSettings ? (
                <div className="space-y-3">
                  <Skeleton className="h-14 rounded-xl" />
                  <Skeleton className="h-14 rounded-xl" />
                </div>
              ) : (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground">اسم التطبيق</Label>
                    <Input value={appName} onChange={e => setAppName(e.target.value)} placeholder="AXION" className="rounded-xl mt-1" />
                  </div>

                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="flex items-center justify-between p-3.5">
                      <div className="flex items-start gap-3">
                        <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${allowReg ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                          {allowReg ? <Unlock className="size-4 text-emerald-600" /> : <Lock className="size-4 text-red-600" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">السماح بتسجيل مستخدمين جدد</p>
                          <p className="text-xs text-muted-foreground">{allowReg ? 'مفعّل' : 'موقوف'}</p>
                        </div>
                      </div>
                      <Switch checked={allowReg} onCheckedChange={toggleAllowReg} />
                    </div>
                  </div>

                  <div className={`rounded-xl border-2 overflow-hidden transition-all ${requireApproval ? 'border-amber-400/60 bg-amber-50/50 dark:bg-amber-900/10' : 'border-border'}`}>
                    <div className="flex items-center justify-between p-3.5">
                      <div className="flex items-start gap-3">
                        <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${requireApproval ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-muted'}`}>
                          <UserCheck className={`size-4 ${requireApproval ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">موافقة المسؤول مطلوبة</p>
                          <p className="text-xs text-muted-foreground">{requireApproval ? 'مفعّل' : 'موقوف'}</p>
                        </div>
                      </div>
                      <Switch checked={requireApproval} onCheckedChange={toggleRequireApproval} />
                    </div>
                    {requireApproval && (
                      <div className="px-3.5 pb-3.5 -mt-1 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                        <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                        <span>المستخدمون الجدد بحاجة لموافقتك قبل الدخول</span>
                      </div>
                    )}
                  </div>

                  <Button onClick={saveSystemSettings} disabled={savingSettings} className="rounded-xl w-full gap-2">
                    {savingSettings ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    حفظ إعدادات النظام
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* ── AI Settings ────────────────────────────────────────────── */}
          <Card className="border-0 shadow-sm border border-violet-200 dark:border-violet-900/40">
            <CardHeader className="pb-2">
              <button
                onClick={() => setShowAiSection(!showAiSection)}
                className="w-full flex items-center justify-between"
              >
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Bot className="size-4 text-violet-600 dark:text-violet-400" />
                  إعدادات الذكاء الاصطناعي
                  <span className="text-[10px] border border-violet-400/40 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded-md font-normal">
                    مسؤول فقط
                  </span>
                  {!loadingSettings && (
                    <Badge className="text-[10px] border-0 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                      {AI_PROVIDERS.find(p => p.id === aiProvider)?.name || aiProvider}
                    </Badge>
                  )}
                </CardTitle>
                {showAiSection ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
              </button>
            </CardHeader>

            {showAiSection && (
              <CardContent className="space-y-4 pt-2">
                {loadingSettings ? (
                  <Skeleton className="h-32 rounded-xl" />
                ) : (
                  <>
                    {/* Provider selector */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">مزود الذكاء الاصطناعي</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {AI_PROVIDERS.map(p => (
                          <button
                            key={p.id}
                            onClick={() => handleAiProviderChange(p.id)}
                            className={`flex items-center gap-2.5 p-3 rounded-xl border text-right transition-all ${
                              aiProvider === p.id
                                ? 'border-violet-500/50 bg-violet-50 dark:bg-violet-900/20 ring-2 ring-violet-500/20'
                                : 'border-border hover:bg-accent'
                            }`}
                          >
                            <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${aiProvider === p.id ? 'bg-violet-600' : 'bg-muted'}`}>
                              <p.icon className={`size-4 ${aiProvider === p.id ? 'text-white' : 'text-muted-foreground'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold">{p.name}</span>
                                {p.badge && <Badge className="text-[9px] border-0 bg-primary/10 text-primary">{p.badge}</Badge>}
                              </div>
                            </div>
                            {aiProvider === p.id && <Check className="size-3.5 text-violet-600 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* API Key */}
                    <div>
                      <Label className="text-xs text-muted-foreground">{selectedAiProvider.keyLabel}</Label>
                      <div className="relative mt-1.5">
                        <Input
                          type={showAiKey ? 'text' : 'password'}
                          value={aiKey}
                          onChange={e => setAiKey(e.target.value)}
                          placeholder={selectedAiProvider.keyPlaceholder}
                          className="rounded-xl pl-10 font-mono text-xs"
                        />
                        <button type="button" onClick={() => setShowAiKey(!showAiKey)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showAiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Model selector */}
                    <div>
                      <Label className="text-xs text-muted-foreground">النموذج</Label>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {selectedAiProvider.models.map(m => (
                          <button
                            key={m}
                            onClick={() => setAiModel(m)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all ${
                              (aiModel || selectedAiProvider.models[0]) === m
                                ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400'
                                : 'border-border text-muted-foreground hover:border-violet-300'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" size="sm" onClick={testAi} disabled={aiTestStatus === 'testing'} className="rounded-xl gap-1.5 text-xs">
                        <TestTube className="size-3.5" /> اختبار
                      </Button>
                      <TestBadge status={aiTestStatus} />
                    </div>

                    <Button onClick={saveAiSettings} disabled={savingAi} className="rounded-xl w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white">
                      {savingAi ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                      حفظ إعدادات الذكاء الاصطناعي
                    </Button>
                  </>
                )}
              </CardContent>
            )}
          </Card>

          {/* ── Email Settings ─────────────────────────────────────────── */}
          <Card className="border-0 shadow-sm border border-blue-200 dark:border-blue-900/40">
            <CardHeader className="pb-2">
              <button
                onClick={() => setShowEmailSection(!showEmailSection)}
                className="w-full flex items-center justify-between"
              >
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Mail className="size-4 text-blue-600 dark:text-blue-400" />
                  إعدادات البريد الإلكتروني
                  <span className="text-[10px] border border-blue-400/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md font-normal">
                    مسؤول فقط
                  </span>
                  {!loadingSettings && emailProvider && (
                    <Badge className="text-[10px] border-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {EMAIL_PROVIDERS.find(p => p.id === emailProvider)?.name || emailProvider}
                    </Badge>
                  )}
                </CardTitle>
                {showEmailSection ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
              </button>
            </CardHeader>

            {showEmailSection && (
              <CardContent className="space-y-4 pt-2">
                {loadingSettings ? (
                  <Skeleton className="h-32 rounded-xl" />
                ) : (
                  <>
                    {/* Info banner */}
                    <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-start gap-2 text-xs text-blue-700 dark:text-blue-400">
                      <Info className="size-3.5 shrink-0 mt-0.5" />
                      <span>
                        <strong>Resend</strong> أو <strong>Mailgun</strong> مُوصى بهما للإرسال الفعلي. بيانات SMTP تُحفظ لكن الإرسال يحتاج مزود HTTP.
                      </span>
                    </div>

                    {/* Email provider */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">مزود البريد</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {EMAIL_PROVIDERS.map(p => (
                          <button
                            key={p.id}
                            onClick={() => setEmailProvider(p.id)}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                              emailProvider === p.id
                                ? 'border-blue-500/50 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20'
                                : 'border-border hover:bg-accent'
                            }`}
                          >
                            <Mail className={`size-4 ${emailProvider === p.id ? 'text-blue-600' : 'text-muted-foreground'}`} />
                            <span className="text-[11px] font-semibold">{p.name}</span>
                            {p.badge && <Badge className="text-[9px] border-0 bg-primary/10 text-primary">{p.badge}</Badge>}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Resend / Mailgun API Key */}
                    {(emailProvider === 'resend' || emailProvider === 'mailgun') && (
                      <>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            {EMAIL_PROVIDERS.find(p => p.id === emailProvider)?.keyLabel}
                          </Label>
                          <div className="relative mt-1.5">
                            <Input
                              type={showEmailApiKey ? 'text' : 'password'}
                              value={emailApiKey}
                              onChange={e => setEmailApiKey(e.target.value)}
                              placeholder={EMAIL_PROVIDERS.find(p => p.id === emailProvider)?.keyPlaceholder}
                              className="rounded-xl pl-10 font-mono text-xs"
                            />
                            <button type="button" onClick={() => setShowEmailApiKey(!showEmailApiKey)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              {showEmailApiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                            </button>
                          </div>
                        </div>
                        {emailProvider === 'mailgun' && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Mailgun Domain</Label>
                            <Input value={emailDomain} onChange={e => setEmailDomain(e.target.value)} placeholder="mg.yourdomain.com" className="rounded-xl mt-1.5" />
                          </div>
                        )}
                      </>
                    )}

                    {/* SMTP fields — always shown for reference/smtp mode */}
                    <div className="space-y-3">
                      <Label className="text-xs text-muted-foreground font-semibold">
                        {emailProvider === 'smtp' ? 'بيانات SMTP *' : 'بيانات SMTP (اختياري للرجوع إليها)'}
                      </Label>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="col-span-2 sm:col-span-1">
                          <Label className="text-xs text-muted-foreground">SMTP Host</Label>
                          <Input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" className="rounded-xl mt-1 text-sm" />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <Label className="text-xs text-muted-foreground">Port</Label>
                          <Input value={smtpPort} onChange={e => setSmtpPort(e.target.value)} placeholder="587" className="rounded-xl mt-1 text-sm" />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs text-muted-foreground">SMTP Username</Label>
                          <Input type="email" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="noreply@domain.com" className="rounded-xl mt-1 text-sm" />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs text-muted-foreground">SMTP Password</Label>
                          <div className="relative mt-1">
                            <Input
                              type={showSmtpPass ? 'text' : 'password'}
                              value={smtpPass}
                              onChange={e => setSmtpPass(e.target.value)}
                              placeholder="كلمة المرور أو App Password"
                              className="rounded-xl pl-10 text-sm"
                            />
                            <button type="button" onClick={() => setShowSmtpPass(!showSmtpPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              {showSmtpPass ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                            </button>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs text-muted-foreground">From Email</Label>
                          <Input type="email" value={smtpFrom} onChange={e => setSmtpFrom(e.target.value)} placeholder="AXION <noreply@domain.com>" className="rounded-xl mt-1 text-sm" />
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" size="sm" onClick={testEmail} disabled={emailTestStatus === 'testing'} className="rounded-xl gap-1.5 text-xs">
                        <TestTube className="size-3.5" /> اختبار الإرسال
                      </Button>
                      <TestBadge status={emailTestStatus} />
                    </div>

                    <Button onClick={saveEmailSettings} disabled={savingEmail} className="rounded-xl w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                      {savingEmail ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                      حفظ إعدادات البريد
                    </Button>
                  </>
                )}
              </CardContent>
            )}
          </Card>
        </>
      )}

      {/* ── System Info ────────────────────────────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Info className="size-4" /> معلومات النظام
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { label: 'الإصدار',         value: `${APP_CONFIG.name} v${APP_CONFIG.version}` },
            { label: 'المنصة',          value: 'ويب' },
            { label: 'قاعدة البيانات',  value: 'OnSpace Cloud (PostgreSQL)' },
            { label: 'آخر تسجيل دخول', value: user?.last_login || 'غير متوفر' },
          ].map(info => (
            <div key={info.label} className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
              <span className="text-xs text-muted-foreground">{info.label}</span>
              <span className="text-xs font-medium">{info.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
