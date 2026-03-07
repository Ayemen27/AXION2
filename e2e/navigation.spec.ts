import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Navigation & Core Pages
 * اختبار التنقل والصفحات الرئيسية
 */

test.describe('Navigation & Core Pages', () => {
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

  test('should show dashboard with stats', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Verify page title
    await expect(page.locator('h1')).toContainText('لوحة التحكم');
    
    // Verify stats cards
    await expect(page.locator('[data-testid="stat-card"]')).toHaveCount(4, { timeout: 5000 });
  });

  test('should navigate to all main pages via sidebar', async ({ page }) => {
    const mainPages = [
      { name: 'المشاريع', url: '/projects' },
      { name: 'العمال', url: '/workers' },
      { name: 'الحضور', url: '/attendance' },
      { name: 'المصروفات', url: '/expenses' },
      { name: 'المشتريات', url: '/purchases' },
      { name: 'الموردين', url: '/suppliers' },
      { name: 'الآبار', url: '/wells' },
      { name: 'المعدات', url: '/equipment' },
      { name: 'العملاء', url: '/customers' },
      { name: 'التقارير', url: '/reports' },
    ];

    for (const { name, url } of mainPages) {
      // Click sidebar link
      await page.click(`nav a:has-text("${name}")`);
      
      // Verify navigation
      await expect(page).toHaveURL(url);
      await expect(page.locator('h1')).toContainText(name);
    }
  });

  test('should show settings page', async ({ page }) => {
    await page.goto('/settings');
    
    await expect(page.locator('h1')).toContainText('الإعدادات');
    
    // Verify settings tabs
    await expect(page.locator('[role="tablist"]')).toBeVisible();
  });

  test('should show notifications page', async ({ page }) => {
    await page.goto('/notifications');
    
    await expect(page.locator('h1')).toContainText('الإشعارات');
  });

  test('should toggle sidebar on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/dashboard');
    
    // Sidebar should be hidden by default on mobile
    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).not.toBeVisible();
    
    // Click menu button
    await page.click('[data-testid="menu-button"]');
    
    // Sidebar should be visible
    await expect(sidebar).toBeVisible();
    
    // Click overlay to close
    await page.click('[data-testid="sidebar-overlay"]');
    
    // Sidebar should be hidden again
    await expect(sidebar).not.toBeVisible();
  });

  test('should handle 404 page', async ({ page }) => {
    await page.goto('/non-existent-page');
    
    // Verify 404 page is shown
    await expect(page.locator('h1')).toContainText('404');
    await expect(page.locator('text=الصفحة غير موجودة')).toBeVisible();
    
    // Verify "العودة للرئيسية" link works
    await page.click('a:has-text("العودة للرئيسية")');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should show user menu in header', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Click user avatar
    await page.click('[data-testid="user-menu"]');
    
    // Verify dropdown menu
    await expect(page.locator('[role="menu"]')).toBeVisible();
    await expect(page.locator('text=الملف الشخصي')).toBeVisible();
    await expect(page.locator('text=الإعدادات')).toBeVisible();
    await expect(page.locator('text=تسجيل الخروج')).toBeVisible();
  });

  test('should support RTL layout', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Verify RTL direction
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');
    
    // Verify Arabic language
    await expect(html).toHaveAttribute('lang', 'ar');
  });

  test('should load page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should show breadcrumbs for nested pages', async ({ page }) => {
    // Navigate to a nested page (e.g., project details)
    await page.goto('/projects');
    
    // Click first project
    const projectCard = page.locator('[data-testid="project-card"]').first();
    if (await projectCard.isVisible()) {
      await projectCard.click();
      
      // Verify breadcrumbs
      const breadcrumbs = page.locator('[data-testid="breadcrumbs"]');
      await expect(breadcrumbs).toBeVisible();
      await expect(breadcrumbs).toContainText('المشاريع');
    }
  });
});
