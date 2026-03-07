/**
 * GitHub Settings Page
 * Settings are stored in the database (user_github_settings table)
 * and loaded automatically across all devices.
 */

import { useState, useEffect } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  Github, Key, CheckCircle2, AlertCircle, Loader2,
  ExternalLink, Shield, ChevronRight, Globe, GitBranch,
  ArrowRight, User, Mail, Trash2, Database,
} from 'lucide-react';

interface GitHubSettings {
  github_username: string;
  github_email: string;
  github_token: string;
  default_repo_url: string;
  default_branch: string;
  token_scopes?: string[];
  is_active?: boolean;
  last_verified?: string;
}

export default function GitHubSettingsPage() {
  const { user }  = useAuth();
  const { toast } = useToast();
  const navigate  = useNavigate();

  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified,  setVerified]  = useState(false);
  const [showToken, setShowToken] = useState(false);

  const [settings, setSettings] = useState<GitHubSettings>({
    github_username:  '',
    github_email:     '',
    github_token:     '',
    default_repo_url: '',
    default_branch:   'main',
  });

  const LS_KEY = `axion_github_settings_${user?.id || 'guest'}`;

  useEffect(() => { if (user?.id) loadSettings(); }, [user?.id]);

  const loadSettings = async () => {
    setLoading(true);

    // 1️⃣ Try DB first
    const { data, error } = await supabase
      .from('user_github_settings')
      .select('*')
      .eq('user_id', user!.id)
      .single();

    if (!error && data && data.github_token) {
      const s: GitHubSettings = {
        github_username:  data.github_username  || '',
        github_email:     data.github_email     || '',
        github_token:     data.github_token     || '',
        default_repo_url: data.default_repo_url || '',
        default_branch:   data.default_branch   || 'main',
        token_scopes:     data.token_scopes     || [],
        is_active:        data.is_active        ?? false,
        last_verified:    data.last_verified    || undefined,
      };
      setSettings(s);
      setVerified(!!data.is_active && !!data.github_token);
      // Sync to localStorage as offline backup
      localStorage.setItem(LS_KEY, JSON.stringify(s));
    } else {
      // 2️⃣ Fallback: localStorage (offline / DB error)
      const cached = localStorage.getItem(LS_KEY);
      if (cached) {
        try {
          const s = JSON.parse(cached) as GitHubSettings;
          setSettings(s);
          setVerified(!!s.is_active && !!s.github_token);
          toast({ title: 'تم التحميل من الذاكرة المحلية', description: 'سيُزامَن مع قاعدة البيانات عند الاتصال' });
        } catch {}
      }
    }
    setLoading(false);
  };

  const verifyToken = async () => {
    if (!settings.github_token.trim()) {
      toast({ title: 'أدخل Personal Access Token أولاً', variant: 'destructive' });
      return;
    }
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('git-operations', {
        body: { operation: 'verify', github_token: settings.github_token },
      });
      if (error) {
        let msg = error.message;
        if (error instanceof FunctionsHttpError) {
          try { msg = await error.context?.text() || msg; } catch {}
        }
        throw new Error(msg);
      }
      if (data?.success && data?.data?.isValid) {
        setVerified(true);
        setSettings(prev => ({
          ...prev,
          github_username: data.data.username || prev.github_username,
          github_email:    data.data.email    || prev.github_email,
          token_scopes:    data.data.scopes   || [],
        }));
        toast({ title: `✓ مرحباً ${data.data.username}! التوكن صالح.` });
      } else {
        throw new Error('التوكن غير صالح');
      }
    } catch (err: any) {
      toast({ title: 'فشل التحقق', description: err.message, variant: 'destructive' });
      setVerified(false);
    }
    setVerifying(false);
  };

  const handleSave = async () => {
    if (!settings.github_username.trim() || !settings.github_token.trim()) {
      toast({ title: 'أكمل الحقول المطلوبة', variant: 'destructive' });
      return;
    }
    if (!verified) {
      toast({ title: 'يجب التحقق من التوكن أولاً', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const payload = {
      user_id:          user!.id,
      github_username:  settings.github_username.trim(),
      github_email:     settings.github_email.trim(),
      github_token:     settings.github_token.trim(),
      default_repo_url: settings.default_repo_url.trim() || null,
      default_branch:   settings.default_branch.trim()   || 'main',
      is_active:        true,
      token_scopes:     settings.token_scopes || null,
      last_verified:    new Date().toISOString(),
      updated_at:       new Date().toISOString(),
    };

    const { error } = await supabase
      .from('user_github_settings')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      toast({ title: 'فشل الحفظ', description: error.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    // Also cache in localStorage for offline fallback
    localStorage.setItem(LS_KEY, JSON.stringify({ ...settings, is_active: true }));

    toast({ title: '✓ تم الحفظ في DB + localStorage', description: 'الإعدادات متاحة على جميع أجهزتك وكنسخة احتياطية محلية' });
    setSaving(false);
    setTimeout(() => navigate('/git-manager'), 600);
  };

  const handleDisconnect = async () => {
    if (!user?.id) return;
    await supabase
      .from('user_github_settings')
      .update({ is_active: false, github_token: '' })
      .eq('user_id', user.id);

    localStorage.removeItem(LS_KEY);
    setSettings({ github_username: '', github_email: '', github_token: '', default_repo_url: '', default_branch: 'main' });
    setVerified(false);
    toast({ title: 'تم قطع الاتصال بـ GitHub' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto pb-8" dir="rtl">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
        <button onClick={() => navigate('/git-manager')}
          className="hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowRight className="size-4" /> Git
        </button>
        <ChevronRight className="size-3.5 rotate-180" />
        <span className="text-foreground font-medium">Settings</span>
      </div>

      <h1 className="text-xl font-bold mb-4">إعدادات GitHub</h1>

      {/* DB storage banner */}
      <div className="mb-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3 flex items-center gap-2.5">
        <Database className="size-4 text-blue-600 shrink-0" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">الإعدادات محفوظة في DB + localStorage</p>
          <p className="text-[11px] text-blue-600 dark:text-blue-500">DB = مزامنة جميع الأجهزة · localStorage = نسخة احتياطية محلية بدون إنترنت</p>
        </div>
        <Badge className="text-[9px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-0">Dual-Layer</Badge>
      </div>

      {/* Remote */}
      <section className="mb-5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Remote</h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
          <div className="p-4">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2">
              <Globe className="size-3.5" /> رابط المستودع الافتراضي
            </Label>
            <Input
              value={settings.default_repo_url}
              onChange={e => setSettings(p => ({ ...p, default_repo_url: e.target.value }))}
              placeholder="https://github.com/username/repository"
              className="rounded-xl h-10 font-mono text-sm"
            />
          </div>
          <div className="p-4">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2">
              <GitBranch className="size-3.5" /> الفرع الافتراضي
            </Label>
            <Input
              value={settings.default_branch}
              onChange={e => setSettings(p => ({ ...p, default_branch: e.target.value }))}
              placeholder="main"
              className="rounded-xl h-10 font-mono text-sm"
            />
          </div>
        </div>
      </section>

      {/* Connection */}
      <section className="mb-5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Connections</h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-gray-900 dark:bg-gray-800 flex items-center justify-center">
                  <Github className="size-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium">GitHub</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className={`size-2 rounded-full ${verified ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                    <span className="text-xs text-muted-foreground">{verified ? 'Active' : 'Disconnected'}</span>
                  </div>
                </div>
              </div>
              {verified && (
                <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 gap-1">
                  <CheckCircle2 className="size-3" /> Connected
                </Badge>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5"><Key className="size-3" /> Personal Access Token</span>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=AXION+Git+Manager"
                    target="_blank" rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-0.5 text-[11px]">
                    إنشاء توكن <ExternalLink className="size-2.5" />
                  </a>
                </Label>
                <div className="flex gap-2">
                  <Input
                    type={showToken ? 'text' : 'password'}
                    value={settings.github_token}
                    onChange={e => { setSettings(p => ({ ...p, github_token: e.target.value })); setVerified(false); }}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="rounded-xl h-10 flex-1 font-mono text-xs"
                  />
                  <Button variant="outline" size="sm" onClick={() => setShowToken(!showToken)}
                    className="rounded-xl h-10 px-3 text-xs shrink-0">
                    {showToken ? 'إخفاء' : 'إظهار'}
                  </Button>
                </div>
              </div>

              <Button
                onClick={verifyToken}
                disabled={!settings.github_token || verifying}
                variant={verified ? 'default' : 'outline'}
                className={`w-full rounded-xl gap-2 ${verified ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}>
                {verifying
                  ? <><Loader2 className="size-4 animate-spin" /> جاري التحقق...</>
                  : verified
                    ? <><CheckCircle2 className="size-4" /> تم التحقق بنجاح</>
                    : <><Shield className="size-4" /> تحقق من التوكن</>
                }
              </Button>

              {verified && settings.token_scopes && settings.token_scopes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {settings.token_scopes.map(s => (
                    <Badge key={s} variant="outline" className="text-[10px] h-5">{s}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Commit Author */}
      <section className="mb-5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Commit author</h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
          {verified && settings.github_username && (
            <div className="p-4 flex items-center gap-3">
              <div className="size-9 rounded-full bg-accent flex items-center justify-center text-sm font-bold">
                {settings.github_username.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium">{settings.github_username}</p>
                <p className="text-xs text-muted-foreground">{settings.github_email}</p>
              </div>
              <Badge className="mr-auto text-[9px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">
                <Database className="size-2.5 mr-0.5" /> DB
              </Badge>
            </div>
          )}
          <div className="p-4">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2">
              <User className="size-3.5" /> اسم المستخدم
            </Label>
            <Input
              value={settings.github_username}
              onChange={e => setSettings(p => ({ ...p, github_username: e.target.value }))}
              placeholder="username"
              className="rounded-xl h-10 font-mono text-sm"
            />
          </div>
          <div className="p-4">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2">
              <Mail className="size-3.5" /> البريد الإلكتروني
            </Label>
            <Input
              type="email"
              value={settings.github_email}
              onChange={e => setSettings(p => ({ ...p, github_email: e.target.value }))}
              placeholder="user@example.com"
              className="rounded-xl h-10"
            />
          </div>
        </div>
      </section>

      {/* Info */}
      <div className="mb-4 rounded-xl border border-border bg-card/50 p-3 flex items-start gap-2.5">
        <Database className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground">
          بيانات الربط تُحفظ بشكل آمن في قاعدة البيانات وتُشفَّر بـ Row Level Security — لا يمكن لأحد غيرك الوصول إليها.
        </p>
      </div>

      {!verified && settings.github_token && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 flex items-center gap-2.5 mb-4">
          <AlertCircle className="size-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">يجب التحقق من التوكن قبل الحفظ</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {verified && (
          <Button variant="outline" onClick={handleDisconnect}
            className="rounded-xl gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20">
            <Trash2 className="size-4" /> قطع الاتصال
          </Button>
        )}
        <Button variant="outline" onClick={() => navigate('/git-manager')} className="rounded-xl flex-1" disabled={saving}>
          إلغاء
        </Button>
        <Button onClick={handleSave} disabled={saving || !verified} className="rounded-xl flex-1 gap-2">
          {saving
            ? <><Loader2 className="size-4 animate-spin" /> جاري الحفظ...</>
            : <><Database className="size-4" /> حفظ في DB</>
          }
        </Button>
      </div>
    </div>
  );
}
