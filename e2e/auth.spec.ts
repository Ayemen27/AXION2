import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Authentication
 * اختبار تسجيل الدخول والتسجيل
 */

test.describe('Authentication', () => {
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'Test@1234',
    fullName: 'Test User',
  };

  test('should show login page', async ({ page }) => {
    await page.goto('/login');
    
    // Check page title
    await expect(page).toHaveTitle(/تسجيل الدخول.*AXION/i);
    
    // Verify form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('تسجيل الدخول');
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/login');
    
    // Click submit without filling form
    await page.click('button[type="submit"]');
    
    // Verify error messages
    await expect(page.locator('text=البريد الإلكتروني مطلوب')).toBeVisible();
    await expect(page.locator('text=كلمة المرور مطلوبة')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill invalid credentials
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Verify error toast
    await expect(page.locator('.toast-error')).toContainText(/خطأ.*تسجيل الدخول/i);
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/login');
    
    // Click "إنشاء حساب جديد" link
    await page.click('a:has-text("إنشاء حساب جديد")');
    
    // Verify navigation
    await expect(page).toHaveURL('/register');
    await expect(page.locator('h1')).toContainText('إنشاء حساب جديد');
  });

  test('should register new user', async ({ page }) => {
    await page.goto('/register');
    
    // Fill registration form
    await page.fill('input[name="fullName"]', testUser.fullName);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for success (or pending approval page)
    await page.waitForURL(/\/(dashboard|pending-approval)/, { timeout: 10000 });
    
    // Verify either dashboard or pending page
    const url = page.url();
    expect(url).toMatch(/\/(dashboard|pending-approval)/);
  });

  test('should login successfully', async ({ page }) => {
    // First ensure user exists (skip if admin already created)
    await page.goto('/login');
    
    // Use admin credentials (created during setup)
    await page.fill('input[type="email"]', 'admin@axion.test');
    await page.fill('input[type="password"]', 'Admin@1234');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    
    // Verify dashboard is shown
    await expect(page.locator('h1')).toContainText('لوحة التحكم');
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@axion.test');
    await page.fill('input[type="password"]', 'Admin@1234');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Click logout button (in header or dropdown)
    await page.click('[data-testid="user-menu"]');
    await page.click('button:has-text("تسجيل الخروج")');
    
    // Verify redirect to login
    await page.waitForURL('/login');
    await expect(page.locator('h1')).toContainText('تسجيل الدخول');
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Try to access protected page
    await page.goto('/projects');
    
    // Should redirect to login
    await page.waitForURL('/login');
    await expect(page.locator('h1')).toContainText('تسجيل الدخول');
  });

  test('should remember user session after page reload', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@axion.test');
    await page.fill('input[type="password"]', 'Admin@1234');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Reload page
    await page.reload();
    
    // Should stay on dashboard (not redirect to login)
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('لوحة التحكم');
  });
});
