# 🎯 AXION Git Management Scripts

نظام احترافي متكامل لإدارة Git مع معالجة أخطاء شاملة وواجهة تفاعلية.

---

## 📦 السكربتات المتاحة

### 1️⃣ **git-manager.sh** — المدير الاحترافي
السكربت الرئيسي لإدارة Git مع معالجة أخطاء شاملة ومراحل تحقق بعد كل خطوة.

**الميزات:**
- ✅ تحقق من كل خطوة قبل المتابعة
- 📝 تسجيل كامل للعمليات
- 🔄 تدوير ملف السجل تلقائياً
- ⚠️ معالجة تعارضات Merge تلقائياً
- 🎨 واجهة ملونة واضحة
- 🔒 Force push آمن (مع تأكيد)

**الاستخدام:**
```bash
# تشغيل بسيط
./git-manager.sh

# تحديد المستودع
REPO_URL="https://github.com/user/repo.git" ./git-manager.sh

# تحديد الرسالة
COMMIT_MESSAGE="Custom commit message" ./git-manager.sh

# تحديد الفرع
BRANCH="develop" ./git-manager.sh
```

**المتغيرات البيئية:**
```bash
PROJECT_DIR="/path/to/project"      # مجلد المشروع (افتراضي: pwd)
REPO_URL="https://..."              # رابط المستودع
BRANCH="main"                        # الفرع (افتراضي: main)
COMMIT_MESSAGE="Auto update"         # رسالة الـ commit
```

**السجل:**
```
git-operations.log
```

---

### 2️⃣ **git-auto-sync.sh** — المزامنة التلقائية
مزامنة تلقائية كل X دقائق باستخدام Cron.

**الميزات:**
- 🔒 نظام قفل لمنع التشغيل المتزامن
- 🔄 إعادة محاولة تلقائية عند الفشل
- 📋 سجل مستقل للمزامنة التلقائية
- ⏱️ تخصيص الفترة الزمنية

**الاستخدام:**
```bash
# تشغيل يدوي
./git-auto-sync.sh /path/to/project https://github.com/user/repo.git 15

# إعداد Cron
./git-auto-sync.sh --setup-cron
```

**إضافة لـ Crontab:**
```bash
# تحرير crontab
crontab -e

# إضافة السطر (مزامنة كل 15 دقيقة)
*/15 * * * * /path/to/git-auto-sync.sh /path/to/project https://github.com/user/repo.git 15
```

**السجل:**
```
git-auto-sync.log
```

---

### 3️⃣ **git-status-checker.sh** — فحص الحالة
تقرير شامل عن حالة المستودع.

**الميزات:**
- 📊 معلومات أساسية عن المستودع
- 📁 حالة الملفات المعدّلة
- 📜 آخر الـ commits
- 🌿 الفروع المتاحة
- 🔗 حالة الـ remote
- 👥 أكثر المساهمين
- 💾 حجم المستودع
- 🏥 فحص صحة المستودع

**الاستخدام:**
```bash
# فحص المجلد الحالي
./git-status-checker.sh

# فحص مشروع محدد
./git-status-checker.sh /path/to/project
```

**مثال على المخرجات:**
```
╔════════════════════════════════════════════════════════════════╗
║  AXION Git Status Report
╚════════════════════════════════════════════════════════════════╝

▶ 📁 Repository Information
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Project:      /home/user/project
Branch:       main
Remote:       https://github.com/user/repo.git
Last Commit:  abc1234 - Update docs (2 hours ago)

▶ 📊 Working Directory Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Working directory clean

▶ 🏥 Repository Health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Repository is healthy
```

---

### 4️⃣ **git-interactive.sh** — الواجهة التفاعلية
واجهة تفاعلية كاملة لإدارة Git من الطرفية.

**الميزات:**
- 🎨 واجهة ملونة جميلة
- 📊 عرض الحالة
- 🔄 Pull/Push/Sync
- 📜 عرض السجل
- 🌿 إدارة الفروع
- 📋 عرض الفروقات
- ↩️ التراجع عن commit
- 🔍 البحث في الـ commits
- ⚙️ الإعدادات

**الاستخدام:**
```bash
# تشغيل الواجهة
./git-interactive.sh

# تحديد المشروع
./git-interactive.sh /path/to/project
```

**القائمة الرئيسية:**
```
╔═══════════════════════════════════════════════════════════════════╗
║                          AXION                                    ║
║                    Git Interactive Manager                        ║
╚═══════════════════════════════════════════════════════════════════╝

Git Operations Menu:

  1) 📊 Show Status
  2) 🔄 Pull Changes
  3) ⬆️  Push Changes
  4) 🔄 Full Sync (Pull → Commit → Push)
  5) 📜 View Commit History
  6) 🌿 Manage Branches
  7) 📋 View Diff
  8) ↩️  Undo Last Commit
  9) 🔍 Search Commits
  10) ⚙️  Settings
  0) ❌ Exit

Enter choice [0-10]:
```

---

## 🚀 التثبيت السريع

```bash
# 1. إعطاء صلاحيات التنفيذ
chmod +x git-*.sh

# 2. نقل السكربتات لمجلد عام (اختياري)
sudo mv git-*.sh /usr/local/bin/

# 3. إنشاء اختصارات (اختياري)
echo "alias gm='git-manager.sh'" >> ~/.bashrc
echo "alias gs='git-status-checker.sh'" >> ~/.bashrc
echo "alias gi='git-interactive.sh'" >> ~/.bashrc
source ~/.bashrc
```

---

## 📋 سيناريوهات الاستخدام

### السيناريو 1: إعداد مشروع جديد
```bash
# إنشاء مشروع
mkdir my-project
cd my-project

# تشغيل المدير
REPO_URL="https://github.com/user/repo.git" ./git-manager.sh

# سيقوم بـ:
# ✅ تثبيت Git (إذا لم يكن موجود)
# ✅ إنشاء المستودع
# ✅ ربط الـ remote
# ✅ عمل commit أولي
# ✅ Push
```

### السيناريو 2: المزامنة اليومية
```bash
# إعداد مزامنة كل 30 دقيقة
./git-auto-sync.sh --setup-cron

# ثم نسخ السطر لـ crontab:
crontab -e
# إضافة:
*/30 * * * * /path/to/git-auto-sync.sh /path/to/project URL 30
```

### السيناريو 3: فحص المشروع
```bash
# فحص سريع
./git-status-checker.sh

# سيعرض:
# - حالة الملفات
# - الـ commits الأخيرة
# - الفروع
# - حجم المستودع
# - المشاكل المحتملة
```

### السيناريو 4: العمل التفاعلي
```bash
# تشغيل الواجهة التفاعلية
./git-interactive.sh

# ثم اختر من القائمة:
# - عرض الحالة
# - Pull/Push
# - إدارة الفروع
# - البحث في commits
```

---

## 🔧 الإعدادات المتقدمة

### تخصيص الألوان
عدّل المتغيرات في أول كل سكربت:
```bash
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
# ...
```

### تخصيص السجل
```bash
# حجم السجل الأقصى (بايت)
MAX_LOG_SIZE=10485760  # 10MB

# موقع السجل
LOG_FILE="${PROJECT_DIR}/custom-log.log"
```

### تخصيص الـ Retry
```bash
# عدد المحاولات
MAX_RETRIES=3

# الانتظار بين المحاولات (ثانية)
RETRY_DELAY=10
```

---

## 🐛 معالجة الأخطاء

### المشكلة: "Permission denied"
```bash
# الحل
chmod +x git-manager.sh
```

### المشكلة: "Git not found"
```bash
# السكربت سيحاول التثبيت تلقائياً
# أو يمكنك التثبيت يدوياً:
sudo apt install git  # Ubuntu/Debian
sudo yum install git  # CentOS/RHEL
```

### المشكلة: "Merge conflict"
```bash
# السكربت يحاول الحل تلقائياً
# إذا فشل، سيعرض رسالة وينهي
# حل يدوي:
git status
git add <ملف>
git rebase --continue
```

### المشكلة: "Push failed"
```bash
# السكربت سيسأل عن Force Push
# أو يمكنك:
git pull --rebase
git push
```

---

## 📊 السجلات

### git-operations.log
```
[2026-03-07 22:30:15] [INFO] Starting Git operations
[2026-03-07 22:30:16] [SUCCESS] Git is already installed
[2026-03-07 22:30:17] [SUCCESS] Changes committed
[2026-03-07 22:30:20] [SUCCESS] Pushed to main successfully
```

### git-auto-sync.log
```
[2026-03-07 22:45:00] 🔄 Starting auto-sync...
[2026-03-07 22:45:01] 📝 Changes detected. Syncing...
[2026-03-07 22:45:05] ✅ Sync completed successfully
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🔗 روابط مفيدة

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com)
- [Git Best Practices](https://git-scm.com/book/en/v2/Distributed-Git-Contributing-to-a-Project)

---

## 🆘 الدعم

واجهت مشكلة؟
1. راجع السجلات: `git-operations.log`
2. شغّل فحص الحالة: `./git-status-checker.sh`
3. استخدم الواجهة التفاعلية: `./git-interactive.sh`

---

## 📝 الترخيص

© 2026 AXION Operations Management · جميع الحقوق محفوظة

---

**نصيحة:** ابدأ بـ `git-interactive.sh` للتعرف على جميع الميزات! 🚀
