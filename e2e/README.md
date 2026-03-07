# 🎭 AXION E2E Tests

اختبارات شاملة لنظام AXION باستخدام Playwright

## 📋 نظرة عامة

هذا المجلد يحتوي على جميع اختبارات E2E (End-to-End) للتطبيق.

### الاختبارات المتاحة

- **setup.spec.ts**: اختبار معالج الإعداد الأولي
- **auth.spec.ts**: اختبار تسجيل الدخول والتسجيل
- **projects.spec.ts**: اختبار إدارة المشاريع
- **workers.spec.ts**: اختبار إدارة العمال
- **navigation.spec.ts**: اختبار التنقل والصفحات الرئيسية

## 🚀 التشغيل المحلي

### المتطلبات

```bash
# تثبيت التبعيات
npm install

# تثبيت متصفحات Playwright
npx playwright install
```

### تشغيل الاختبارات

```bash
# تشغيل جميع الاختبارات
npm run test:e2e

# تشغيل اختبار معين
npx playwright test e2e/auth.spec.ts

# تشغيل مع واجهة رسومية
npx playwright test --ui

# تشغيل على متصفح واحد فقط
npx playwright test --project=chromium
```

### عرض التقارير

```bash
# عرض آخر تقرير HTML
npx playwright show-report

# عرض تقرير JSON
cat test-results.json | jq
```

## 🏗️ إضافة اختبارات جديدة

### 1. إنشاء ملف جديد

```bash
# إنشاء ملف اختبار جديد
touch e2e/my-feature.spec.ts
```

### 2. كتابة الاختبار

```typescript
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/my-page');
    
    // اكتب اختباراتك هنا
    await expect(page.locator('h1')).toContainText('My Page');
  });
});
```

### 3. تشغيل الاختبار الجديد

```bash
npx playwright test e2e/my-feature.spec.ts
```

## 📊 التقارير

بعد كل تشغيل، يتم إنشاء:

- **HTML Report**: `playwright-report/index.html`
- **JSON Report**: `test-results.json`
- **Screenshots**: `test-results/` (عند الفشل)
- **Videos**: `test-results/` (عند الفشل)

## 🔧 الإعدادات

جميع الإعدادات موجودة في `playwright.config.ts`:

- **Timeouts**: مدة الانتظار القصوى
- **Browsers**: المتصفحات المستخدمة
- **Base URL**: عنوان التطبيق
- **Screenshots**: متى يتم أخذ لقطات الشاشة
- **Videos**: متى يتم تسجيل الفيديو

## 🎯 أفضل الممارسات

### 1. استخدم Data Test IDs

```html
<!-- HTML -->
<button data-testid="submit-button">Submit</button>
```

```typescript
// Test
await page.click('[data-testid="submit-button"]');
```

### 2. تجنب الـ Hardcoded Delays

```typescript
// ❌ سيء
await page.waitForTimeout(5000);

// ✅ جيد
await page.waitForSelector('[data-testid="result"]');
```

### 3. استخدم Helper Functions

```typescript
async function login(page: any) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@test.com');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}
```

### 4. فحص الحالات السلبية

```typescript
test('should show error for invalid input', async ({ page }) => {
  // اختبر السيناريوهات الخاطئة أيضاً
  await page.fill('input[name="email"]', 'invalid-email');
  await expect(page.locator('.error')).toContainText('بريد إلكتروني غير صالح');
});
```

## 🐛 التنقيح (Debugging)

### 1. تشغيل بطيء

```bash
npx playwright test --debug
```

### 2. عرض المتصفح

```bash
npx playwright test --headed
```

### 3. Playwright Inspector

```bash
npx playwright test --debug e2e/auth.spec.ts
```

### 4. Trace Viewer

```bash
npx playwright show-trace trace.zip
```

## 📝 ملاحظات

- الاختبارات تعمل بشكل متوازي افتراضياً
- على CI، تعمل بشكل تسلسلي لتجنب تضارب الموارد
- Screenshots و Videos تُحفظ فقط عند الفشل
- Retries: 2 مرات على CI، 0 محلياً

## 🔗 روابط مفيدة

- [Playwright Docs](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)

---

© 2026 AXION Operations Management
