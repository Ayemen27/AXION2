import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Setup Wizard
 * اختبار معالج الإعداد الأولي للنظام
 */

test.describe('Setup Wizard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to setup page
    await page.goto('/setup');
  });

  test('should display setup wizard steps', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/AXION.*Setup/i);
    
    // Check wizard steps are visible
    const steps = page.locator('[data-testid="setup-step"]');
    await expect(steps).toHaveCount(6);
    
    // Check step 1 is active
    const activeStep = page.locator('[data-testid="setup-step"][data-active="true"]');
    await expect(activeStep).toContainText('فحص قاعدة البيانات');
  });

  test('should check database tables', async ({ page }) => {
    // Click "فحص الآن" button
    await page.click('button:has-text("فحص الآن")');
    
    // Wait for database check to complete
    await page.waitForSelector('[data-testid="db-check-result"]', { timeout: 10000 });
    
    // Verify all tables are found
    const tableChecks = page.locator('[data-testid="table-check-item"]');
    const count = await tableChecks.count();
    
    for (let i = 0; i < count; i++) {
      const item = tableChecks.nth(i);
      await expect(item).toContainText('✓');
    }
    
    // Verify "المتابعة" button is enabled
    const continueBtn = page.locator('button:has-text("المتابعة")');
    await expect(continueBtn).toBeEnabled();
  });

  test('should create admin account', async ({ page }) => {
    // Skip to step 2 (assuming step 1 passes)
    await page.goto('/setup?step=2');
    
    // Fill admin form
    await page.fill('input[name="fullName"]', 'Admin Test User');
    await page.fill('input[name="email"]', `admin-${Date.now()}@test.com`);
    await page.fill('input[name="password"]', 'Test@1234');
    await page.fill('input[name="confirmPassword"]', 'Test@1234');
    
    // Submit form
    await page.click('button:has-text("إنشاء الحساب")');
    
    // Wait for success message
    await expect(page.locator('.toast')).toContainText('تم إنشاء حساب المسؤول بنجاح');
  });

  test('should select AI provider', async ({ page }) => {
    await page.goto('/setup?step=3');
    
    // Select OnSpace AI
    await page.click('button:has-text("OnSpace AI")');
    
    // Verify selection
    await expect(page.locator('[data-selected="true"]')).toContainText('OnSpace AI');
    
    // Continue
    await page.click('button:has-text("المتابعة")');
    
    // Should move to next step
    await expect(page).toHaveURL(/step=4/);
  });

  test('should save API keys (optional)', async ({ page }) => {
    await page.goto('/setup?step=4');
    
    // Fill GitHub token (optional)
    await page.fill('input[name="githubToken"]', 'ghp_test_token_12345');
    await page.fill('input[name="githubUsername"]', 'testuser');
    
    // Continue without SMTP
    await page.click('button:has-text("المتابعة")');
    
    // Should move to next step
    await expect(page).toHaveURL(/step=5/);
  });

  test('should configure system settings', async ({ page }) => {
    await page.goto('/setup?step=5');
    
    // App name should be pre-filled
    const appNameInput = page.locator('input[name="appName"]');
    await expect(appNameInput).toHaveValue('AXION');
    
    // Country should be auto-detected
    const countrySelect = page.locator('select[name="country"]');
    await expect(countrySelect).not.toHaveValue('');
    
    // Continue
    await page.click('button:has-text("المتابعة")');
    
    // Should move to final step
    await expect(page).toHaveURL(/step=6/);
  });

  test('should complete setup wizard', async ({ page }) => {
    await page.goto('/setup?step=6');
    
    // Click "إنهاء وتفعيل النظام"
    await page.click('button:has-text("إنهاء وتفعيل النظام")');
    
    // Should redirect to login page
    await page.waitForURL('/login', { timeout: 10000 });
    
    // Verify login page is shown
    await expect(page.locator('h1')).toContainText('تسجيل الدخول');
  });
});
