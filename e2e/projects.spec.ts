import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Projects Management
 * اختبار إدارة المشاريع
 */

test.describe('Projects Management', () => {
  // Login helper
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

  test('should show projects page', async ({ page }) => {
    await page.goto('/projects');
    
    // Verify page title
    await expect(page.locator('h1')).toContainText('المشاريع');
    
    // Verify "إضافة مشروع" button exists
    await expect(page.locator('button:has-text("إضافة مشروع")')).toBeVisible();
  });

  test('should open create project dialog', async ({ page }) => {
    await page.goto('/projects');
    
    // Click "إضافة مشروع"
    await page.click('button:has-text("إضافة مشروع")');
    
    // Verify dialog is shown
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('[role="dialog"] h2')).toContainText('مشروع جديد');
  });

  test('should create new project', async ({ page }) => {
    await page.goto('/projects');
    
    // Open dialog
    await page.click('button:has-text("إضافة مشروع")');
    
    // Fill form
    const projectName = `مشروع اختبار ${Date.now()}`;
    await page.fill('input[name="name"]', projectName);
    await page.fill('textarea[name="description"]', 'وصف مشروع اختبار');
    await page.selectOption('select[name="projectType"]', { index: 1 });
    await page.fill('input[name="location"]', 'الرياض، السعودية');
    
    // Submit
    await page.click('button[type="submit"]:has-text("حفظ")');
    
    // Verify success toast
    await expect(page.locator('.toast-success')).toContainText('تم إنشاء المشروع بنجاح');
    
    // Verify project appears in list
    await expect(page.locator(`text=${projectName}`)).toBeVisible();
  });

  test('should search for projects', async ({ page }) => {
    await page.goto('/projects');
    
    // Type in search box
    await page.fill('input[placeholder*="بحث"]', 'اختبار');
    
    // Wait for search results
    await page.waitForTimeout(500);
    
    // Verify filtered results
    const projectCards = page.locator('[data-testid="project-card"]');
    const count = await projectCards.count();
    
    // At least one result or "لا توجد نتائج"
    if (count === 0) {
      await expect(page.locator('text=لا توجد نتائج')).toBeVisible();
    } else {
      await expect(projectCards.first()).toContainText('اختبار');
    }
  });

  test('should filter projects by status', async ({ page }) => {
    await page.goto('/projects');
    
    // Click status filter
    await page.click('button:has-text("جميع الحالات")');
    await page.click('button:has-text("نشط")');
    
    // Verify URL updated
    await expect(page).toHaveURL(/status=active/);
    
    // Verify only active projects shown
    const statusBadges = page.locator('[data-testid="project-status"]');
    const count = await statusBadges.count();
    
    for (let i = 0; i < count; i++) {
      await expect(statusBadges.nth(i)).toContainText('نشط');
    }
  });

  test('should view project details', async ({ page }) => {
    await page.goto('/projects');
    
    // Click first project card
    await page.click('[data-testid="project-card"]');
    
    // Should navigate to project details
    await expect(page).toHaveURL(/\/projects\/.+/);
    
    // Verify project details page elements
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-testid="project-stats"]')).toBeVisible();
  });

  test('should edit project', async ({ page }) => {
    await page.goto('/projects');
    
    // Click edit button on first project
    await page.click('[data-testid="project-card"] button[title="تعديل"]');
    
    // Verify edit dialog is shown
    await expect(page.locator('[role="dialog"] h2')).toContainText('تعديل المشروع');
    
    // Update name
    const newName = `مشروع محدث ${Date.now()}`;
    await page.fill('input[name="name"]', newName);
    
    // Submit
    await page.click('button[type="submit"]:has-text("حفظ")');
    
    // Verify success
    await expect(page.locator('.toast-success')).toContainText('تم تحديث المشروع');
    await expect(page.locator(`text=${newName}`)).toBeVisible();
  });

  test('should delete project', async ({ page }) => {
    await page.goto('/projects');
    
    // Click delete button
    await page.click('[data-testid="project-card"] button[title="حذف"]');
    
    // Confirm deletion
    await page.click('button:has-text("تأكيد الحذف")');
    
    // Verify success
    await expect(page.locator('.toast-success')).toContainText('تم حذف المشروع');
  });

  test('should show project statistics', async ({ page }) => {
    await page.goto('/projects');
    
    // Verify stats cards are visible
    await expect(page.locator('[data-testid="total-projects"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-projects"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-budget"]')).toBeVisible();
  });
});
