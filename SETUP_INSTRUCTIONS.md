# 🚀 AXION — دليل التثبيت الكامل

## المتطلبات الأساسية

### 1. البيئة المطلوبة
- **Node.js**: إصدار 18 أو أحدث
- **PostgreSQL**: إصدار 14 أو أحدث
- **Git**: لإدارة الكود
- **npm/bun**: لإدارة الحزم

### 2. OnSpace Cloud Backend
- URL قاعدة البيانات من لوحة التحكم
- ANON KEY و SERVICE_ROLE_KEY
- Edge Functions مفعّلة

---

## خطوات التثبيت

### الخطوة 1: إعداد البيئة المحلية

```bash
# استنساخ المشروع
git clone <repo-url>
cd axion-project

# تثبيت التبعيات
npm install
# أو
bun install

# إنشاء ملف البيئة
cp .env.example .env
```

### الخطوة 2: ملء ملف `.env`

```env
# OnSpace Cloud Backend
VITE_SUPABASE_URL=https://your-project.backend.onspace.ai
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# ⚠️ لا تشارك هذه المفاتيح علناً
```

### الخطوة 3: تشغيل Migration (قاعدة البيانات)

#### طريقة 1: عبر OnSpace Cloud Dashboard
1. افتح لوحة التحكم → Cloud → SQL Editor
2. انسخ محتوى `setup/migration.sql`
3. نفّذه مباشرة في المحرر

#### طريقة 2: عبر سطر الأوامر (إذا كان لديك وصول مباشر)
```bash
psql -U postgres -d your_database -f setup/migration.sql
```

### الخطوة 4: رفع Edge Functions

```bash
# تأكد من تثبيت Supabase CLI
npm install -g supabase

# تسجيل الدخول
supabase login

# ربط المشروع
supabase link --project-ref your-project-ref

# رفع Edge Functions
supabase functions deploy system-setup
supabase functions deploy ai-chat
supabase functions deploy git-operations
```

---

## تشغيل التطبيق

### Development Mode
```bash
npm run dev
# أو
bun dev
```

سيفتح على: `http://localhost:5173`

### Production Build
```bash
npm run build
npm run preview
```

---

## معالج الإعداد الأولي

عند فتح التطبيق لأول مرة:

### 🟦 الخطوة 1: فحص قاعدة البيانات
- **ماذا يحدث**: يتصل بـ Edge Function `system-setup`
- **التحقق**: يفحص 14 جدول + RLS
- **النتيجة**: تظهر ✓ أخضر لكل جدول موجود

⚠️ **إذا ظهرت أخطاء**:
```sql
-- افتح setup/migration.sql وشغّله
-- أو من OnSpace Dashboard → SQL Editor
```

### 🟨 الخطوة 2: إنشاء حساب المسؤول
- **البريد الإلكتروني**: سيُحقق تلقائياً (email_confirm: true)
- **كلمة المرور**: 6 أحرف على الأقل
- **الدور**: Admin تلقائياً للمستخدم الأول

✅ **النتيجة**: حساب جاهز للدخول فوراً بدون تأكيد بريد

### 🟪 الخطوة 3: الذكاء الاصطناعي
- **OnSpace AI**: مُوصى به (مدمج، بدون مفاتيح)
- **OpenAI/Anthropic/Google**: أدخل API Key إذا أردت

اختبار حقيقي: يتصل بـ Edge Function للتحقق

### 🟩 الخطوة 4: مفاتيح API (GitHub + SMTP)
- **جميعها اختيارية** — يمكن إضافتها لاحقاً
- **اختبار GitHub**: يتصل بـ `https://api.github.com/user`
- **اختبار SMTP**: يتحقق من صحة البيانات (النسخة الحالية validation فقط)

### 🟥 الخطوة 5: إعدادات النظام
- **الدولة**: تُكتشف تلقائياً من timezone
- **العملة**: تُحدد حسب الدولة (22 دولة عربية)
- **التسجيل**: السماح/منع المستخدمين الجدد
- **الموافقة**: تفعيل/تعطيل موافقة المسؤول

### ✅ الخطوة 6: الإنهاء
- **حفظ في قاعدة البيانات**: `setup_complete = true`
- **حفظ في LocalStorage**: `axion_setup_done = true`
- **إعادة التحميل**: تلقائياً للدخول

---

## حل المشاكل الشائعة

### 1. "Email not confirmed" عند تسجيل الدخول

**السبب**: المستخدمون القدامى قبل التحديث
**الحل**:
```sql
-- افتح SQL Editor في OnSpace Dashboard
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'your-email@example.com';

UPDATE user_profiles
SET is_approved = true, is_active = true
WHERE email = 'your-email@example.com';
```

### 2. Edge Function لا يستجيب

**التحقق**:
```bash
# استعرض Logs
supabase functions logs system-setup

# إعادة الرفع
supabase functions deploy system-setup
```

### 3. الجداول مفقودة

**الحل**:
```bash
# شغّل migration مرة أخرى
psql -U postgres -d your_db -f setup/migration.sql

# أو من OnSpace Dashboard → SQL Editor
```

### 4. "حسابك في انتظار موافقة المسؤول"

**الحل**:
1. سجّل دخول كمسؤول
2. اذهب إلى **إدارة المستخدمين**
3. اضغط على "قبول" للمستخدم

---

## نشر Production

### على VPS خارجي

#### 1. تثبيت المتطلبات
```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# تثبيت PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# تثبيت nginx
sudo apt install -y nginx
```

#### 2. إعداد قاعدة البيانات
```bash
sudo -u postgres psql

CREATE DATABASE axion_db;
CREATE USER axion_user WITH PASSWORD 'strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE axion_db TO axion_user;
\q

# رفع migration
psql -U axion_user -d axion_db -f setup/migration.sql
```

#### 3. بناء التطبيق
```bash
npm install
npm run build

# نسخ الملفات المبنية
sudo cp -r dist/* /var/www/axion/
```

#### 4. إعداد nginx
```bash
sudo cp setup/nginx.conf /etc/nginx/sites-available/axion
sudo ln -s /etc/nginx/sites-available/axion /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 5. SSL مع Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## الأمان والنسخ الاحتياطي

### 1. حماية .env
```bash
# تأكد من وجودها في .gitignore
echo ".env" >> .gitignore
echo ".env.git-local" >> .gitignore
```

### 2. نسخ احتياطي تلقائي (يومي)
```bash
# crontab -e
0 2 * * * pg_dump -U axion_user axion_db > /backups/axion_$(date +\%Y\%m\%d).sql
```

### 3. مراقبة الصحة
```bash
# شغّل الفحص الشامل
bash vps-health-check.sh
```

---

## الدعم والموارد

- **المستندات**: راجع `/docs` في المشروع
- **المشاكل**: افتح Issue في GitHub
- **البريد الإلكتروني**: support@axion.app

---

## الترخيص

© 2026 AXION Operations Management  
جميع الحقوق محفوظة
