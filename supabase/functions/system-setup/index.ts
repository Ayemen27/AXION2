/**
 * System Setup Edge Function
 * يتعامل مع إعداد النظام بشكل حقيقي: فحص قاعدة البيانات، إنشاء المسؤول، حفظ الإعدادات
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SetupRequest {
  step: 'check_db' | 'create_admin' | 'save_ai' | 'save_api_keys' | 'finalize' | 'test_github' | 'test_smtp';
  data?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { step, data = {} }: SetupRequest = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let result: any = {};

    // ────────────────────────────────────────────────────────────────
    // STEP: Check Database Tables
    // ────────────────────────────────────────────────────────────────
    if (step === 'check_db') {
      console.log('[setup] Checking database tables...');
      const tables = [
        'user_profiles', 'projects', 'workers', 'attendance_records', 'daily_expenses',
        'suppliers', 'material_purchases', 'wells', 'equipment', 'customers',
        'fund_custody', 'notifications', 'user_permissions', 'system_settings',
      ];

      const checks: Array<{ table: string; exists: boolean; count: number }> = [];

      for (const table of tables) {
        try {
          const { count, error } = await supabase
            .from(table as any)
            .select('*', { count: 'exact', head: true });

          checks.push({
            table,
            exists: !error,
            count: count ?? 0,
          });

          console.log(`[setup] ${table}: ${!error ? '✓ exists' : '✗ missing'} (${count ?? 0} rows)`);
        } catch (err) {
          checks.push({ table, exists: false, count: 0 });
          console.error(`[setup] ${table}: error`, err);
        }
      }

      const missing = checks.filter(c => !c.exists);
      result = {
        success: missing.length === 0,
        checks,
        missing: missing.map(c => c.table),
      };
    }

    // ────────────────────────────────────────────────────────────────
    // STEP: Promote existing user to Admin (called after client-side signUp)
    // ────────────────────────────────────────────────────────────────
    else if (step === 'create_admin') {
      const { email, full_name, phone, user_id } = data;
      console.log('[setup] Promoting user to admin:', email);

      // Check if admin already exists
      const { data: existingAdmins } = await supabase
        .from('user_profiles')
        .select('id, email, role')
        .eq('role', 'admin');

      if (existingAdmins && existingAdmins.length > 0) {
        console.log('[setup] Admin already exists:', existingAdmins[0].email);
        result = { success: true, existing: true, email: existingAdmins[0].email };
      } else if (user_id) {
        // Force role = admin for first user
        console.log('[setup] Creating FIRST admin user:', user_id);
        
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            id: user_id,
            email,
            username: full_name ? full_name.trim().toLowerCase().replace(/\s+/g, '_') : email.split('@')[0],
            full_name: full_name || email.split('@')[0],
            phone: phone || null,
            role: 'admin',
            is_active: true,
            is_approved: true,
          }, { onConflict: 'id' });

        if (profileError) {
          console.error('[setup] Profile upsert failed:', profileError);
          throw new Error(`فشل تحديث الملف الشخصي: ${profileError.message}`);
        }

        // Save admin email and mark setup complete
        await supabase.from('system_settings').upsert(
          { key: 'admin_email', value: email, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );

        await supabase.from('system_settings').upsert(
          { key: 'setup_complete', value: 'true', updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );

        console.log('[setup] User promoted to admin successfully:', user_id);
        result = { success: true, user_id };
      } else {
        // No user_id provided — try to find by email and force admin
        const { data: profileByEmail } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('email', email)
          .single();

        if (profileByEmail) {
          console.log('[setup] Found existing user by email, forcing admin:', profileByEmail.id);
          
          await supabase.from('user_profiles').update({
            role: 'admin',
            is_active: true, 
            is_approved: true,
            full_name: full_name || undefined,
          }).eq('id', profileByEmail.id);

          await supabase.from('system_settings').upsert(
            { key: 'admin_email', value: email, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
          );

          result = { success: true, user_id: profileByEmail.id };
        } else {
          throw new Error('لم يتم إنشاء المستخدم بعد — أعد المحاولة');
        }
      }
    }

    // ────────────────────────────────────────────────────────────────
    // STEP: Save AI Configuration
    // ────────────────────────────────────────────────────────────────
    else if (step === 'save_ai') {
      const { provider, apiKey, model } = data;
      console.log('[setup] Saving AI config:', provider);

      const dbKey = `apikey_${provider}_api_key`;
      const entries = [
        { key: 'ai_provider', value: provider },
        { key: dbKey, value: apiKey || '' },
        { key: 'ai_model', value: model || '' },
      ];

      for (const entry of entries) {
        await supabase.from('system_settings').upsert(
          { ...entry, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
      }

      result = { success: true };
    }

    // ────────────────────────────────────────────────────────────────
    // STEP: Save API Keys (GitHub + SMTP)
    // ────────────────────────────────────────────────────────────────
    else if (step === 'save_api_keys') {
      const { github, smtp } = data;
      console.log('[setup] Saving API keys');

      const entries: Array<{ key: string; value: string }> = [];

      if (github?.token) entries.push({ key: 'apikey_github_token', value: github.token });
      if (github?.username) entries.push({ key: 'github_username', value: github.username });
      if (github?.repo) entries.push({ key: 'github_default_repo', value: github.repo });

      if (smtp?.host) entries.push({ key: 'smtp_host', value: smtp.host });
      if (smtp?.port) entries.push({ key: 'smtp_port', value: smtp.port });
      if (smtp?.user) entries.push({ key: 'smtp_username', value: smtp.user });
      if (smtp?.password) entries.push({ key: 'smtp_password', value: smtp.password });
      if (smtp?.from) entries.push({ key: 'smtp_from_email', value: smtp.from });

      for (const entry of entries) {
        await supabase.from('system_settings').upsert(
          { ...entry, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
      }

      // Also save GitHub data to user_github_settings
      if (github?.token && github?.username) {
        const { data: adminProfile } = await supabase
          .from('user_profiles')
          .select('id, email')
          .eq('role', 'admin')
          .limit(1)
          .single();

        if (adminProfile) {
          await supabase.from('user_github_settings').upsert(
            {
              user_id: adminProfile.id,
              github_token: github.token,
              github_username: github.username,
              github_email: adminProfile.email,
              default_repo_url: github.repo || '',
              default_branch: 'main',
              is_active: true,
              last_verified: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );
          console.log('[setup] GitHub settings saved to user_github_settings for admin:', adminProfile.id);
        }
      }

      result = { success: true, saved: entries.length };
    }

    // ────────────────────────────────────────────────────────────────
    // STEP: Finalize Setup
    // ────────────────────────────────────────────────────────────────
    else if (step === 'finalize') {
      const { appName, allowReg, requireApproval, country } = data;
      console.log('[setup] Finalizing setup');

      const now = new Date().toISOString();
      const settings = [
        { key: 'app_name', value: appName },
        { key: 'allow_registration', value: String(allowReg) },
        { key: 'require_admin_approval', value: String(requireApproval) },
        { key: 'system_timezone', value: country.timezone },
        { key: 'system_currency', value: country.currency },
        { key: 'system_country', value: country.country },
        { key: 'system_country_code', value: country.code },
        { key: 'system_language', value: 'ar' },
        { key: 'setup_complete', value: 'true' },
        { key: 'setup_version', value: '4.0' },
        { key: 'setup_date', value: now },
      ];

      for (const s of settings) {
        await supabase.from('system_settings').upsert(
          { ...s, updated_at: now },
          { onConflict: 'key' }
        );
      }

      result = { success: true };
    }

    // ────────────────────────────────────────────────────────────────
    // TEST: GitHub Token
    // ────────────────────────────────────────────────────────────────
    else if (step === 'test_github') {
      const { token } = data;
      console.log('[setup] Testing GitHub token');

      const res = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
        },
      });

      if (!res.ok) {
        throw new Error('GitHub token غير صالح');
      }

      const user = await res.json();
      result = { success: true, username: user.login, name: user.name };
    }

    // ────────────────────────────────────────────────────────────────
    // TEST: SMTP Connection
    // ────────────────────────────────────────────────────────────────
    else if (step === 'test_smtp') {
      const { host, port, user, password } = data;
      console.log('[setup] Testing SMTP:', host, port);

      // Basic validation (real SMTP test requires server-side)
      if (!host || !host.includes('.') || !user || !user.includes('@') || !password) {
        throw new Error('بيانات SMTP غير مكتملة');
      }

      result = { success: true };
    }

    else {
      throw new Error(`Unknown step: ${step}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[setup] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'حدث خطأ غير متوقع' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
