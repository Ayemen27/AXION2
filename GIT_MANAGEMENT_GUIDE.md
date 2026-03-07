# 🎯 AXION Git Management System — دليل شامل

نظام متكامل لإدارة Git مع 5 مكونات رئيسية:

---

## 📦 المكونات

### 1️⃣ **لوحة تحكم ويب (React + Express + WebSocket)**
لوحة تحكم حديثة مع تحديث فوري للبيانات.

**الميزات:**
- ✅ عرض حالة المستودع Real-time
- 📜 سجل الـ commits التفاعلي
- 🔍 Diff viewer لعرض التغييرات
- 🌿 إدارة الفروع (إنشاء، حذف، تبديل)
- 🔄 Pull/Push بنقرة واحدة
- 🔌 WebSocket للتحديث الفوري

**التثبيت:**
```bash
# Backend
cd git-web-dashboard/server
npm install
npm start  # يشتغل على http://localhost:5000

# Frontend (في terminal جديد)
cd git-web-dashboard/client
npm install
npm start  # يشتغل على http://localhost:3000
```

**المتغيرات البيئية (.env):**
```bash
PORT=5000
REPO_PATH=/path/to/your/repo
```

---

### 2️⃣ **Git Hooks التلقائية**
Hooks تشتغل تلقائياً عند الـ commit/push/merge.

**الـ Hooks المتاحة:**
- `pre-commit`: Linting + Tests + Formatting
- `pre-push`: Tests + Build + Large file check
- `post-merge`: Update dependencies + Changelog

**التثبيت:**
```bash
cd .git-hooks
chmod +x install.sh
./install.sh
```

**ما يحدث:**
- ✅ عند `git commit`: يفحص الكود ويشغل tests
- ✅ عند `git push`: يتأكد من نجاح build
- ✅ عند `git merge`: يحدث dependencies و changelog

---

### 3️⃣ **نظام النسخ الاحتياطي**
نسخ احتياطية تلقائية مع compression + encryption.

**الميزات:**
- 💾 Backup يومي/أسبوعي
- 🔒 Encryption باستخدام AES-256
- ☁️ رفع على S3, Google Drive, Dropbox
- 📦 Compression بـ tar.gz

**التثبيت:**
```bash
cd git-backup
npm install
```

**الاستخدام:**
```bash
# نسخة احتياطية يدوية
npm run backup

# نسخة على S3
npm run backup:s3

# نسخة على Google Drive
npm run backup:gdrive

# جدولة تلقائية
node backup.js --schedule
```

**المتغيرات البيئية (.env):**
```bash
# Encryption
BACKUP_ENCRYPTION_KEY=your-secret-key-32-chars

# AWS S3
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1
AWS_S3_BUCKET=axion-git-backups

# Google Drive (تحتاج OAuth credentials)
GOOGLE_DRIVE_CREDENTIALS=/path/to/credentials.json

# Dropbox
DROPBOX_ACCESS_TOKEN=xxx
```

---

### 4️⃣ **CLI Dashboard التفاعلي**
واجهة طرفية جميلة باستخدام ink.js.

**الميزات:**
- 📊 عرض حالة المستودع
- 📜 سجل الـ commits
- 🌿 عرض الفروع
- 🔄 تحديث تلقائي

**التثبيت:**
```bash
cd git-cli-dashboard
npm install
npm link  # لتثبيت الأمر git-dash عالمياً
```

**الاستخدام:**
```bash
# تشغيل Dashboard
git-dash

# أو
node index.js
```

---

### 5️⃣ **نظام الإشعارات**
إرسال تنبيهات عبر Slack, Discord, Email, Telegram.

**أنواع الإشعارات:**
- 🚀 Push جديد
- ⚠️ Merge conflict
- 📦 Large file detected
- ❌ CI/CD failed
- ✅ CI/CD success

**التثبيت:**
```bash
cd git-notifications
npm install
```

**الاستخدام:**
```javascript
const { NotificationManager, NotificationType } = require('./git-notifications');

const manager = new NotificationManager();

// إرسال إشعار push
manager.send(NotificationType.PUSH, {
  repo: 'AXION',
  branch: 'main',
  commits: 3,
  author: 'Developer'
});

// إرسال إشعار merge conflict
manager.send(NotificationType.MERGE_CONFLICT, {
  branch: 'feature/new-feature',
  files: ['src/App.tsx', 'src/index.ts']
});
```

**المتغيرات البيئية (.env):**
```bash
# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx

# Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxx

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
SMTP_FROM=AXION Git <noreply@axion.com>
NOTIFY_EMAIL=admin@example.com

# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl
TELEGRAM_CHAT_ID=123456789
```

---

## 🚀 التشغيل الشامل

### **خطوة 1: إعداد البيئة**
```bash
# نسخ ملف .env للمثال
cp .env.example .env

# تعديل المتغيرات
nano .env
```

### **خطوة 2: تثبيت Git Hooks**
```bash
cd .git-hooks
./install.sh
```

### **خطوة 3: تشغيل لوحة التحكم**
```bash
# Terminal 1: Backend
cd git-web-dashboard/server
npm install && npm start

# Terminal 2: Frontend
cd git-web-dashboard/client
npm install && npm start
```

### **خطوة 4: جدولة النسخ الاحتياطي**
```bash
cd git-backup
npm install
node backup.js --schedule &
```

### **خطوة 5: إعداد الإشعارات**
```bash
# اختبار الإشعارات
cd git-notifications
npm install
npm test
```

---

## 📊 سيناريوهات الاستخدام

### **سيناريو 1: تطوير محلي**
```bash
# 1. افتح CLI Dashboard
git-dash

# 2. افتح Web Dashboard
# زر http://localhost:3000

# 3. اعمل تعديلات
# Hooks تشتغل تلقائياً عند commit

# 4. Push
# Web Dashboard يُحدّث فوراً
```

### **سيناريو 2: نسخ احتياطي تلقائي**
```bash
# تشغيل scheduler في الخلفية
cd git-backup
node backup.js --schedule &

# سيقوم بـ:
# - نسخة يومية الساعة 2 صباحاً
# - نسخة أسبوعية الأحد 3 صباحاً
```

### **سيناريو 3: مراقبة CI/CD**
```bash
# في GitHub Actions workflow:
- name: Notify on Failure
  if: failure()
  run: |
    node git-notifications/index.js \
      --type=ci_failed \
      --branch=${{ github.ref_name }}
```

---

## 🔧 استكشاف الأخطاء

### المشكلة: WebSocket لا يتصل
```bash
# الحل: تحقق من أن Backend يشتغل
cd git-web-dashboard/server
npm start

# تحقق من CORS
# في server/index.js:
app.use(cors({
  origin: 'http://localhost:3000'
}));
```

### المشكلة: Git Hooks لا تشتغل
```bash
# الحل: تحقق من الصلاحيات
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/pre-push
chmod +x .git/hooks/post-merge

# اختبار:
git commit -m "test"
```

### المشكلة: Backup يفشل
```bash
# تحقق من credentials
echo $AWS_ACCESS_KEY_ID
echo $BACKUP_ENCRYPTION_KEY

# اختبار يدوي
node backup.js
```

### المشكلة: الإشعارات لا ترسل
```bash
# اختبار كل provider
cd git-notifications

# اختبار Slack
SLACK_WEBHOOK_URL=xxx node index.js

# اختبار Discord
DISCORD_WEBHOOK_URL=xxx node index.js
```

---

## 📋 القوائم المرجعية

### ✅ تثبيت أولي
- [ ] نسخ `.env.example` إلى `.env`
- [ ] تعبئة جميع المتغيرات البيئية
- [ ] تثبيت Dependencies لجميع المكونات
- [ ] تشغيل `install.sh` للـ Git Hooks
- [ ] اختبار Web Dashboard
- [ ] اختبار CLI Dashboard
- [ ] اختبار Backup
- [ ] اختبار Notifications

### ✅ استخدام يومي
- [ ] افتح Web Dashboard
- [ ] راجع حالة المستودع
- [ ] تحقق من الإشعارات
- [ ] راجع سجل Backup

### ✅ صيانة أسبوعية
- [ ] فحص Backup logs
- [ ] تنظيف Backups القديمة
- [ ] مراجعة Notification history
- [ ] تحديث Dependencies

---

## 🎓 نصائح متقدمة

### **1. تخصيص Git Hooks**
عدّل السكربتات في `.git-hooks/` حسب حاجتك:
```bash
# مثال: إضافة ESLint check
echo "eslint src/" >> .git-hooks/pre-commit
```

### **2. تخصيص Notifications**
أضف notification types جديدة:
```javascript
// في git-notifications/index.js
NotificationType.CUSTOM = 'custom';

// استخدام
manager.send(NotificationType.CUSTOM, {
  message: 'Custom notification'
});
```

### **3. تخصيص Web Dashboard**
عدّل المكونات في `git-web-dashboard/client/src/components/`:
```bash
# إضافة tab جديد
cp CommitHistory.tsx MyNewTab.tsx
# ثم عدّل App.tsx
```

---

## 📝 الترخيص

© 2026 AXION Operations Management · جميع الحقوق محفوظة

---

**نصيحة نهائية:** ابدأ بتجربة Web Dashboard أولاً، ثم أضف المكونات الأخرى تدريجياً! 🚀
