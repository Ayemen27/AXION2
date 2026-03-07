/**
 * send-email Edge Function
 * يرسل بريد إلكتروني عبر SMTP باستخدام إعدادات system_settings
 *
 * الاستخدامات:
 * - إشعار موافقة/رفض المستخدم
 * - إشعار المسؤول بتسجيل مستخدم جديد
 * - أي بريد مخصص
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface EmailRequest {
  type: 'approval' | 'rejection' | 'new_user_admin' | 'custom';
  to: string;
  subject?: string;
  html?: string;
  // For approval/rejection flows
  userName?: string;
  adminEmail?: string;
}

// ── SMTP sender using raw TCP (Deno built-in) ─────────────────────────────────
async function sendSmtpEmail(opts: {
  host: string;
  port: number;
  username: string;
  password: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const { host, port, username, password, from, to, subject, html } = opts;

  const base64Encode = (str: string) => btoa(unescape(encodeURIComponent(str)));

  // Build RFC 5321 email message
  const boundary = `----=_Part_${Date.now()}`;
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${base64Encode(subject)}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    base64Encode(html),
    `--${boundary}--`,
  ].join('\r\n');

  // Use fetch to a relay API (SMTP over fetch via smtpjs-compatible approach)
  // Since Deno Edge Functions don't support raw TCP, we use SMTP2GO API or Mailgun
  // For direct SMTP, we'll use a webhook-style POST to the SMTP host's API
  // ───────────────────────────────────────────────────────────────────────────
  // NOTE: Deno doesn't allow raw TCP in Edge Functions.
  // We'll use the SMTP host as a REST endpoint (e.g., Gmail SMTP via OAuth2 is complex).
  // Best approach: POST to an SMTP relay service, or use Supabase's built-in mailer.
  // For now, we validate settings and simulate the send — real sending requires
  // an HTTP-based email API (Resend, Mailgun, etc.) or Supabase SMTP config.
  //
  // This function will attempt sending via fetch to a simple SMTP relay if port = 587/465
  // OR fallback to logging success (configuration test mode).
  // ───────────────────────────────────────────────────────────────────────────

  console.log(`[send-email] Attempting SMTP to ${host}:${port} as ${username}`);
  console.log(`[send-email] From: ${from} → To: ${to}`);
  console.log(`[send-email] Subject: ${subject}`);

  // Try sending via Resend-compatible API if host contains 'resend'
  // Otherwise try a generic HTTP SMTP relay
  // For Gmail/standard SMTP: use fetch to smtp2go.com or similar
  throw new Error(
    'SMTP over raw TCP غير مدعوم في Edge Functions. ' +
    'استخدم Resend.com أو Mailgun أو SMTP2GO عبر HTTP API. ' +
    'البيانات محفوظة وصحيحة.'
  );
}

// ── Real send via Resend API (if api_key provided) ────────────────────────────
async function sendViaResend(opts: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: opts.from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend API error: ${err}`);
  }
}

// ── Real send via Mailgun API ─────────────────────────────────────────────────
async function sendViaMailgun(opts: {
  apiKey: string;
  domain: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const body = new URLSearchParams({
    from: opts.from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });

  const res = await fetch(`https://api.mailgun.net/v3/${opts.domain}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`api:${opts.apiKey}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Mailgun API error: ${err}`);
  }
}

// ── HTML Templates ────────────────────────────────────────────────────────────
function buildApprovalHtml(userName: string, appName: string): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>موافقة الحساب</title></head>
<body style="font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px;">
  <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #16a34a, #15803d); padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">✓ تمت الموافقة على حسابك</h1>
    </div>
    <div style="padding: 30px;">
      <p style="color: #374151; font-size: 16px; margin-bottom: 15px;">مرحباً <strong>${userName}</strong>،</p>
      <p style="color: #6b7280; line-height: 1.8;">
        يسعدنا إبلاغك بأن طلب تسجيلك في نظام <strong>${appName}</strong> قد تمت الموافقة عليه بنجاح.
      </p>
      <p style="color: #6b7280; line-height: 1.8;">
        يمكنك الآن تسجيل الدخول والبدء باستخدام جميع ميزات النظام.
      </p>
      <div style="text-align: center; margin: 25px 0;">
        <a href="#" style="background: #16a34a; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
          تسجيل الدخول الآن
        </a>
      </div>
      <p style="color: #9ca3af; font-size: 13px; text-align: center;">نظام ${appName} · إدارة المشاريع</p>
    </div>
  </div>
</body>
</html>`;
}

function buildRejectionHtml(userName: string, appName: string): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>رفض الطلب</title></head>
<body style="font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px;">
  <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">✗ تم رفض طلب التسجيل</h1>
    </div>
    <div style="padding: 30px;">
      <p style="color: #374151; font-size: 16px; margin-bottom: 15px;">مرحباً <strong>${userName}</strong>،</p>
      <p style="color: #6b7280; line-height: 1.8;">
        نأسف لإبلاغك بأنه تم رفض طلب تسجيلك في نظام <strong>${appName}</strong>.
      </p>
      <p style="color: #6b7280; line-height: 1.8;">
        للاستفسار أو الاعتراض، يرجى التواصل مع مسؤول النظام مباشرة.
      </p>
      <p style="color: #9ca3af; font-size: 13px; text-align: center; margin-top: 25px;">نظام ${appName} · إدارة المشاريع</p>
    </div>
  </div>
</body>
</html>`;
}

function buildNewUserAdminHtml(userEmail: string, userName: string, appName: string): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>مستخدم جديد</title></head>
<body style="font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px;">
  <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 22px;">🔔 مستخدم جديد يطلب الانضمام</h1>
    </div>
    <div style="padding: 30px;">
      <p style="color: #374151; font-size: 16px; margin-bottom: 15px;">مرحباً مسؤول النظام،</p>
      <p style="color: #6b7280; line-height: 1.8;">
        سجّل مستخدم جديد في نظام <strong>${appName}</strong> وينتظر موافقتك:
      </p>
      <div style="background: #f1f5f9; border-radius: 8px; padding: 15px; margin: 20px 0; border-right: 4px solid #2563eb;">
        <p style="margin: 5px 0; color: #374151;"><strong>الاسم:</strong> ${userName}</p>
        <p style="margin: 5px 0; color: #374151;"><strong>البريد:</strong> ${userEmail}</p>
      </div>
      <div style="text-align: center; margin: 25px 0;">
        <a href="#" style="background: #2563eb; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
          مراجعة الطلب في النظام
        </a>
      </div>
      <p style="color: #9ca3af; font-size: 13px; text-align: center;">نظام ${appName} · لوحة المسؤول</p>
    </div>
  </div>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ── Load SMTP settings from system_settings ────────────────────────────
    const { data: smtpRows } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', [
        'smtp_host', 'smtp_port', 'smtp_username',
        'smtp_password', 'smtp_from_email',
        'app_name',
        'email_provider',     // 'resend' | 'mailgun' | 'smtp' (default)
        'email_api_key',      // for resend or mailgun
        'email_mailgun_domain',
      ]);

    const settings: Record<string, string> = {};
    for (const row of smtpRows ?? []) {
      if (row.key && row.value) settings[row.key] = row.value;
    }

    const appName       = settings['app_name']      || 'AXION';
    const fromEmail     = settings['smtp_from_email'] || settings['smtp_username'] || 'noreply@axion.app';
    const emailProvider = settings['email_provider'] || 'smtp';
    const emailApiKey   = settings['email_api_key']  || '';

    // ── Parse request ──────────────────────────────────────────────────────
    const body: EmailRequest = await req.json();
    const { type, to, subject, html, userName = '', adminEmail } = body;

    if (!to || !to.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'البريد المستلم غير صحيح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Build email content based on type ─────────────────────────────────
    let emailSubject = subject || `إشعار من ${appName}`;
    let emailHtml    = html    || `<p>${subject}</p>`;

    if (type === 'approval') {
      emailSubject = `✓ تمت الموافقة على حسابك في ${appName}`;
      emailHtml    = buildApprovalHtml(userName, appName);
    } else if (type === 'rejection') {
      emailSubject = `إشعار بشأن طلب تسجيلك في ${appName}`;
      emailHtml    = buildRejectionHtml(userName, appName);
    } else if (type === 'new_user_admin') {
      emailSubject = `🔔 مستخدم جديد ينتظر الموافقة — ${appName}`;
      emailHtml    = buildNewUserAdminHtml(to, userName, appName);
    }

    console.log(`[send-email] type=${type} to=${to} provider=${emailProvider}`);

    // ── Attempt to send ────────────────────────────────────────────────────
    let sent = false;
    let errorMsg = '';

    if (emailProvider === 'resend' && emailApiKey) {
      // Send via Resend
      await sendViaResend({
        apiKey: emailApiKey,
        from: fromEmail,
        to,
        subject: emailSubject,
        html: emailHtml,
      });
      sent = true;
      console.log(`[send-email] ✓ Sent via Resend to ${to}`);

    } else if (emailProvider === 'mailgun' && emailApiKey && settings['email_mailgun_domain']) {
      // Send via Mailgun
      await sendViaMailgun({
        apiKey: emailApiKey,
        domain: settings['email_mailgun_domain'],
        from: fromEmail,
        to,
        subject: emailSubject,
        html: emailHtml,
      });
      sent = true;
      console.log(`[send-email] ✓ Sent via Mailgun to ${to}`);

    } else {
      // SMTP — log settings and return info (raw TCP not supported in Edge Functions)
      const hasSmtp = settings['smtp_host'] && settings['smtp_username'] && settings['smtp_password'];

      if (!hasSmtp) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'لم يتم تكوين خدمة البريد الإلكتروني. يرجى إضافة مزود بريد (Resend أو Mailgun) في الإعدادات.',
            sent: false,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log that SMTP settings are configured but raw TCP isn't supported
      console.log(`[send-email] SMTP configured (${settings['smtp_host']}:${settings['smtp_port']}) but raw TCP not supported in Edge Functions`);
      console.log(`[send-email] Email content logged: ${emailSubject} → ${to}`);

      return new Response(
        JSON.stringify({
          success: true,
          sent: false,
          message: `إعدادات SMTP محفوظة لكن الإرسال المباشر يتطلب مزود HTTP (Resend/Mailgun). تم تسجيل البريد في السجلات.`,
          emailContent: {
            to,
            subject: emailSubject,
            from: fromEmail,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, sent: true, to, subject: emailSubject }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[send-email] Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
