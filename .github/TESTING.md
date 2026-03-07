# 🧪 دليل الاختبارات — AXION Testing Guide

## نظرة عامة

AXION يستخدم Playwright للاختبارات الشاملة (E2E) مع تكامل كامل مع GitHub Actions.

---

## 📋 أنواع الاختبارات

### 1. اختبارات الوحدة (Unit Tests)
- **الأداة**: Vitest
- **الموقع**: `src/**/*.test.ts`
- **التشغيل**: `npm test`

### 2. اختبارات المكونات (Component Tests)
- **الأداة**: React Testing Library
- **الموقع**: `src/**/*.spec.tsx`
- **التشغيل**: `npm run test:components`

### 3. اختبارات E2E (End-to-End Tests)
- **الأداة**: Playwright
- **الموقع**: `e2e/**/*.spec.ts`
- **التشغيل**: `npm run test:e2e`

---

## 🎭 Playwright E2E Tests

### التثبيت

```bash
# تثبيت التبعيات
npm install

# تثبيت المتصفحات
npx playwright install
```

### التشغيل المحلي

```bash
# تشغيل جميع الاختبارات
npm run test:e2e

# تشغيل متصفح واحد
npx playwright test --project=chromium

# تشغيل بواجهة رسومية
npx playwright test --ui

# تشغيل مع عرض المتصفح
npx playwright test --headed

# تشغيل اختبار معين
npx playwright test e2e/auth.spec.ts
```

### عرض التقارير

```bash
# عرض آخر تقرير
npx playwright show-report

# عرض trace للتنقيح
npx playwright show-trace trace.zip
```

### التنقيح (Debugging)

```bash
# تشغيل مع Playwright Inspector
npx playwright test --debug

# تشغيل بطيء لمتابعة الخطوات
npx playwright test --slowmo=1000
```

---

## 🔄 GitHub Actions Integration

### Workflow: E2E Tests

يشتغل تلقائياً:
- قبل كل deployment على `main`
- على كل Pull Request
- يدوياً من Actions UI

**الموقع**: `.github/workflows/e2e-tests.yml`

**المتصفحات المدعومة**:
- Chromium
- Firefox
- WebKit (Safari)
- Mobile Chrome
- Mobile Safari

### Workflow: Deploy with E2E

يشتغل تلقائياً عند push على `main`:

1. **E2E Tests** → تشغيل الاختبارات الشاملة
2. **Deploy** → نشر على VPS (فقط إذا نجحت الاختبارات)
3. **Verify** → فحص صحة النشر

**الموقع**: `.github/workflows/update-e2e-deploy.yml`

---

## 📊 التقارير والـ Artifacts

### على GitHub Actions

بعد كل تشغيل، يتم إنشاء:

- **HTML Report**: تقرير تفاعلي شامل
- **JSON Report**: بيانات الاختبار بصيغة JSON
- **Screenshots**: لقطات شاشة عند الفشل
- **Videos**: فيديوهات للاختبارات الفاشلة
- **Traces**: ملفات trace للتنقيح

**الوصول**: Actions → Run → Artifacts

### محلياً

- **HTML Report**: `playwright-report/index.html`
- **JSON Report**: `test-results.json`
- **Screenshots/Videos**: `test-results/`

---

## ✍️ كتابة اختبارات جديدة

### 1. إنشاء ملف اختبار

```bash
touch e2e/my-feature.spec.ts
```

### 2. البنية الأساسية

```typescript
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    // إعداد قبل كل اختبار
    await page.goto('/my-page');
  });

  test('should do something', async ({ page }) => {
    // الاختبار
    await page.click('button');
    await expect(page.locator('.result')).toContainText('Success');
  });
});
```

### 3. استخدام Data Test IDs

**في المكون**:
```tsx
<button data-testid="submit-button">Submit</button>
```

**في الاختبار**:
```typescript
await page.click('[data-testid="submit-button"]');
```

---

## 🎯 أفضل الممارسات

### 1. استقلالية الاختبارات

```typescript
// ❌ سيء - اعتماد على حالة سابقة
test('test 1', async ({ page }) => {
  await page.fill('input', 'value');
});

test('test 2', async ({ page }) => {
  // يفترض أن input لا يزال ممتلئاً — خطأ!
  await expect(page.locator('input')).toHaveValue('value');
});

// ✅ جيد - كل اختبار مستقل
test('test 1', async ({ page }) => {
  await page.goto('/form');
  await page.fill('input', 'value');
  await expect(page.locator('input')).toHaveValue('value');
});
```

### 2. الانتظار الذكي

```typescript
// ❌ سيء - hardcoded timeout
await page.waitForTimeout(5000);

// ✅ جيد - انتظار عنصر معين
await page.waitForSelector('.result');

// ✅ أفضل - انتظار حالة الشبكة
await page.waitForLoadState('networkidle');
```

### 3. Helper Functions

```typescript
// إنشاء helpers للأكواد المتكررة
async function login(page: any, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

test('authenticated flow', async ({ page }) => {
  await login(page, 'admin@test.com', 'password');
  // باقي الاختبار
});
```

### 4. اختبار السيناريوهات السلبية

```typescript
test('should show error for invalid email', async ({ page }) => {
  await page.fill('input[type="email"]', 'invalid');
  await page.click('button[type="submit"]');
  
  await expect(page.locator('.error')).toContainText('بريد غير صالح');
});
```

---

## 🐛 حل المشاكل الشائعة

### مشكلة: "Timeout waiting for selector"

**السبب**: العنصر غير موجود أو بطيء في الظهور

**الحل**:
```typescript
// زيادة الوقت
await page.waitForSelector('.element', { timeout: 10000 });

// أو استخدام polling
await page.waitForFunction(() => {
  return document.querySelector('.element') !== null;
});
```

### مشكلة: "Element is not clickable"

**السبب**: العنصر محجوب أو خارج viewport

**الحل**:
```typescript
// scroll للعنصر أولاً
await page.locator('button').scrollIntoViewIfNeeded();
await page.click('button');

// أو force click
await page.click('button', { force: true });
```

### مشكلة: Tests تفشل على CI ولكن تنجح محلياً

**الأسباب المحتملة**:
- اختلاف resolution الشاشة
- اختلاف المتصفح
- race conditions

**الحل**:
```typescript
// استخدم waitFor بدلاً من setTimeout
await page.waitForSelector('.element');

// استخدم strict mode
await page.locator('button').click({ strict: true });

// أضف retries في playwright.config.ts
retries: process.env.CI ? 2 : 0
```

---

## 📚 موارد إضافية

### الوثائق الرسمية
- [Playwright Docs](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)

### دروس فيديو
- [Playwright Tutorial](https://www.youtube.com/playlist?list=PLYMOUCVo86jEVnJ1hdXI6BM5F8WN98H_m)
- [Playwright Tips & Tricks](https://www.youtube.com/playlist?list=PLYMOUCVo86jEVnJ1hdXI6BM5F8WN98H_m)

### أمثلة
- [Playwright Examples](https://github.com/microsoft/playwright/tree/main/examples)
- راجع مجلد `e2e/` في هذا المشروع

---

## 🎓 خطة التعلم

### المبتدئين
1. ابدأ بـ `e2e/auth.spec.ts` — أبسط الاختبارات
2. اقرأ [Playwright Getting Started](https://playwright.dev/docs/intro)
3. جرّب تشغيل الاختبارات محلياً
4. شاهد التقارير وافهم النتائج

### المتوسط
1. اكتب اختبار جديد لميزة موجودة
2. استخدم Playwright Inspector للتنقيح
3. افهم الـ Selectors و Locators
4. تعلم استخدام Page Object Model

### المتقدم
1. اكتب اختبارات معقدة مع multiple pages
2. استخدم fixtures و test hooks
3. حسّن performance الاختبارات
4. ادمج مع CI/CD pipelines

---

## 📞 الدعم

إذا واجهت مشاكل:

1. راجع [e2e/README.md](../e2e/README.md)
2. افتح [Issue](https://github.com/YOUR_REPO/issues/new)
3. تواصل على: support@axion.app

---

© 2026 AXION Operations Management · جميع الحقوق محفوظة
