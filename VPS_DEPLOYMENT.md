# 🚀 AXION — دليل النشر الكامل على VPS

## نظرة عامة

هذا الدليل يأخذك خطوة بخطوة لنشر AXION على سيرفر VPS خارجي (Ubuntu 22.04 LTS) مع إعداد كامل:
- ✅ قاعدة بيانات PostgreSQL
- ✅ جميع الجداول والـ RLS
- ✅ Nginx كـ Reverse Proxy
- ✅ SSL Certificate (HTTPS)
- ✅ ربط بدومين مخصص
- ✅ نسخ احتياطي تلقائي

---

## المتطلبات الأساسية

### 1. سيرفر VPS
- **نظام التشغيل**: Ubuntu 22.04 LTS (مُوصى به)
- **RAM**: 2GB كحد أدنى (4GB مُوصى به)
- **Storage**: 20GB كحد أدنى
- **CPU**: 1 Core كحد أدنى (2 Cores مُوصى به)
- **Network**: Public IP Address

### 2. دومين (Domain Name)
- دومين مسجل (مثال: `mycompany.com`)
- وصول لإعدادات DNS
- DNS Records جاهزة للتعديل

### 3. معلومات الوصول
- IP Address للسيرفر
- SSH Access (username + password أو SSH Key)
- كلمة مرور sudo (إذا لزم الأمر)

---

## الخطوة 1: الاتصال بالسيرفر

```bash
# الاتصال عبر SSH
ssh root@YOUR_SERVER_IP
# أو
ssh username@YOUR_SERVER_IP

# تحديث قاعدة بيانات الحزم
sudo apt update && sudo apt upgrade -y
```

**⚠️ ملاحظة**: جميع الأوامر التي تحتاج `sudo` ستطلب منك كلمة المرور. أدخلها عند الحاجة.

---

## الخطوة 2: تثبيت البرامج المطلوبة

### 2.1 تثبيت Node.js 20 LTS

```bash
# تحميل وتثبيت Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# التحقق من التثبيت
node --version  # يجب أن يظهر: v20.x.x
npm --version   # يجب أن يظهر: 10.x.x
```

### 2.2 تثبيت PostgreSQL 15

```bash
# إضافة PostgreSQL Repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo tee /etc/apt/trusted.gpg.d/pgdg.asc &>/dev/null

# تحديث وتثبيت
sudo apt update
sudo apt install -y postgresql-15 postgresql-contrib-15

# تشغيل الخدمة
sudo systemctl start postgresql
sudo systemctl enable postgresql

# التحقق من التشغيل
sudo systemctl status postgresql
```

### 2.3 تثبيت Nginx

```bash
# تثبيت Nginx
sudo apt install -y nginx

# تشغيل الخدمة
sudo systemctl start nginx
sudo systemctl enable nginx

# السماح عبر الجدار الناري
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable

# التحقق
sudo systemctl status nginx
```

### 2.4 تثبيت Certbot (لـ SSL)

```bash
# تثبيت Certbot مع Nginx plugin
sudo apt install -y certbot python3-certbot-nginx
```

### 2.5 تثبيت Git

```bash
sudo apt install -y git
git --version
```

---

## الخطوة 3: إعداد قاعدة البيانات

### 3.1 إنشاء قاعدة البيانات والمستخدم

```bash
# الدخول إلى PostgreSQL كمستخدم postgres
sudo -u postgres psql
```

**داخل PostgreSQL Shell** (الأوامر التالية داخل `psql`):

```sql
-- إنشاء قاعدة بيانات
CREATE DATABASE axion_db;

-- إنشاء مستخدم خاص بالتطبيق
CREATE USER axion_user WITH PASSWORD 'YOUR_STRONG_PASSWORD_HERE';

-- منح كافة الصلاحيات
GRANT ALL PRIVILEGES ON DATABASE axion_db TO axion_user;

-- تفعيل الامتدادات المطلوبة
\c axion_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- الخروج
\q
```

⚠️ **مهم جداً**: استبدل `YOUR_STRONG_PASSWORD_HERE` بكلمة مرور قوية (16+ حرف، أرقام، رموز).

### 3.2 رفع Migration (إنشاء الجداول)

```bash
# نسخ ملف migration.sql للسيرفر
scp setup/migration.sql root@YOUR_SERVER_IP:/tmp/

# على السيرفر: تنفيذ Migration
sudo -u postgres psql -d axion_db -f /tmp/migration.sql

# التحقق من الجداول
sudo -u postgres psql -d axion_db -c "\dt"
```

**يجب أن تظهر**: 22+ جدول بما فيها `user_profiles`, `projects`, `workers`, إلخ.

---

## الخطوة 4: نشر كود التطبيق

### 4.1 استنساخ المشروع

```bash
# إنشاء مجلد للتطبيق
sudo mkdir -p /var/www/axion
sudo chown -R $USER:$USER /var/www/axion

# استنساخ الكود
cd /var/www/axion
git clone YOUR_GITHUB_REPO_URL .

# أو رفع الملفات يدوياً عبر scp/rsync
```

### 4.2 تثبيت التبعيات

```bash
cd /var/www/axion
npm install --production
```

### 4.3 إعداد ملف `.env`

```bash
# إنشاء ملف .env
nano /var/www/axion/.env
```

**محتوى الملف**:

```env
# PostgreSQL Connection
VITE_SUPABASE_URL=http://YOUR_SERVER_IP:5432
VITE_SUPABASE_ANON_KEY=your-generated-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-generated-service-role-key-here

# Database Connection (for Edge Functions if needed)
DATABASE_URL=postgresql://axion_user:YOUR_STRONG_PASSWORD_HERE@localhost:5432/axion_db

# App Settings
NODE_ENV=production
VITE_APP_URL=https://yourdomain.com
```

⚠️ **مهم**: استبدل:
- `YOUR_SERVER_IP` بـ IP السيرفر الحقيقي
- `your-generated-anon-key-here` بمفتاح Anon Key من Supabase (أو ولّد واحد جديد)
- `YOUR_STRONG_PASSWORD_HERE` بنفس كلمة المرور المستخدمة في الخطوة 3.1
- `yourdomain.com` بالدومين الخاص بك

**لتوليد مفاتيح جديدة**:

```bash
# توليد ANON_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# توليد SERVICE_ROLE_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 4.4 بناء التطبيق للإنتاج

```bash
cd /var/www/axion
npm run build

# التحقق من وجود مجلد dist
ls -la dist/
```

---

## الخطوة 5: إعداد Nginx

### 5.1 إنشاء ملف Nginx Config

```bash
sudo nano /etc/nginx/sites-available/axion
```

**محتوى الملف**:

```nginx
server {
    listen 80;
    listen [::]:80;
    
    server_name yourdomain.com www.yourdomain.com;
    
    root /var/www/axion/dist;
    index index.html;
    
    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    gzip_min_length 1000;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Main location
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

⚠️ استبدل `yourdomain.com` بالدومين الحقيقي.

### 5.2 تفعيل الإعدادات

```bash
# إنشاء رابط رمزي
sudo ln -s /etc/nginx/sites-available/axion /etc/nginx/sites-enabled/

# حذف الإعداد الافتراضي
sudo rm /etc/nginx/sites-enabled/default

# اختبار الإعدادات
sudo nginx -t

# إعادة تحميل Nginx
sudo systemctl reload nginx
```

---

## الخطوة 6: ربط الدومين

### 6.1 إعداد DNS Records

اذهب إلى مزود الدومين (Namecheap, GoDaddy, Cloudflare, إلخ) وأضف:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_SERVER_IP | 3600 |
| A | www | YOUR_SERVER_IP | 3600 |

انتظر 5-30 دقيقة حتى تنتشر التحديثات.

### 6.2 التحقق من الربط

```bash
# اختبار DNS
ping yourdomain.com
# يجب أن يعيد IP السيرفر

# اختبار HTTP
curl http://yourdomain.com
# يجب أن يعيد HTML الصفحة الرئيسية
```

---

## الخطوة 7: إضافة شهادة SSL (HTTPS)

### 7.1 توليد الشهادة باستخدام Let's Encrypt

```bash
# تشغيل Certbot
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# أجب عن الأسئلة:
# 1. أدخل بريدك الإلكتروني
# 2. اقبل شروط الخدمة (Y)
# 3. اختر "2: Redirect" لإجبار HTTPS
```

**النتيجة المتوقعة**:
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/yourdomain.com/fullchain.pem
Key is saved at: /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

### 7.2 التحقق من التجديد التلقائي

```bash
# اختبار التجديد (بدون تنفيذ فعلي)
sudo certbot renew --dry-run

# الشهادات تجدد تلقائياً كل 60 يوم
```

### 7.3 التحقق من HTTPS

```bash
# اختبار HTTPS
curl https://yourdomain.com
# يجب أن يعمل بدون أخطاء SSL
```

افتح المتصفح: `https://yourdomain.com` — يجب أن يظهر قفل أخضر 🔒

---

## الخطوة 8: تشغيل معالج الإعداد

### 8.1 الوصول للتطبيق

افتح المتصفح واذهب إلى:
```
https://yourdomain.com/setup
```

### 8.2 إكمال المعالج

#### الخطوة 1: فحص قاعدة البيانات ✅
- اضغط "فحص الآن"
- يجب أن تظهر جميع الجداول بعلامة ✓ خضراء

#### الخطوة 2: إنشاء حساب المسؤول 👤
- **الاسم الكامل**: أدخل اسمك
- **البريد الإلكتروني**: admin@yourdomain.com
- **كلمة المرور**: قوية (8+ حرف)
- اضغط "إنشاء الحساب والمتابعة"

✅ **النتيجة**: أول مستخدم يصبح **Admin** تلقائياً

#### الخطوة 3: الذكاء الاصطناعي 🤖
- اختر "OnSpace AI" (مُوصى به — مجاني)
- أو أدخل مفتاح OpenAI/Anthropic إذا أردت

#### الخطوة 4: مفاتيح API 🔑
- **GitHub**: اختياري (للنسخ الاحتياطي التلقائي)
- **SMTP**: اختياري (لإرسال رسائل البريد)

#### الخطوة 5: إعدادات النظام ⚙️
- **اسم التطبيق**: AXION (أو غيّره)
- **الدولة**: يُكتشف تلقائياً (22 دولة عربية متاحة)
- **التسجيل**: فعّل/عطّل حسب رغبتك

#### الخطوة 6: الإنهاء ✨
- اضغط "إنهاء وتفعيل النظام"
- سيُعاد تحميل الصفحة تلقائياً

---

## الخطوة 9: النسخ الاحتياطي التلقائي

### 9.1 إنشاء سكريبت النسخ الاحتياطي

```bash
# إنشاء مجلد للنسخ
sudo mkdir -p /backups/axion

# إنشاء سكريبت
sudo nano /usr/local/bin/backup-axion.sh
```

**محتوى السكريبت**:

```bash
#!/bin/bash
# AXION Daily Backup Script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/axion"
DB_NAME="axion_db"
DB_USER="axion_user"

# Backup database
pg_dump -U $DB_USER $DB_NAME > "$BACKUP_DIR/axion_db_$DATE.sql"

# Backup application files (optional)
tar -czf "$BACKUP_DIR/axion_files_$DATE.tar.gz" /var/www/axion

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.sql" -type f -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -type f -mtime +30 -delete

echo "[$(date)] Backup completed: $DATE" >> $BACKUP_DIR/backup.log
```

```bash
# منح صلاحيات التنفيذ
sudo chmod +x /usr/local/bin/backup-axion.sh

# اختبار السكريبت
sudo /usr/local/bin/backup-axion.sh
ls -lh /backups/axion/
```

### 9.2 جدولة النسخ الاحتياطي (Cron Job)

```bash
# فتح Crontab
sudo crontab -e

# إضافة السطر التالي (نسخ احتياطي يومي الساعة 2 صباحاً)
0 2 * * * /usr/local/bin/backup-axion.sh
```

---

## الخطوة 10: مراقبة الصحة والأداء

### 10.1 فحص صحة النظام

```bash
# فحص حالة PostgreSQL
sudo systemctl status postgresql

# فحص حالة Nginx
sudo systemctl status nginx

# فحص استخدام القرص
df -h

# فحص استخدام الذاكرة
free -h

# فحص العمليات
top
```

### 10.2 عرض Logs

```bash
# Nginx Access Logs
sudo tail -f /var/log/nginx/access.log

# Nginx Error Logs
sudo tail -f /var/log/nginx/error.log

# PostgreSQL Logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# System Logs
sudo journalctl -f
```

### 10.3 استخدام سكريبت الفحص الشامل

```bash
# تشغيل سكريبت الفحص
bash vps-health-check.sh

# النتيجة: تقرير شامل عن صحة النظام
```

---

## الخطوة 11: التحديثات المستقبلية

### 11.1 تحديث الكود

```bash
cd /var/www/axion

# سحب آخر التحديثات
git pull origin main

# تثبيت التبعيات الجديدة
npm install --production

# بناء نسخة جديدة
npm run build

# إعادة تحميل Nginx
sudo systemctl reload nginx
```

### 11.2 تحديث قاعدة البيانات

```bash
# إذا كان هناك migrations جديدة
sudo -u postgres psql -d axion_db -f /path/to/new_migration.sql
```

---

## حل المشاكل الشائعة

### المشكلة 1: "502 Bad Gateway"

**السبب**: Nginx لا يستطيع الوصول للتطبيق

**الحل**:
```bash
# تحقق من أن التطبيق مبني
ls -la /var/www/axion/dist/

# أعد بناء التطبيق
cd /var/www/axion && npm run build

# أعد تحميل Nginx
sudo systemctl reload nginx
```

### المشكلة 2: "Certificate verification failed"

**السبب**: شهادة SSL منتهية أو غير صحيحة

**الحل**:
```bash
# تجديد الشهادة يدوياً
sudo certbot renew

# إعادة تحميل Nginx
sudo systemctl reload nginx
```

### المشكلة 3: "Database connection failed"

**السبب**: PostgreSQL لا يعمل أو إعدادات خاطئة

**الحل**:
```bash
# تشغيل PostgreSQL
sudo systemctl start postgresql

# التحقق من الاتصال
sudo -u postgres psql -d axion_db -c "SELECT 1;"

# تحقق من .env
cat /var/www/axion/.env | grep DATABASE_URL
```

### المشكلة 4: "Permission denied"

**السبب**: صلاحيات ملفات خاطئة

**الحل**:
```bash
# إصلاح الصلاحيات
sudo chown -R www-data:www-data /var/www/axion/dist
sudo chmod -R 755 /var/www/axion/dist
```

---

## الأمان والحماية

### 1. تفعيل الجدار الناري

```bash
sudo ufw enable
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw status
```

### 2. تعطيل SSH بكلمة المرور

```bash
sudo nano /etc/ssh/sshd_config

# غيّر السطر التالي:
PasswordAuthentication no

# أعد تشغيل SSH
sudo systemctl restart ssh
```

### 3. تحديثات الأمان التلقائية

```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

### 4. مراقبة محاولات الاختراق

```bash
# تثبيت fail2ban
sudo apt install fail2ban

# تفعيله
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## الخلاصة والتحقق النهائي

### ✅ قائمة التحقق النهائية

- [ ] قاعدة البيانات تعمل وجميع الجداول موجودة
- [ ] التطبيق مبني في `/var/www/axion/dist`
- [ ] Nginx يعمل ويخدم التطبيق
- [ ] الدومين مربوط بالسيرفر
- [ ] شهادة SSL مُثبتة وتعمل (HTTPS)
- [ ] معالج الإعداد مكتمل
- [ ] حساب Admin تم إنشاؤه
- [ ] النسخ الاحتياطي التلقائي يعمل
- [ ] الجدار الناري مفعّل
- [ ] Logs تُعرض بدون أخطاء

### 🎉 النتيجة النهائية

افتح المتصفح واذهب إلى:
```
https://yourdomain.com
```

يجب أن يظهر:
- ✅ شهادة SSL صحيحة (قفل أخضر 🔒)
- ✅ صفحة تسجيل الدخول
- ✅ تسجيل دخول بحساب Admin يعمل
- ✅ لوحة التحكم تظهر بدون أخطاء

---

## الدعم والموارد

### مستندات إضافية
- `SETUP_INSTRUCTIONS.md` — دليل التثبيت المحلي
- `docs/MIGRATION_GUIDE.md` — نقل البيانات من Mock إلى قاعدة البيانات
- `vps-health-check.sh` — سكريبت الفحص الشامل

### الحصول على المساعدة
إذا واجهت أي مشكلة:

1. **راجع Logs**:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   sudo journalctl -xe
   ```

2. **افتح Issue على GitHub** مع:
   - وصف المشكلة
   - رسالة الخطأ كاملة
   - خطوات إعادة المشكلة

3. **تواصل مع الدعم**: support@axion.app

---

© 2026 AXION Operations Management · جميع الحقوق محفوظة
