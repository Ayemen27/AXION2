# 📧 دليل تخصيص رسائل البريد الإلكتروني في AXION

## المشكلة الحالية
الرسائل المُرسلة من Supabase Auth تستخدم القالب الافتراضي البسيط:

```
Verification Code

6933

This email was sent automatically. Please do not reply.
```

## الحل: تخصيص Email Templates

### طريقة 1: عبر OnSpace Cloud Dashboard (الأسهل)

#### الخطوات:
1. **افتح OnSpace Cloud Dashboard**
   - اذهب إلى مشروعك
   - Cloud → Auth → Email Templates

2. **اختر نوع الرسالة**
   - **Confirm Signup** — للتسجيل الجديد
   - **Magic Link** — لـ OTP/Magic Link
   - **Change Email Address** — تغيير البريد
   - **Reset Password** — استعادة كلمة المرور

3. **تعديل القالب**
   ```html
   <!DOCTYPE html>
   <html dir="rtl" lang="ar">
   <head>
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>AXION — رمز التحقق</title>
     <style>
       body {
         font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
         background: linear-gradient(135deg, #0f172a 0%, #1e40af 100%);
         margin: 0;
         padding: 40px 20px;
       }
       .container {
         max-width: 500px;
         margin: 0 auto;
         background: #ffffff;
         border-radius: 24px;
         overflow: hidden;
         box-shadow: 0 20px 60px rgba(0,0,0,0.3);
       }
       .header {
         background: linear-gradient(135deg, #2563eb, #4f46e5);
         padding: 40px 30px;
         text-align: center;
         color: white;
       }
       .logo {
         width: 80px;
         height: 80px;
         margin: 0 auto 16px;
         background: rgba(255,255,255,0.1);
         border-radius: 20px;
         display: flex;
         align-items: center;
         justify-content: center;
         font-size: 32px;
         font-weight: bold;
       }
       .title {
         font-size: 24px;
         font-weight: bold;
         margin: 0;
       }
       .subtitle {
         font-size: 12px;
         opacity: 0.8;
         margin-top: 8px;
         letter-spacing: 2px;
       }
       .content {
         padding: 40px 30px;
         text-align: center;
       }
       .message {
         font-size: 16px;
         color: #64748b;
         margin-bottom: 30px;
       }
       .otp-box {
         background: #f1f5f9;
         border: 2px solid #e2e8f0;
         border-radius: 16px;
         padding: 24px;
         margin: 0 auto 30px;
         display: inline-block;
       }
       .otp-label {
         font-size: 12px;
         color: #94a3b8;
         text-transform: uppercase;
         letter-spacing: 1px;
         margin-bottom: 8px;
       }
       .otp-code {
         font-size: 48px;
         font-weight: bold;
         color: #2563eb;
         letter-spacing: 12px;
         font-family: 'Courier New', monospace;
       }
       .expiry {
         font-size: 14px;
         color: #ef4444;
         margin-bottom: 20px;
       }
       .footer {
         background: #f8fafc;
         padding: 30px;
         text-align: center;
         border-top: 1px solid #e2e8f0;
       }
       .footer-text {
         font-size: 13px;
         color: #64748b;
         margin: 0 0 8px;
       }
       .footer-brand {
         font-size: 11px;
         color: #94a3b8;
         margin: 0;
         letter-spacing: 2px;
         text-transform: uppercase;
       }
       .security {
         display: inline-flex;
         align-items: center;
         gap: 6px;
         background: #dcfce7;
         color: #16a34a;
         padding: 8px 16px;
         border-radius: 8px;
         font-size: 12px;
         font-weight: 600;
         margin-top: 12px;
       }
     </style>
   </head>
   <body>
     <div class="container">
       <!-- Header -->
       <div class="header">
         <div class="logo">⬡</div>
         <h1 class="title">أكسيون AXION</h1>
         <p class="subtitle">REAL ASSETS MANAGEMENT</p>
       </div>

       <!-- Content -->
       <div class="content">
         <p class="message">
           مرحباً! تم طلب رمز التحقق لحسابك في AXION.<br>
           استخدم الرمز التالي لإكمال عملية التحقق:
         </p>

         <div class="otp-box">
           <div class="otp-label">رمز التحقق</div>
           <div class="otp-code">{{ .Token }}</div>
         </div>

         <p class="expiry">
           ⏱️ هذا الرمز صالح لمدة <strong>60 دقيقة فقط</strong>
         </p>

         <p class="footer-text" style="color: #94a3b8; font-size: 13px;">
           إذا لم تطلب هذا الرمز، يُرجى تجاهل هذه الرسالة.<br>
           لا ترد على هذا البريد — أُرسل تلقائياً.
         </p>

         <div class="security">
           🔒 رسالة آمنة ومشفرة
         </div>
       </div>

       <!-- Footer -->
       <div class="footer">
         <p class="footer-text">
           <strong>AXION Operations Management</strong><br>
           نظام إدارة الأصول المتكامل
         </p>
         <p class="footer-brand">
           AXION SECURITY v2.0 · ONSPACE CLOUD
         </p>
       </div>
     </div>
   </body>
   </html>
   ```

4. **المتغيرات المتاحة**
   - `{{ .Token }}` — رمز التحقق (OTP)
   - `{{ .Email }}` — البريد الإلكتروني
   - `{{ .SiteURL }}` — رابط الموقع
   - `{{ .ConfirmationURL }}` — رابط التأكيد (Magic Link)
   - `{{ .TokenHash }}` — Hash الرمز

5. **احفظ التغييرات**
   - اضغط "Save"
   - أرسل رسالة تجريبية للتأكد

---

### طريقة 2: عبر Edge Function مخصصة (متقدم)

إذا أردت تحكم أكبر، أنشئ Edge Function لإرسال رسائل مخصصة بالكامل:

#### 1. إنشاء Function
```bash
supabase functions new send-custom-email
```

#### 2. الكود (Deno + SMTP)
```typescript
// supabase/functions/send-custom-email/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, otp, type } = await req.json();

    const client = new SMTPClient({
      connection: {
        hostname: Deno.env.get('SMTP_HOST')!,
        port: Number(Deno.env.get('SMTP_PORT')),
        tls: true,
        auth: {
          username: Deno.env.get('SMTP_USER')!,
          password: Deno.env.get('SMTP_PASS')!,
        },
      },
    });

    const htmlTemplate = `
      <!DOCTYPE html>
      <html dir="rtl">
        <!-- القالب المخصص من الأعلى -->
        <body>
          <div class="otp-code">${otp}</div>
        </body>
      </html>
    `;

    await client.send({
      from: Deno.env.get('SMTP_FROM')!,
      to: email,
      subject: type === 'verification' ? 'AXION — رمز التحقق' : 'AXION — استعادة كلمة المرور',
      html: htmlTemplate,
    });

    await client.close();

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

#### 3. Deploy
```bash
supabase functions deploy send-custom-email
```

#### 4. الاستخدام في الكود
```typescript
// بدلاً من supabase.auth.signInWithOtp
const { data, error } = await supabase.functions.invoke('send-custom-email', {
  body: {
    email: 'user@example.com',
    otp: '6933',
    type: 'verification',
  },
});
```

---

## أمثلة إضافية

### رسالة Reset Password
```html
<div class="content">
  <p class="message">
    تم طلب إعادة تعيين كلمة المرور لحسابك في AXION.
  </p>
  <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #2563eb; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold;">
    إعادة تعيين كلمة المرور
  </a>
  <p style="font-size: 13px; color: #94a3b8; margin-top: 20px;">
    أو انسخ الرابط التالي:<br>
    <code style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px;">{{ .ConfirmationURL }}</code>
  </p>
</div>
```

### رسالة Welcome (بعد التسجيل)
```html
<div class="content">
  <h2 style="color: #2563eb; margin: 0 0 16px;">مرحباً بك في AXION! 🎉</h2>
  <p>تم إنشاء حسابك بنجاح. يمكنك الآن:</p>
  <ul style="text-align: right; color: #64748b;">
    <li>إدارة المشاريع والموارد</li>
    <li>متابعة الحضور والرواتب</li>
    <li>إنشاء التقارير المالية</li>
  </ul>
  <a href="{{ .SiteURL }}" style="display: inline-block; background: #16a34a; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; margin-top: 20px;">
    ابدأ الآن
  </a>
</div>
```

---

## نصائح للتصميم

### ✅ افعل:
- استخدمألوان AXION (Blue: `#2563eb`, Indigo: `#4f46e5`)
- اجعل OTP كبير وواضح (48px+)
- أضف فترة صلاحية واضحة
- استخدم icons مناسبة (🔒 للأمان، ⏱️ للوقت)
- اجعل الرسالة responsive (mobile-friendly)

### ❌ تجنب:
- نصوص طويلة ومعقدة
- ألوان فاتحة جداً (تظهر سيئة في Dark Mode)
- روابط غير آمنة (http://)
- صور ثقيلة (تبطئ التحميل)
- خطوط غير مدعومة في جميع المتصفحات

---

## الخطوات التالية

1. **افتح OnSpace Cloud Dashboard الآن**
2. **اذهب إلى Auth → Email Templates**
3. **عدّل القوالب الأربعة**:
   - Confirm Signup
   - Magic Link (OTP)
   - Change Email
   - Reset Password
4. **أرسل رسالة تجريبية**
5. **تأكد من الشكل على جميع الأجهزة**

---

## دعم فني

إذا واجهت مشاكل:
- **OnSpace Docs**: [https://docs.onspace.ai](https://docs.onspace.ai)
- **Supabase Email Templates**: [https://supabase.com/docs/guides/auth/auth-email-templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- **GitHub Issues**: افتح Issue في repo المشروع

---

✅ **تذكر**: بعد تخصيص القوالب، جميع الرسائل ستُرسل بالتصميم الجديد تلقائياً!
