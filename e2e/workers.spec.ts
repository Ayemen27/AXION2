import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Workers Management
 * اختبار إدارة العمال
 */

test.describe('Workers Management', () => {
  async function login(page: any) {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@axion.test');
    await page.fill('input[type="password"]', 'Admin@1234');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  }

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should show workers page', async ({ page }) => {
    await page.goto('/workers');
    
    await expect(page.locator('h1')).toContainText('العمال');
    await expect(page.locator('button:has-text("إضافة عامل")')).toBeVisible();
  });

  test('should create new worker', async ({ page }) => {
    await page.goto('/workers');
    
    await page.click('button:has-text("إضافة عامل")');
    
    // Fill form
    const workerName = `عامل اختبار ${Date.now()}`;
    await page.fill('input[name="name"]', workerName);
    await page.selectOption('select[name="type"]', { index: 1 });
    await page.fill('input[name="dailyWage"]', '150');
    await page.fill('input[name="phone"]', '0501234567');
    
    // Submit
    await page.click('button[type="submit"]:has-text("حفظ")');
    
    // Verify success
    await expect(page.locator('.toast-success')).toContainText('تم إضافة العامل بنجاح');
    await expect(page.locator(`text=${workerName}`)).toBeVisible();
  });

  test('should filter workers by type', async ({ page }) => {
    await page.goto('/workers');
    
    // Select worker type filter
    await page.click('select[name="workerType"]');
    await page.selectOption('select[name="workerType"]', { index: 1 });
    
    // Verify filtered results
    await page.waitForTimeout(500);
    
    const workerCards = page.locator('[data-testid="worker-card"]');
    const count = await workerCards.count();
    
    if (count > 0) {
      // All should be same type
      const firstType = await workerCards.first().locator('[data-testid="worker-type"]').textContent();
      for (let i = 0; i < count; i++) {
        await expect(workerCards.nth(i).locator('[data-testid="worker-type"]')).toContainText(firstType!);
      }
    }
  });

  test('should view worker details', async ({ page }) => {
    await page.goto('/workers');
    
    // Click first worker
    await page.click('[data-testid="worker-card"]');
    
    // Verify details page
    await expect(page).toHaveURL(/\/workers\/.+/);
    await expect(page.locator('[data-testid="worker-info"]')).toBeVisible();
  });

  test('should edit worker', async ({ page }) => {
    await page.goto('/workers');
    
    // Click edit button
    await page.click('[data-testid="worker-card"] button[title="تعديل"]');
    
    // Update wage
    await page.fill('input[name="dailyWage"]', '200');
    
    // Submit
    await page.click('button[type="submit"]:has-text("حفظ")');
    
    // Verify success
    await expect(page.locator('.toast-success')).toContainText('تم تحديث العامل');
  });

  test('should deactivate worker', async ({ page }) => {
    await page.goto('/workers');
    
    // Click deactivate button
    await page.click('[data-testid="worker-card"] button[title="إلغاء التفعيل"]');
    
    // Confirm
    await page.click('button:has-text("تأكيد")');
    
    // Verify success
    await expect(page.locator('.toast-success')).toContainText('تم إلغاء تفعيل العامل');
    
    // Worker should show as inactive
    await expect(page.locator('[data-testid="worker-status"]')).toContainText('غير نشط');
  });

  test('should export workers list', async ({ page }) => {
    await page.goto('/workers');
    
    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("تصدير")');
    
    const download = await downloadPromise;
    
    // Verify file downloaded
    expect(download.suggestedFilename()).toMatch(/workers.*\.(xlsx|csv)$/);
  });
});
