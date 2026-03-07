/**
 * Setup Debug Page
 * صفحة فحص حالة الإعداد — للمطورين فقط
 * URL: /setup-debug
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, XCircle, Loader2, RefreshCw, Trash2, Database, HardDrive, Key } from 'lucide-react';

interface DebugInfo {
  db_setup_complete: string | null;
  db_setup_version: string | null;
  db_admin_email: string | null;
  ls_setup_done: string | null;
  admin_count: number;
  tables_count: Record<string, number>;
}

export default function SetupDebugPage() {
  const [info, setInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDebugInfo();
  }, []);

  const fetchDebugInfo = async () => {
    setLoading(true);
    try {
      // 1. Check system_settings
      const { data: settings } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['setup_complete', 'setup_version', 'admin_email']);

      const setupComplete = settings?.find(s => s.key === 'setup_complete')?.value ?? null;
      const setupVersion = settings?.find(s => s.key === 'setup_version')?.value ?? null;
      const adminEmail = settings?.find(s => s.key === 'admin_email')?.value ?? null;

      // 2. Check localStorage
      const lsSetupDone = localStorage.getItem('axion_setup_done');

      // 3. Count admins
      const { count: adminCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');

      // 4. Count tables
      const tables = ['user_profiles', 'projects', 'workers', 'system_settings', 'notifications'];
      const counts: Record<string, number> = {};
      for (const t of tables) {
        const { count } = await supabase.from(t as any).select('*', { count: 'exact', head: true });
        counts[t] = count ?? 0;
      }

      setInfo({
        db_setup_complete: setupComplete,
        db_setup_version: setupVersion,
        db_admin_email: adminEmail,
        ls_setup_done: lsSetupDone,
        admin_count: adminCount ?? 0,
        tables_count: counts,
      });
    } catch (err) {
      console.error('Debug fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const forceMarkComplete = async () => {
    const { error } = await supabase.from('system_settings').upsert(
      { key: 'setup_complete', value: 'true', updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
    if (!error) {
      localStorage.setItem('axion_setup_done', 'true');
      alert('✓ تم التفعيل — أعد تحميل الصفحة');
      window.location.href = '/';
    } else {
      alert('✗ فشل: ' + error.message);
    }
  };

  const clearSetup = async () => {
    if (!confirm('⚠️ هذا سيُعيد النظام لحالة Setup — متأكد؟')) return;
    const { error } = await supabase.from('system_settings').upsert(
      { key: 'setup_complete', value: 'false', updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
    if (!error) {
      localStorage.removeItem('axion_setup_done');
      alert('✓ تم المسح — أعد تحميل الصفحة');
      window.location.href = '/setup';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="size-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const isReady = info?.db_setup_complete === 'true' && info?.ls_setup_done === 'true' && (info?.admin_count ?? 0) > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/60 to-slate-950 p-4" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Setup Debug Panel</h1>
              <p className="text-xs text-slate-500 font-mono mt-0.5">فحص شامل لحالة الإعداد</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchDebugInfo} size="sm" variant="outline" className="gap-1.5">
                <RefreshCw className="size-3.5" /> تحديث
              </Button>
            </div>
          </div>

          {/* Status */}
          <div className={`p-4 rounded-xl border-2 ${isReady ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-red-500/50 bg-red-500/10'}`}>
            <div className="flex items-center gap-2 text-sm font-bold">
              {isReady ? <CheckCircle2 className="size-5 text-emerald-500" /> : <XCircle className="size-5 text-red-500" />}
              <span className={isReady ? 'text-emerald-400' : 'text-red-400'}>
                {isReady ? 'النظام جاهز ✓' : 'النظام غير جاهز ✗'}
              </span>
            </div>
          </div>

          {/* Database Settings */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-400">
              <Database className="size-4" /> قاعدة البيانات (system_settings)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { label: 'setup_complete', value: info?.db_setup_complete, key: 'db_setup_complete' },
                { label: 'setup_version', value: info?.db_setup_version, key: 'db_setup_version' },
                { label: 'admin_email', value: info?.db_admin_email, key: 'db_admin_email' },
              ].map(item => (
                <div key={item.key} className="bg-slate-800/60 rounded-lg p-3 border border-white/5">
                  <p className="text-xs text-slate-500 mb-1 font-mono">{item.label}</p>
                  <code className={`text-xs font-mono ${item.value ? 'text-blue-400' : 'text-red-400'}`}>
                    {item.value || 'null'}
                  </code>
                </div>
              ))}
            </div>
          </div>

          {/* LocalStorage */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-400">
              <HardDrive className="size-4" /> LocalStorage
            </div>
            <div className="bg-slate-800/60 rounded-lg p-3 border border-white/5">
              <p className="text-xs text-slate-500 mb-1 font-mono">axion_setup_done</p>
              <code className={`text-xs font-mono ${info?.ls_setup_done === 'true' ? 'text-blue-400' : 'text-red-400'}`}>
                {info?.ls_setup_done || 'null'}
              </code>
            </div>
          </div>

          {/* Admin Count */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-400">
              <Key className="size-4" /> عدد المسؤولين
            </div>
            <div className="bg-slate-800/60 rounded-lg p-3 border border-white/5">
              <code className={`text-lg font-bold ${(info?.admin_count ?? 0) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {info?.admin_count ?? 0}
              </code>
            </div>
          </div>

          {/* Tables Count */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-400">عدد الصفوف في الجداول</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(info?.tables_count ?? {}).map(([table, count]) => (
                <div key={table} className="bg-slate-800/60 rounded-lg p-2 border border-white/5">
                  <p className="text-xs text-slate-500 font-mono truncate">{table}</p>
                  <code className="text-sm text-blue-400">{count}</code>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-white/5">
            <Button onClick={forceMarkComplete} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
              <CheckCircle2 className="size-4" /> إجبار التفعيل
            </Button>
            <Button onClick={clearSetup} variant="outline" className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10 gap-1.5">
              <Trash2 className="size-4" /> مسح الإعداد
            </Button>
          </div>

          {/* Console Logs */}
          <div className="bg-slate-950 rounded-lg p-3 border border-white/5">
            <p className="text-xs text-slate-500 mb-2 font-mono">للتشخيص — افتح Console (F12)</p>
            <pre className="text-[10px] text-slate-600 font-mono leading-relaxed">
              {JSON.stringify(info, null, 2)}
            </pre>
          </div>

          {/* Back */}
          <Button onClick={() => window.location.href = '/'} variant="ghost" className="w-full text-slate-400">
            العودة للصفحة الرئيسية
          </Button>
        </div>
      </div>
    </div>
  );
}
