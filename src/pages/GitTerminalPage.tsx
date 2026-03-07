/**
 * Git Terminal Page
 * صفحة تعرض أوامر Git الجاهزة للنسخ والتشغيل في أي Terminal
 * مع إمكانية اكتشاف البيئة وعرض الأوامر المناسبة
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import {
  Terminal, Copy, CheckCheck, ChevronDown, ChevronRight,
  AlertCircle, Info, GitBranch, Upload, Settings,
  Package, RefreshCw, Zap, FileCode, ArrowLeft,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Step {
  id: string;
  title: string;
  description?: string;
  commands: string[];
  note?: string;
  variant?: 'default' | 'warning' | 'success';
}

interface OSSection {
  label: string;
  icon: string;
  steps: Step[];
}

// ─── Command Block Component ───────────────────────────────────────────────────
function CommandBlock({ commands, label }: { commands: string[]; label?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const text = commands.join('\n');

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: 'تم النسخ ✓' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-gray-950 dark:bg-gray-900 my-2">
      {label && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-900 dark:bg-gray-800 border-b border-border/30">
          <span className="text-[10px] text-gray-400 font-mono">{label}</span>
          <button onClick={copy}
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-white transition-colors">
            {copied ? <CheckCheck className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
            {copied ? 'تم' : 'نسخ'}
          </button>
        </div>
      )}
      <div className="relative group">
        <pre className="p-3 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
          {commands.map((cmd, i) => (
            <span key={i}>
              {cmd.startsWith('#') ? (
                <span className="text-gray-500">{cmd}</span>
              ) : (
                <span>
                  <span className="text-gray-500 select-none">$ </span>
                  <span>{cmd}</span>
                </span>
              )}
              {i < commands.length - 1 && '\n'}
            </span>
          ))}
        </pre>
        {!label && (
          <button onClick={copy}
            className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300">
            {copied ? <CheckCheck className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Collapsible Step Component ────────────────────────────────────────────────
function StepCard({ step, index }: { step: Step; index: number }) {
  const [open, setOpen] = useState(index < 2);

  const borderColor =
    step.variant === 'warning' ? 'border-amber-500/30' :
    step.variant === 'success' ? 'border-emerald-500/30' :
    'border-border';

  return (
    <div className={`rounded-xl border ${borderColor} bg-card overflow-hidden`}>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-accent/30 transition-colors">
        <div className={`size-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
          step.variant === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
          step.variant === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
          'bg-primary/10 text-primary'
        }`}>
          {index + 1}
        </div>
        <div className="flex-1 min-w-0 text-right">
          <p className="text-sm font-semibold">{step.title}</p>
          {step.description && <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>}
        </div>
        {open ? <ChevronDown className="size-4 text-muted-foreground shrink-0" /> : <ChevronRight className="size-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border/50">
          <CommandBlock commands={step.commands} />
          {step.note && (
            <div className="flex items-start gap-2 mt-2 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <Info className="size-3.5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-400">{step.note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GitTerminalPage() {
  const { user }  = useAuth();
  const { toast } = useToast();
  const navigate  = useNavigate();
  const [os, setOs] = useState<'linux' | 'mac' | 'windows'>('linux');
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [username, setUsername] = useState('');

  // Load settings from DB
  const loadFromDB = async () => {
    if (!user?.id) return;
    setLoadingSettings(true);
    const { data } = await supabase
      .from('user_github_settings')
      .select('github_username, default_repo_url, default_branch')
      .eq('user_id', user.id)
      .single();
    if (data) {
      setUsername(data.github_username || '');
      setRepoUrl(data.default_repo_url || '');
    }
    setLoadingSettings(false);
    toast({ title: 'تم تحميل الإعدادات من DB' });
  };

  const REPO = repoUrl || 'https://github.com/YOUR_USER/YOUR_REPO.git';
  const USER = username || 'YOUR_USERNAME';

  // ── OS-specific sections ────────────────────────────────────────────────────
  const osSections: Record<string, OSSection> = {
    linux: {
      label: 'Linux / OnSpace',
      icon: '🐧',
      steps: [
        {
          id: 'install',
          title: 'تثبيت Git',
          description: 'حدد مدير الحزم المناسب لنظامك',
          commands: [
            '# Debian / Ubuntu / OnSpace Container',
            'apt-get update && apt-get install -y git',
            '',
            '# أو Alpine Linux',
            'apk add --no-cache git',
            '',
            '# أو CentOS / RHEL',
            'yum install -y git',
            '',
            '# التحقق من التثبيت',
            'git --version',
          ],
          note: 'إذا ظهر خطأ "permission denied" أضف sudo قبل الأمر: sudo apt-get install -y git',
        },
        {
          id: 'config',
          title: 'إعداد Git',
          description: 'اسم المستخدم والبريد لـ commits',
          commands: [
            `git config --global user.name "${USER}"`,
            `git config --global user.email "${USER}@users.noreply.github.com"`,
            'git config --global init.defaultBranch main',
            'git config --global core.autocrlf input',
          ],
        },
        {
          id: 'init',
          title: 'تهيئة المستودع',
          description: 'داخل مجلد المشروع',
          commands: [
            '# انتقل إلى مجلد المشروع',
            'cd /path/to/your/project',
            '',
            '# تهيئة مستودع Git',
            'git init',
            '',
            '# إضافة جميع الملفات',
            'git add .',
            '',
            '# أول commit',
            'git commit -m "initial commit from AXION"',
          ],
        },
        {
          id: 'remote',
          title: 'ربط بـ GitHub',
          description: 'باستخدام Personal Access Token للأمان',
          commands: [
            `# استبدل YOUR_TOKEN بالتوكن الحقيقي`,
            `git remote add origin https://${USER}:YOUR_TOKEN@${REPO.replace('https://', '')}`,
            '',
            '# رفع المشروع',
            'git push -u origin main',
          ],
          note: 'أنشئ Personal Access Token من: github.com/settings/tokens/new (اختر صلاحية repo)',
          variant: 'warning',
        },
        {
          id: 'auto',
          title: 'الرفع التلقائي بسكريبت واحد',
          description: 'أمر يفعل كل شيء من البداية',
          commands: [
            '# تشغيل سكريبت الإعداد الشامل (يطلب بيانات GitHub)',
            'bash setup-git.sh',
            '',
            '# أو رفع سريع بعد الإعداد',
            'bash git-push-axion.sh',
            '',
            '# أو رفع مع مراقبة تلقائية كل 60 ثانية',
            'bash git-push-axion.sh --watch',
          ],
          variant: 'success',
        },
      ],
    },
    mac: {
      label: 'macOS',
      icon: '🍎',
      steps: [
        {
          id: 'install-mac',
          title: 'تثبيت Git على macOS',
          commands: [
            '# الطريقة 1: Homebrew (الأفضل)',
            'brew install git',
            '',
            '# الطريقة 2: Xcode Command Line Tools',
            'xcode-select --install',
            '',
            '# التحقق',
            'git --version',
          ],
        },
        {
          id: 'config-mac',
          title: 'إعداد Git',
          commands: [
            `git config --global user.name "${USER}"`,
            `git config --global user.email "${USER}@users.noreply.github.com"`,
            'git config --global init.defaultBranch main',
          ],
        },
        {
          id: 'push-mac',
          title: 'ربط ورفع المشروع',
          commands: [
            'git init && git add . && git commit -m "initial commit"',
            `git remote add origin ${REPO}`,
            'git push -u origin main',
          ],
          note: 'macOS يحفظ بيانات الدخول في Keychain تلقائياً بعد أول مصادقة',
        },
      ],
    },
    windows: {
      label: 'Windows',
      icon: '🪟',
      steps: [
        {
          id: 'install-win',
          title: 'تثبيت Git على Windows',
          commands: [
            '# Winget (Windows 11)',
            'winget install -e --id Git.Git',
            '',
            '# أو Chocolatey',
            'choco install git',
            '',
            '# أو حمّل المثبت من:',
            '# https://git-scm.com/download/win',
          ],
          note: 'بعد التثبيت أعد تشغيل PowerShell أو CMD',
        },
        {
          id: 'config-win',
          title: 'إعداد Git (PowerShell)',
          commands: [
            `git config --global user.name "${USER}"`,
            `git config --global user.email "${USER}@users.noreply.github.com"`,
            'git config --global core.autocrlf true',
          ],
        },
        {
          id: 'push-win',
          title: 'ربط ورفع المشروع',
          commands: [
            'git init',
            'git add .',
            'git commit -m "initial commit"',
            `git remote add origin ${REPO}`,
            'git push -u origin main',
          ],
        },
      ],
    },
  };

  const currentOS = osSections[os];

  // ── One-liner for experienced users ────────────────────────────────────────
  const oneLiner = [
    `cd /path/to/project && git init && git add . && git commit -m "initial commit" && git branch -M main && git remote add origin https://${USER}:YOUR_TOKEN@${REPO.replace('https://', '')} && git push -u origin main`,
  ];

  return (
    <div className="max-w-2xl mx-auto pb-10" dir="rtl">

      {/* Header */}
      <div className="flex items-center gap-3 py-3 border-b border-border mb-4">
        <button onClick={() => navigate('/git-manager')}
          className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground">
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Terminal className="size-5 text-primary" />
            Git Terminal Setup
          </h1>
          <p className="text-xs text-muted-foreground">أوامر جاهزة للنسخ والتشغيل في أي Terminal</p>
        </div>
      </div>

      {/* Load from DB button */}
      <div className="mb-4 p-3 rounded-xl border border-border bg-card flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">تحميل بياناتك من قاعدة البيانات</p>
          <p className="text-xs text-muted-foreground">لملء أوامر Git تلقائياً باسم مستخدمك ومستودعك</p>
        </div>
        <Button onClick={loadFromDB} disabled={loadingSettings} size="sm"
          variant="outline" className="rounded-xl gap-2 shrink-0">
          {loadingSettings ? <RefreshCw className="size-3.5 animate-spin" /> : <Settings className="size-3.5" />}
          تحميل
        </Button>
      </div>

      {(username || repoUrl) && (
        <div className="mb-4 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
          <div className="flex flex-wrap gap-2">
            {username && <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 gap-1"><GitBranch className="size-3" /> {username}</Badge>}
            {repoUrl && <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 gap-1 font-mono truncate max-w-48">{repoUrl.replace('https://github.com/', '')}</Badge>}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-500 mt-1.5">الأوامر أدناه تم ملؤها تلقائياً ببياناتك</p>
        </div>
      )}

      {/* Quick one-liner */}
      <div className="mb-4 p-4 rounded-xl border border-primary/30 bg-primary/5">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="size-4 text-primary" />
          <span className="text-sm font-semibold">أمر واحد يفعل كل شيء</span>
          <Badge className="text-[9px] bg-primary/10 text-primary border-0">One-liner</Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-2">استبدل YOUR_TOKEN بالتوكن الحقيقي</p>
        <CommandBlock commands={oneLiner} />
      </div>

      {/* OS Selector */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground mb-2">اختر نظام التشغيل:</p>
        <div className="flex gap-2">
          {(['linux', 'mac', 'windows'] as const).map(o => (
            <button key={o} onClick={() => setOs(o)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors flex items-center justify-center gap-1.5 ${
                os === o ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-accent'
              }`}>
              <span>{osSections[o].icon}</span>
              <span>{osSections[o].label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {currentOS.steps.map((step, i) => (
          <StepCard key={step.id} step={step} index={i} />
        ))}
      </div>

      {/* Scripts info */}
      <div className="mt-6 p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 mb-3">
          <FileCode className="size-4 text-primary" />
          <span className="text-sm font-semibold">السكريبتات الجاهزة في المشروع</span>
        </div>
        <div className="space-y-2">
          {[
            { file: 'setup-git.sh',       desc: 'إعداد شامل — يثبت Git ويربط GitHub تلقائياً',    cmd: 'bash setup-git.sh' },
            { file: 'git-push-axion.sh',  desc: 'رفع سريع — يضيف ويرفع بأمر واحد',               cmd: 'bash git-push-axion.sh' },
            { file: 'first-run-check.sh', desc: 'فحص البيئة — يتحقق من جاهزية Git',               cmd: 'bash first-run-check.sh' },
          ].map(s => (
            <div key={s.file} className="flex items-center gap-3 p-2.5 rounded-lg bg-accent/30">
              <code className="text-[11px] font-mono text-primary shrink-0">{s.file}</code>
              <span className="text-xs text-muted-foreground flex-1">{s.desc}</span>
              <code className="text-[10px] font-mono text-muted-foreground hidden sm:block">{s.cmd}</code>
            </div>
          ))}
        </div>
      </div>

      {/* Token warning */}
      <div className="mt-4 p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 flex items-start gap-2.5">
        <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">تحذير أمني</p>
          <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-0.5">
            لا تحفظ التوكن في ملفات المشروع أو تعمل commit به — استخدم Git Credential Manager أو المصادقة عبر قاعدة البيانات فقط.
          </p>
        </div>
      </div>

      {/* Go to Git Manager */}
      <div className="mt-6">
        <Button onClick={() => navigate('/git-manager')} className="w-full rounded-xl gap-2">
          <Upload className="size-4" />
          العودة إلى Git Manager (واجهة الرفع الرسومية)
        </Button>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          Git Manager يرفع إلى GitHub عبر API بدون الحاجة لتثبيت Git محلياً
        </p>
      </div>
    </div>
  );
}
