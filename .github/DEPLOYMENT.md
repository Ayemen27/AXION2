# 🚀 دليل النشر التلقائي — GitHub Actions

## نظرة عامة

هذا المشروع يستخدم GitHub Actions لأتمتة:
- ✅ **CI/CD**: الاختبار والبناء التلقائي
- 🚀 **Deployment**: النشر التلقائي على VPS
- 🔒 **Security**: الفحص الأمني الدوري
- 💾 **Backup**: النسخ الاحتياطي التلقائي

---

## 📋 Workflows المتاحة

### 1. CI - Build & Test (`.github/workflows/ci.yml`)
**يشتغل على:** كل push و pull request

**المهام:**
- 🔍 Lint & Type Check
- 🏗️ Build Application
- 🔒 Security Audit
- 📊 Generate Summary

**التفعيل:**
```bash
# تلقائياً عند:
git push origin main
git push origin develop
git push origin feature/new-feature

# أو عند فتح Pull Request
```

---

### 2. Deploy to VPS (`.github/workflows/deploy-vps.yml`)
**يشتغل على:** push على `main` فقط

**المهام:**
- 📥 بناء المشروع للإنتاج
- 📦 إنشاء حزمة النشر
- 🔑 الاتصال بـ VPS عبر SSH
- 📤 رفع الملفات ونشرها
- 🔍 Health Check للتأكد من نجاح النشر
- 📊 تقرير النشر

**متطلبات (GitHub Secrets):**
```yaml
VPS_SSH_PRIVATE_KEY: SSH Private Key للوصول للسيرفر
VPS_HOST: عنوان IP أو Domain للسيرفر
VPS_USER: اسم المستخدم (root أو axion)
VPS_PATH: مسار التطبيق (افتراضي: /var/www/axion)
VPS_URL: رابط الموقع للـ Health Check
VITE_SUPABASE_URL: OnSpace Cloud URL
VITE_SUPABASE_ANON_KEY: OnSpace Cloud Anon Key
```

**التفعيل:**
```bash
# تلقائياً عند:
git push origin main

# أو يدوياً من GitHub Actions UI
```

---

### 3. Security Scan (`.github/workflows/security-scan.yml`)
**يشتغل على:** كل يوم اثنين 3 صباحاً + على كل PR

**المهام:**
- 📦 Dependency Audit (npm audit)
- 🔬 CodeQL Analysis
- 🔐 Secret Scanning (TruffleHog)
- 📜 License Compliance Check
- 📊 تقرير أمني شامل

**التفعيل:**
```bash
# تلقائياً كل أسبوع
# أو يدوياً من GitHub Actions UI
```

---

### 4. Database Backup (`.github/workflows/database-backup.yml`)
**يشتغل على:** كل يوم الساعة 2 صباحاً UTC

**المهام:**
- 💾 نسخ احتياطي من PostgreSQL
- 🗜️ ضغط الملف (gzip)
- 🗑️ حذف النسخ القديمة (أكثر من 30 يوم)
- 📊 تقرير النسخ الاحتياطي

**متطلبات (GitHub Secrets):**
```yaml
VPS_SSH_PRIVATE_KEY: SSH Private Key
VPS_HOST: عنوان السيرفر
VPS_USER: اسم المستخدم
DB_NAME: اسم قاعدة البيانات (افتراضي: axion_db)
DB_USER: مستخدم قاعدة البيانات (افتراضي: axion_user)
```

---

## 🔐 إعداد GitHub Secrets

### 1. انتقل إلى Settings → Secrets and variables → Actions

### 2. أضف Secrets التالية:

#### **SSH Access (مطلوب للنشر والنسخ الاحتياطي)**
```bash
# على السيرفر: توليد SSH Key Pair
ssh-keygen -t ed25519 -C "github-actions@axion" -f ~/.ssh/github_actions

# أضف Public Key لـ authorized_keys
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys

# انسخ Private Key وأضفه كـ Secret في GitHub
cat ~/.ssh/github_actions
```

**Secret Name:** `VPS_SSH_PRIVATE_KEY`  
**Value:** محتوى الملف `github_actions` (بدون `.pub`)

#### **VPS Information**
- `VPS_HOST`: مثال: `123.45.67.89` أو `axion.example.com`
- `VPS_USER`: مثال: `root` أو `axion`
- `VPS_PATH`: مثال: `/var/www/axion`
- `VPS_URL`: مثال: `https://axion.example.com`

#### **OnSpace Cloud**
- `VITE_SUPABASE_URL`: من لوحة تحكم OnSpace
- `VITE_SUPABASE_ANON_KEY`: من لوحة تحكم OnSpace

#### **Database**
- `DB_NAME`: `axion_db`
- `DB_USER`: `axion_user`

---

## 🎯 استخدام Workflows

### تشغيل يدوي (Manual Trigger)
1. اذهب إلى **Actions** في GitHub
2. اختر الـ Workflow
3. اضغط **Run workflow**
4. اختر الـ branch
5. اضغط **Run workflow**

### تشغيل تلقائي
- **CI**: يشتغل تلقائياً على كل push و PR
- **Deploy**: يشتغل تلقائياً على `main` فقط
- **Security**: يشتغل تلقائياً كل أسبوع
- **Backup**: يشتغل تلقائياً كل يوم

---

## 📊 عرض النتائج

### في GitHub Actions UI:
- عرض مباشر للـ logs
- تقارير مفصلة في **Summary**
- Artifacts قابلة للتحميل

### في Pull Requests:
- فحص تلقائي للكود
- تقارير الأمان
- حالة البناء (✅ أو ❌)

---

## 🔄 Rollback (التراجع عن نشر)

إذا فشل النشر أو حدثت مشكلة:

### عبر GitHub Actions:
```bash
# اذهب لآخر نشر ناجح
# اضغط Re-run jobs
```

### عبر SSH يدوياً:
```bash
ssh user@server
cd /var/www/axion/backups
ls -lt  # عرض آخر النسخ الاحتياطية
ln -sfn /var/www/axion/backups/20260307_140500 /var/www/axion/current
sudo systemctl reload nginx
```

---

## 🛠️ Troubleshooting

### ❌ خطأ: "Permission denied (publickey)"
**الحل:**
```bash
# تأكد من إضافة Public Key للسيرفر
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### ❌ خطأ: "Database connection failed"
**الحل:**
```bash
# تحقق من صحة DB_NAME و DB_USER في Secrets
# تأكد من أن PostgreSQL يعمل:
sudo systemctl status postgresql
```

### ❌ خطأ: "Build failed"
**الحل:**
```bash
# تحقق من صحة Environment Variables:
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
```

---

## 📝 أمثلة Commit Messages

للحصول على أفضل النتائج من CI/CD:

```bash
# Build & Deploy
git commit -m "feat: add new dashboard widget"
git push origin main

# Hotfix
git commit -m "fix: critical auth bug"
git push origin main

# Feature Branch (CI only, no deploy)
git commit -m "feat: experimental feature"
git push origin feature/new-ui
```

---

## 🔒 الأمان

- ✅ جميع Secrets مشفرة
- ✅ SSH Keys محمية
- ✅ فحص أمني دوري
- ✅ Dependency Audit تلقائي
- ✅ Secret Scanning لمنع تسريب المفاتيح

---

## 📞 الدعم

إذا واجهت أي مشكلة:
1. راجع **Actions Logs** في GitHub
2. تحقق من **Secrets** صحيحة
3. راجع `/var/log/nginx/error.log` على السيرفر

---

© 2026 AXION Operations Management  
جميع الحقوق محفوظة
